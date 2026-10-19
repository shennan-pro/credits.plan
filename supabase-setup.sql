-- Kid's Credits Plan · Supabase 建表脚本（v2.5.0 · 分行 + 表级权限）
-- 用法：Supabase 控制台 → SQL Editor → New query → 粘贴执行一次
--
-- 【v2.5.0 相比 v2.2.0 的变化】
--   ① 分行：一个家庭 = family_state 里的 一行（family_code 为主键），互不串行。
--   ② 表级权限：anon 角色**不再能直接读写表**（RLS 全禁），
--      所有读写必须经过两个 RPC 函数，由函数在库内校验「家庭码 + 访问密钥」。
--      结果：即使别人拿到了 anon public key，也无法列出、读取或篡改任何家庭数据。
--
-- 冲突策略：last-write-wins（前端按 state.updatedAt 比较）
-- 密钥设计：每行存 secret_hash（bcrypt），明文只留在本机 localStorage / 连接码里。
-- 旧数据兼容：secret_hash 为空的历史行，允许用「家庭码」作为密钥读写，
--              并在首次推送时自动升级为随机密钥（见下方注释的升级语句）。

create extension if not exists pgcrypto;

-- ============================================================
-- 表：一行 = 一个家庭
-- ============================================================
create table if not exists public.family_state (
  family_code text primary key,
  secret_hash text not null default '',
  state       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ⚠️ 关键：表如果已存在（v2.2.x 建过），上面的 CREATE 会被整段跳过，
--    新列不会自动出现。必须显式补列，否则下面的函数会因「列不存在」报错。
alter table public.family_state
  add column if not exists secret_hash text not null default '';

-- ============================================================
-- 表级权限：关掉 anon / authenticated 对表的直连权限
-- （owner 与 service_role 不受影响，所以下面的 RPC 函数仍能读写）
-- ============================================================
-- 注意：这里刻意 **不** 开 FORCE ROW LEVEL SECURITY。
-- 开了之后表 owner 也要受策略约束，而下面的 SECURITY DEFINER 函数正是以 owner 身份跑，会被误伤。
alter table public.family_state enable row level security;

drop policy if exists "family_state anon rw" on public.family_state;
drop policy if exists "family_state direct access" on public.family_state;

-- 双保险：即使有人日后误把 GRANT 加回来，策略也只放行 table_owner 角色
create policy "family_state direct access"
  on public.family_state
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.family_state from anon, authenticated;

-- ============================================================
-- RPC ① 读取：返回该家庭的整包 state，或 null（不存在 / 密钥错）
-- ============================================================
create or replace function public.family_pull(p_code text, p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state jsonb;
begin
  select state into v_state
  from public.family_state
  where family_code = upper(btrim(coalesce(p_code, '')))
    and ( secret_hash = ''
          or secret_hash = crypt(coalesce(p_secret, ''), secret_hash) );

  return v_state;   -- null = 该行不存在 或 密钥不匹配（不区分，避免探测）
end;
$$;

-- ============================================================
-- RPC ② 写入：整包 upsert。
--   · 密钥正确           → 覆盖写入
--   · 行不存在           → 新建，并写入该密钥的哈希
--   · 旧行 secret_hash='' → 允许用「家庭码」当密钥通过一次，并顺带升级为该密钥
-- ============================================================
create or replace function public.family_push(
  p_code        text,
  p_secret      text,
  p_state       jsonb,
  p_updated_at  timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code   text := upper(btrim(coalesce(p_code, '')));
  v_secret text := coalesce(p_secret, '');
  v_ok     boolean;
begin
  if v_code is null or v_code = '' then
    raise exception 'EMPTY_CODE' using errcode = '22023';
  end if;

  if v_secret = '' then
    raise exception 'EMPTY_SECRET' using errcode = '22023';
  end if;

  -- 已有行：必须密钥匹配（空哈希行允许用家庭码通过一次）
  if exists (select 1 from public.family_state where family_code = v_code) then
    v_ok := exists (
      select 1 from public.family_state
      where family_code = v_code
        and ( secret_hash = ''
              or secret_hash = crypt(v_secret, secret_hash)
              or v_secret = v_code )      -- 旧行升级通道：家庭码即密钥
    );
    if not v_ok then
      raise exception 'BAD_SECRET' using errcode = '42501';
    end if;

    insert into public.family_state as t (family_code, secret_hash, state, updated_at)
    values (v_code, crypt(v_secret, gen_salt('bf')), p_state, coalesce(p_updated_at, now()))
    on conflict (family_code) do update
      set state       = excluded.state,
          updated_at  = excluded.updated_at,
          -- 仅在旧行为空哈希时才落哈希（正常路径下保持原哈希不变）
          secret_hash = case when t.secret_hash = '' then excluded.secret_hash else t.secret_hash end;
  else
    insert into public.family_state (family_code, secret_hash, state, updated_at)
    values (v_code, crypt(v_secret, gen_salt('bf')), p_state, coalesce(p_updated_at, now()))
    on conflict (family_code) do update
      set state      = excluded.state,
          updated_at = excluded.updated_at;
  end if;

  return jsonb_build_object('ok', true, 'family_code', v_code, 'updated_at', coalesce(p_updated_at, now()));
end;
$$;

-- ============================================================
-- 授权调用（只需 EXECUTE，不给表权限）
-- ============================================================
revoke all on function public.family_pull(text, text) from public;
revoke all on function public.family_push(text, text, jsonb, timestamptz) from public;
grant execute on function public.family_pull(text, text) to anon, authenticated;
grant execute on function public.family_push(text, text, jsonb, timestamptz) to anon, authenticated;

-- ============================================================
-- 验证
-- ============================================================
-- 1) 表存在且策略已收紧：应返回 0 行
-- select * from public.family_state;
-- 2) 两个函数都在：应返回 2 行
-- select proname from pg_proc where proname in ('family_pull','family_push');
-- 3) 业务自检请在页面里点「🔌 测试连接」