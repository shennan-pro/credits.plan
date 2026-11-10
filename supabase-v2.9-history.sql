-- ============================================================
--  Kid's Credits Plan · v2.9.0 云端版本历史
--  为什么要它：Supabase 免费版没有 PITR、也没有每日自动备份
--  （官方：PITR 仅 Pro/Team/Enterprise；免费版无任何原生回滚点）
--  → 一次误同步（空档覆盖真实数据）就是终局。
--  → 本表让产品自己拥有版本历史：覆盖前自动留档，可随时回滚。
--
--  用法：Supabase Dashboard → SQL Editor → 新建查询 → 粘贴本文件 → Run
--  幂等：可重复执行（create table if not exists / drop policy if exists）
-- ============================================================

-- ============================================================
-- 1) 历史表
-- ============================================================
create table if not exists public.family_state_history (
  id           bigint generated always as identity primary key,
  family_code  text        not null,
  secret_hash  text        not null default '',   -- 与 family_state.secret_hash 同口径（凭证指纹）
  snapshot_at  timestamptz not null default now(),
  record_count int         not null default 0,    -- 该版本的记录条数（列表页直接显示）
  balance      int         not null default 0,    -- 该版本的余额
  label        text        not null default '',   -- 留档原因，如「覆盖前自动留档」
  state        jsonb       not null default '{}'::jsonb
);

-- 老表已存在时补列（跟 family_state 同样的坑：create 会被跳过）
alter table public.family_state_history add column if not exists secret_hash  text not null default '';
alter table public.family_state_history add column if not exists record_count int not null default 0;
alter table public.family_state_history add column if not exists balance      int not null default 0;
alter table public.family_state_history add column if not exists label        text not null default '';

create index if not exists family_state_history_code_time
  on public.family_state_history (family_code, snapshot_at desc);

-- ============================================================
-- 2) 行级安全：与 family_state 完全同款（fam_code / fam_auth / fam_new）
-- ============================================================
alter table public.family_state_history enable row level security;

drop policy if exists "family_state_history own row" on public.family_state_history;

create policy "family_state_history own row"
  on public.family_state_history
  for all
  to anon, authenticated
  using (
    public.fam_code() = family_code
    and secret_hash = public.fam_auth()
  )
  with check (
    public.fam_code() = family_code
    and secret_hash = public.fam_new()
  );

grant select, insert, update, delete on public.family_state_history to anon, authenticated;

-- ============================================================
-- 3) RPC
-- ============================================================

-- 3.1 留档：把某个版本的 state 存进历史（覆盖前调用）
create or replace function public.family_history_push(
  p_code  text,
  p_auth  text,
  p_new   text,
  p_state jsonb,
  p_label text default ''
)
returns bigint
language plpgsql
as $$
declare
  v_code text := coalesce(p_code, '');
  v_new  text := coalesce(p_new, p_auth, '');
  v_id   bigint;
begin
  if v_code = '' then
    raise exception 'EMPTY_CODE' using errcode = '22023';
  end if;
  if v_new = '' then
    raise exception 'EMPTY_SECRET' using errcode = '22023';
  end if;

  perform set_config('app.family_code', v_code, true);
  perform set_config('app.family_auth', coalesce(p_auth, v_new), true);
  perform set_config('app.family_new',  v_new,  true);

  insert into public.family_state_history
         (family_code, secret_hash, record_count, balance, label, state)
  values (
    v_code,
    v_new,
    case when jsonb_typeof(p_state -> 'records') = 'array'
         then jsonb_array_length(p_state -> 'records') else 0 end,
    coalesce((p_state ->> 'balance')::int, 0),
    coalesce(p_label, ''),
    coalesce(p_state, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- 3.2 列出版本（不含 state 本体，省流量）
create or replace function public.family_history_list(
  p_code  text,
  p_secret text,
  p_limit int default 20
)
returns jsonb
language plpgsql
as $$
declare
  v_code text := coalesce(p_code, '');
  v_rows jsonb;
begin
  perform set_config('app.family_code', v_code, true);
  perform set_config('app.family_auth', coalesce(p_secret, ''), true);
  perform set_config('app.family_new',  coalesce(p_secret, ''), true);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id',      h.id,
           'at',      h.snapshot_at,
           'records', h.record_count,
           'balance', h.balance,
           'label',   h.label
         ) order by h.snapshot_at desc), '[]'::jsonb)
    into v_rows
    from public.family_state_history h
   where h.family_code = v_code
   limit coalesce(p_limit, 20);

  return v_rows;
end;
$$;

-- 3.3 取某个版本的完整 state（点「恢复此版本」时调用）
create or replace function public.family_history_get(
  p_code   text,
  p_secret text,
  p_id     bigint
)
returns jsonb
language plpgsql
as $$
declare
  v_code  text := coalesce(p_code, '');
  v_state jsonb;
begin
  perform set_config('app.family_code', v_code, true);
  perform set_config('app.family_auth', coalesce(p_secret, ''), true);
  perform set_config('app.family_new',  coalesce(p_secret, ''), true);

  select h.state into v_state
    from public.family_state_history h
   where h.id = p_id and h.family_code = v_code;

  return v_state;
end;
$$;

grant execute on function public.family_history_push(text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.family_history_list(text, text, int) to anon, authenticated;
grant execute on function public.family_history_get(text, text, bigint) to anon, authenticated;

-- ============================================================
-- 4) 自动清理：每个家庭最多留 50 版，超出删最旧的
--    （免费版存储有限，别把数据库撑爆）
-- ============================================================
create or replace function public.family_history_trim(p_code text, p_keep int default 50)
returns int
language plpgsql
as $$
declare
  v_code text := coalesce(p_code, '');
  v_cut  int;
begin
  select count(*) into v_cut
    from (
      select id from public.family_state_history
       where family_code = v_code
       order by snapshot_at desc
       offset coalesce(p_keep, 50)
    ) t;
  if v_cut > 0 then
    delete from public.family_state_history h
     where h.family_code = v_code
       and h.id in (
         select id from public.family_state_history
          where family_code = v_code
          order by snapshot_at desc
          offset coalesce(p_keep, 50)
       );
  end if;
  return v_cut;
end;
$$;

grant execute on function public.family_history_trim(text, int) to anon, authenticated;

-- ============================================================
-- 验证（可选）：在 SQL Editor 跑一下，应返回 0 行或你家的历史
--   select id, snapshot_at, record_count, balance, label
--     from public.family_state_history order by snapshot_at desc limit 10;
-- ============================================================
