create table if not exists public.family_state (
  family_code text primary key,
  secret_hash text not null default '',
  state       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.family_state add column if not exists secret_hash text not null default '';
alter table public.family_state enable row level security;
drop policy if exists "family_state anon rw" on public.family_state;
drop policy if exists "family_state direct access" on public.family_state;
drop policy if exists "family_state own row" on public.family_state;
create or replace function public.fam_hdr(p_name text)
returns text language plpgsql stable as $$
declare v_raw text; v_json jsonb; begin
  v_raw := coalesce(current_setting('request.headers', true), '');
  if v_raw <> '' then
    begin
      v_json := v_raw::jsonb;
      return coalesce(v_json ->> p_name, '');
    exception when others then
      null;
    end;
  end if;
  return coalesce(current_setting('request.header.' || p_name, true), '');
end;
$$;
create or replace function public.fam_code()
returns text language plpgsql stable as $$
declare v text; begin
  v := coalesce(current_setting('app.family_code', true), '');
  if v <> '' then return v; end if;
  return public.fam_hdr('x-family-code');
end;
$$;
create or replace function public.fam_auth()
returns text language plpgsql stable as $$
declare v text; begin
  v := coalesce(current_setting('app.family_auth', true), '');
  if v <> '' then return v; end if;
  v := public.fam_hdr('x-family-auth');
  if v <> '' then return v; end if;
  return public.fam_hdr('x-family-secret');
end;
$$;
create or replace function public.fam_new()
returns text language plpgsql stable as $$
declare v text; begin
  v := coalesce(current_setting('app.family_new', true), '');
  if v <> '' then return v; end if;
  v := public.fam_hdr('x-family-secret');
  if v <> '' then return v; end if;
  return public.fam_hdr('x-family-auth');
end;
$$;
create policy "family_state own row" on public.family_state
  for all to anon, authenticated
  using (
    public.fam_code() = family_code
    and (
      (secret_hash <> '' and secret_hash = public.fam_auth())
      or
      (secret_hash = '')
    )
  )
  with check (
    public.fam_code() = family_code
    and secret_hash = public.fam_new()
  );
grant select, insert, update, delete on public.family_state to anon, authenticated;
grant execute on function public.fam_hdr(text) to anon, authenticated;
grant execute on function public.fam_code() to anon, authenticated;
grant execute on function public.fam_auth() to anon, authenticated;
grant execute on function public.fam_new() to anon, authenticated;
create or replace function public.family_pull(p_code text, p_secret text)
returns jsonb language plpgsql as $$
declare v_state jsonb; begin
  perform set_config('app.family_code', coalesce(p_code, ''), true);
  perform set_config('app.family_auth', coalesce(p_secret, ''), true);
  perform set_config('app.family_new', coalesce(p_secret, ''), true);
  select state into v_state from public.family_state where family_code = coalesce(p_code, '');
  return v_state;
end;
$$;
create or replace function public.family_push(
  p_code text,
  p_auth text,
  p_new text,
  p_state jsonb,
  p_updated_at timestamptz default now()
)
returns jsonb language plpgsql as $$
declare v_code text := coalesce(p_code, ''); v_new text := coalesce(p_new, p_auth, ''); begin
  if v_code = '' then raise exception 'EMPTY_CODE' using errcode = '22023'; end if;
  if v_new = '' then raise exception 'EMPTY_SECRET' using errcode = '22023'; end if;
  perform set_config('app.family_code', v_code, true);
  perform set_config('app.family_auth', coalesce(p_auth, v_new), true);
  perform set_config('app.family_new', v_new, true);
  update public.family_state
     set secret_hash = v_new, state = p_state, updated_at = coalesce(p_updated_at, now())
   where family_code = v_code;
  if found then return jsonb_build_object('ok', true, 'family_code', v_code); end if;
  begin
    insert into public.family_state (family_code, secret_hash, state, updated_at)
    values (v_code, v_new, p_state, coalesce(p_updated_at, now()));
  exception when unique_violation then
    raise exception 'BAD_SECRET' using errcode = '42501';
  end;
  return jsonb_build_object('ok', true, 'family_code', v_code);
end;
$$;
revoke all on function public.family_pull(text, text) from public;
revoke all on function public.family_push(text, text, text, jsonb, timestamptz) from public;
grant execute on function public.family_pull(text, text) to anon, authenticated;
grant execute on function public.family_push(text, text, text, jsonb, timestamptz) to anon, authenticated;
