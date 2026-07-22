/*
  TASK-068 / REQ-006-AC-007：云资料库 JSONB 书签图标字段契约（无表级 DDL 变更）。

  user_bookmarks.data 仍为 LibraryData JSONB；schema_version 保持 1。
  新增/明确 bookmarks[] 内 favicon、faviconColor 的持久化语义，供客户端与文档对齐。
*/

comment on table public.user_bookmarks is
  'Per-user cloud library snapshot (LibraryData JSONB). Bookmark icon fields documented on column data (TASK-068).';

comment on column public.user_bookmarks.data is
  'LibraryData JSONB. bookmarks[].favicon: null, http(s) URL, or display glyph (1-8 Unicode code points). bookmarks[].faviconColor: blue|green|amber|coral|violet|gray (client defaults missing to blue). Does not store AI secrets.';

comment on column public.user_bookmarks.schema_version is
  'Library envelope schema version; remains 1 for TASK-068 bookmark icon contract extension.';

-- 可选校验：供未来 CHECK / 应用层复用；当前不挂约束，避免拒绝历史 UI 形态种子数据。
create or replace function public.library_bookmark_icon_fields_valid(bookmark jsonb)
returns boolean
language sql
immutable
parallel safe
set search_path = public
as $$
  select
    bookmark is null
    or (
      (not (bookmark ? 'favicon') or bookmark->>'favicon' is null
        or bookmark->>'favicon' ~ '^https?://'
        or (
          octet_length(bookmark->>'favicon') > 0
          and bookmark->>'favicon' !~ '^https?://'
          and char_length(bookmark->>'favicon') <= 32
        ))
      and (not (bookmark ? 'faviconColor') or bookmark->>'faviconColor' in (
        'blue', 'green', 'amber', 'coral', 'violet', 'gray'
      ))
    );
$$;

comment on function public.library_bookmark_icon_fields_valid(jsonb) is
  'Validates bookmark JSON icon fields per data.md §3.1 (glyph length approximated for SQL; client enforces code points).';
