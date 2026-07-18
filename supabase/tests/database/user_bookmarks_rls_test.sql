-- REQ-003-AC-002~003、REQ-025-AC-003~005：验证 user_bookmarks 表结构与 RLS 隔离。
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- 表与乐观锁列必须存在（对齐 data.md §6.1）
select has_table('public', 'user_bookmarks', 'user_bookmarks 表存在');
select has_column('public', 'user_bookmarks', 'schema_version', '含 schema_version 列');
select has_column('public', 'user_bookmarks', 'revision', '含 revision 列');
select col_not_null('public', 'user_bookmarks', 'schema_version', 'schema_version 非空');
select col_not_null('public', 'user_bookmarks', 'revision', 'revision 非空');

-- RLS 必须启用
select ok(
  (
    select relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'user_bookmarks'
  ),
  'user_bookmarks 已启用 RLS'
);

-- 固定双用户 seed（见 seed.sql）下的本人可读与跨用户隔离
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.user_bookmarks),
  1,
  'REQ-003-AC-002：用户 A 仅能看到自己的一行'
);

select is(
  (select user_id from public.user_bookmarks),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'REQ-003-AC-002：用户 A 读取到的 user_id 为自己'
);

select is(
  (
    select count(*)::integer
    from public.user_bookmarks
    where user_id = '22222222-2222-2222-2222-222222222222'
  ),
  0,
  'REQ-003-AC-003：用户 A 过滤用户 B 时结果为空'
);

-- 未认证角色：SELECT 为空，写入被拒绝
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;

select is(
  (select count(*)::integer from public.user_bookmarks),
  0,
  'REQ-025-AC-003：未认证 SELECT 返回空结果'
);

select throws_ok(
  $$insert into public.user_bookmarks (user_id, data, schema_version, revision)
    values (
      '11111111-1111-1111-1111-111111111111',
      '{"bookmarks":[],"categories":[],"collections":[],"tags":[]}'::jsonb,
      1,
      0
    )$$,
  '42501',
  null,
  'REQ-025-AC-005：未认证 INSERT 被拒绝'
);

select throws_ok(
  $$update public.user_bookmarks set revision = revision + 1$$,
  '42501',
  null,
  'REQ-025-AC-005：未认证 UPDATE 被拒绝'
);

select throws_ok(
  $$delete from public.user_bookmarks$$,
  '42501',
  null,
  'REQ-025-AC-005：未认证 DELETE 被拒绝'
);

select * from finish();
rollback;
