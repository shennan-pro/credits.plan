-- Kid's Credits Plan · Supabase 建表脚本（v2.5.1 · 分行 + 表级权限 · 不依赖 SECURITY DEFINER）
--
-- 【为什么换方案】
--   v2.5.0 用「SECURITY DEFINER 函数 + pgcrypto bcrypt」做密钥校验。
--   但阿里云 AnalyticDB for PostgreSQL（ADB PG）在平台层禁用了 SECURITY DEFINER：
--     ERROR 42501: SECURITY DEFINER functions are not allowed
--     DETAIL: adbpg_enable_security_definer is disabled
--   → 提权函数这条路在 ADB 实例上不可用，必须换成「不提权也能校验」的做法。
--
-- 【v2.5.1 的设计】
--   ① 一行 = 一个家庭（family_code 主键）→ 分行隔离
--   ② 行级安全策略（RLS）自己比对凭证。凭证有两个来源，先会话变量后请求头：
--        会话变量 app.family_code / app.family_auth / app.family_new
--          —— 由普通函数（SECURITY INVOKER，不提权）用 set_config 写入
--        请求头 x-family-code / x-family-auth / x-family-secret
--          —— 网关把请求头放进 current_setting('request.headers')
--      两条路都能用：走 RPC 函数（首选）或直连表 + 自定义头（备选）
--   ③ 凭证本身 = 浏览器算好的 md5(家庭码:密钥)，32 位十六进制。
--      密钥明文从不上云、也不落库；库里 secret_hash 存的就是这个 md5。
--      整个脚本不依赖 pgcrypto / bcrypt / 任何扩展。
--   ④ 直连表但不带正确凭证 → 策略为假 → 读到 0 行 / 写入被拒
--      → 这就是「表级权限」：拿到 anon key ≠ 能读任何家庭的数据
--   ⑤ 旧行兼容：secret_hash 为空的历史行，沿用 v2.2.x 语义（家庭码即凭证），
--      首次推送时自动升级为正式 md5
--
-- 用法：Supabase 控制台 → SQL Editor → New query → 粘贴 → Run
-- 纯 ASCII 无注释版（推荐直接粘贴）：supabase-setup.paste.sql

-- ============================================================
-- 1) 表：一行 = 一个家庭
-- ============================================================
create table if not exists public.family_state (
  family_code text primary key,
  secret_hash text not null default '',
  state       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 关键：表已存在时 CREATE 会被整段跳过，新列不会自动出现，必须显式补
alter table public.family_state add column if not exists secret_hash text not null default '';

-- ============================================================
-- 2) 行级安全
-- ============================================================
alter table public.family_state enable row level security;

drop policy if exists "family_state anon rw" on public.family_state;
drop policy if exists "family_state direct access" on public.family_state;
drop policy if exists "family_state own row" on public.family_state;

-- 2.1 从请求头安全取值（拿不到 / 不是 JSON 一律返回空串）
--     先试 request.headers 整体 JSON，再试 request.header.<name> 单头
create or replace function public.fam_hdr(p_name text)
returns text
language plpgsql
stable
as $$
declare
  v_raw  text;
  v_json jsonb;
  v_one  text;
begin
  v_raw := coalesce(current_setting('request.headers', true), '');
  if v_raw <> '' then
    begin
      v_json := v_raw::jsonb;
      return coalesce(v_json ->> p_name, '');
    exception when others then
      null;
    end;
  end if;
  v_one := coalesce(current_setting('request.header.' || p_name, true), '');
  return v_one;
end;
$$;

-- 2.2 本次请求声明的家庭码：先会话变量，后请求头
create or replace function public.fam_code()
returns text
language plpgsql
stable
as $$
declare
  v text;
begin
  v := coalesce(current_setting('app.family_code', true), '');
  if v <> '' then
    return v;
  end if;
  return public.fam_hdr('x-family-code');
end;
$$;

-- 2.3 本次请求用于「读 / 改旧行」的凭证
create or replace function public.fam_auth()
returns text
language plpgsql
stable
as $$
declare
  v text;
begin
  v := coalesce(current_setting('app.family_auth', true), '');
  if v <> '' then
    return v;
  end if;
  v := public.fam_hdr('x-family-auth');
  if v <> '' then
    return v;
  end if;
  return public.fam_hdr('x-family-secret');
end;
$$;

-- 2.4 本次请求写入的「新凭证」
--     与 fam_auth 分开：这样「拿旧凭证通过校验、同时换新凭证」才能成立
create or replace function public.fam_new()
returns text
language plpgsql
stable
as $$
declare
  v text;
begin
  v := coalesce(current_setting('app.family_new', true), '');
  if v <> '' then
    return v;
  end if;
  v := public.fam_hdr('x-family-secret');
  if v <> '' then
    return v;
  end if;
  return public.fam_hdr('x-family-auth');
end;
$$;

-- using   = 这一行对我可见 / 可改吗（读 / 改 / 删）
-- with check = 写入后的新行合法吗（插 / 改）
--   凭证 = 浏览器算好的 md5(家庭码:密钥)，所以库里直接做字符串比较，
--   不需要任何哈希扩展，也不会出现「服务端算的哈希和客户端算的对不上」。
create policy "family_state own row"
  on public.family_state
  for all
  to anon, authenticated
  using (
    public.fam_code() = family_code
    and (
      -- 正常行：凭证必须完全一致
      (secret_hash <> '' and secret_hash = public.fam_auth())
      or
      -- 历史行（还没设密钥）：沿用 v2.2.x 语义（家庭码即凭证），首次写入即升级
      (secret_hash = '')
    )
  )
  with check (
    public.fam_code() = family_code
    and secret_hash = public.fam_new()
  );

-- 表级权限：anon / authenticated 需要表权限；行隔离由上面的策略负责
grant select, insert, update, delete on public.family_state to anon, authenticated;

grant execute on function public.fam_hdr(text) to anon, authenticated;
grant execute on function public.fam_code() to anon, authenticated;
grant execute on function public.fam_auth() to anon, authenticated;
grant execute on function public.fam_new() to anon, authenticated;

-- ============================================================
-- 3) RPC：普通函数（SECURITY INVOKER），先写会话变量再查 / 写
-- ============================================================

-- 3.1 读取：家庭码 + 凭证 → 该家庭的整包 state（不对则 null）
create or replace function public.family_pull(p_code text, p_secret text)
returns jsonb
language plpgsql
as $$
declare
  v_state jsonb;
begin
  perform set_config('app.family_code', coalesce(p_code, ''), true);
  perform set_config('app.family_auth', coalesce(p_secret, ''), true);
  perform set_config('app.family_new', coalesce(p_secret, ''), true);

  select state into v_state
  from public.family_state
  where family_code = coalesce(p_code, '');

  return v_state;   -- null = 该行不存在 或 凭证不匹配（不区分，避免探测）
end;
$$;

-- 3.2 写入：整包 upsert
--   p_auth = 访问现有行用的凭证
--   p_new  = 写进库里的新凭证
--   凭证错 → BAD_SECRET（不区分「行不存在」与「没权限」）
create or replace function public.family_push(
  p_code       text,
  p_auth       text,
  p_new        text,
  p_state      jsonb,
  p_updated_at timestamptz default now()
)
returns jsonb
language plpgsql
as $$
declare
  v_code text := coalesce(p_code, '');
  v_new  text := coalesce(p_new, p_auth, '');
begin
  if v_code = '' then
    raise exception 'EMPTY_CODE' using errcode = '22023';
  end if;
  if v_new = '' then
    raise exception 'EMPTY_SECRET' using errcode = '22023';
  end if;

  perform set_config('app.family_code', v_code, true);
  perform set_config('app.family_auth', coalesce(p_auth, v_new), true);
  perform set_config('app.family_new', v_new, true);

  -- 先按「现有凭证」改（RLS 的 using 生效）：凭证错 → 影响 0 行
  update public.family_state
     set secret_hash = v_new,
         state       = p_state,
         updated_at  = coalesce(p_updated_at, now())
   where family_code = v_code;

  if found then
    return jsonb_build_object('ok', true, 'family_code', v_code);
  end if;

  -- 改不动 = 行不存在（建行）或凭证不对（行在但看不见）
  begin
    insert into public.family_state (family_code, secret_hash, state, updated_at)
    values (v_code, v_new, p_state, coalesce(p_updated_at, now()));
  exception when unique_violation then
    raise exception 'BAD_SECRET' using errcode = '42501';
  end;

  return jsonb_build_object('ok', true, 'family_code', v_code);
end;
$$;

-- 授权调用（只给 EXECUTE）
revoke all on function public.family_pull(text, text) from public;
revoke all on function public.family_push(text, text, text, jsonb, timestamptz) from public;
grant execute on function public.family_pull(text, text) to anon, authenticated;
grant execute on function public.family_push(text, text, text, jsonb, timestamptz) to anon, authenticated;

-- ============================================================
-- 验证
-- ============================================================
-- 1) 函数齐了：应返回 6 行
-- select proname from pg_proc where proname like 'fam%' or proname like 'family_%';
-- 2) 策略生效：应返回 1 行
-- select policyname from pg_policies where tablename = 'family_state';
-- 3) 直连表读不到别人的行：返回 0 行
-- select * from public.family_state;
-- 4) 业务自检请在页面里点「🔌 测试连接」/「🩺 环境体检」
