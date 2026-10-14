-- Max's Credits Plan · Supabase 建表脚本（v2.2.0）
-- 用法：Supabase 控制台 → SQL Editor → New query → 粘贴执行一次即可
--
-- 数据模型：一张表存整包状态（一家一行，JSONB）
-- 冲突策略：last-write-wins（按 state.updatedAt 比较）
-- 安全模型：家庭码即读写凭证——知道码的设备可读写该行。
--           家庭自用够用；商用多租户需再加配对密钥或登录体系（见 WORKDOC「商业化」）。

create table if not exists public.family_state (
  family_code text primary key,
  state       jsonb       not null,
  updated_at  timestamptz not null default now()
);

-- 行级安全：anon 角色可读写（家庭玩具无个人敏感信息；key 只存本机浏览器）
alter table public.family_state enable row level security;

drop policy if exists "family_state anon rw" on public.family_state;
create policy "family_state anon rw"
  on public.family_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 验证：执行后应返回 1 行表定义
-- select * from family_state limit 1;
