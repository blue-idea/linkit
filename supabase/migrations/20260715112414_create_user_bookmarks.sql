/*
  TASK-026 / data.md §6：user_bookmarks 云资料库表、乐观锁列、RLS 与权限基线。

  1. 表：每用户一行 JSONB 资料库（不含 AI Key）
  2. schema_version / revision 约束
  3. authenticated 本人 CRUD；anon 仅可空 SELECT，写入显式拒绝
*/

create table if not exists public.user_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  schema_version integer not null default 1,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint user_bookmarks_user_id_key unique (user_id),
  constraint user_bookmarks_schema_version_check check (schema_version >= 1),
  constraint user_bookmarks_revision_check check (revision >= 0)
);

comment on table public.user_bookmarks is 'Per-user cloud library snapshot (LibraryData JSONB).';
comment on column public.user_bookmarks.schema_version is 'Library JSON schema version.';
comment on column public.user_bookmarks.revision is 'Optimistic lock revision for cloud saves.';

alter table public.user_bookmarks enable row level security;

-- 本人 CRUD：使用 (select auth.uid()) 以便策略可缓存
drop policy if exists "select_own_bookmarks" on public.user_bookmarks;
create policy "select_own_bookmarks"
  on public.user_bookmarks
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
  );

drop policy if exists "insert_own_bookmarks" on public.user_bookmarks;
create policy "insert_own_bookmarks"
  on public.user_bookmarks
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
  );

drop policy if exists "update_own_bookmarks" on public.user_bookmarks;
create policy "update_own_bookmarks"
  on public.user_bookmarks
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
  )
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
  );

drop policy if exists "delete_own_bookmarks" on public.user_bookmarks;
create policy "delete_own_bookmarks"
  on public.user_bookmarks
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
  );

-- 权限基线：anon 可读表但无匹配策略→空结果；写权限显式撤销
grant select on public.user_bookmarks to anon;
revoke insert, update, delete on public.user_bookmarks from anon;
grant select, insert, update, delete on public.user_bookmarks to authenticated;

create or replace function public.set_user_bookmarks_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_bookmarks_updated on public.user_bookmarks;
create trigger trg_user_bookmarks_updated
  before update on public.user_bookmarks
  for each row
  execute function public.set_user_bookmarks_updated_at();
