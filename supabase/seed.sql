-- TASK-026：本地双用户 RLS seed（固定 UUID，对齐 docs/spec/info.md）
-- 密码仅用于本地/CI；勿用于远程生产。

create extension if not exists pgcrypto with schema extensions;

-- 清理可重复执行的本地 seed
delete from public.user_bookmarks
where user_id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

delete from auth.identities
where user_id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

delete from auth.users
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'user-a@linkit.test',
  extensions.crypt('LinkitTestA-Passw0rd!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'user-b@linkit.test',
  extensions.crypt('LinkitTestB-Passw0rd!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values
(
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'email', 'user-a@linkit.test',
    'email_verified', true
  ),
  'email',
  '11111111-1111-1111-1111-111111111111',
  now(),
  now(),
  now()
),
(
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  jsonb_build_object(
    'sub', '22222222-2222-2222-2222-222222222222',
    'email', 'user-b@linkit.test',
    'email_verified', true
  ),
  'email',
  '22222222-2222-2222-2222-222222222222',
  now(),
  now(),
  now()
);

insert into public.user_bookmarks (user_id, data, schema_version, revision)
values
(
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object(
    'bookmarks', jsonb_build_array(
      jsonb_build_object(
        'id', 'bookmark-user-a',
        'title', 'User A seed bookmark',
        'url', 'https://example.test/user-a',
        'domain', 'example.test',
        'favicon', 'A',
        'faviconColor', 'blue',
        'description', '',
        'notes', '',
        'tagIds', '[]'::jsonb,
        'categoryId', null,
        'collectionIds', '[]'::jsonb,
        'createdAt', '2026-01-01T00:00:00.000Z',
        'updatedAt', '2026-01-01T00:00:00.000Z',
        'lastVisitedAt', null,
        'visitCount', 0,
        'starred', false,
        'pinned', false,
        'readStatus', 'unread',
        'health', 'ok',
        'healthCheckedAt', null,
        'healthHttpStatus', null,
        'healthFingerprint', null,
        'healthErrorCode', null,
        'aiSummary', '',
        'aiSuggestedTags', '[]'::jsonb,
        'thumbnail', null
      )
    ),
    'categories', '[]'::jsonb,
    'collections', '[]'::jsonb,
    'tags', '[]'::jsonb
  ),
  1,
  0
),
(
  '22222222-2222-2222-2222-222222222222',
  jsonb_build_object(
    'bookmarks', jsonb_build_array(
      jsonb_build_object(
        'id', 'bookmark-user-b',
        'title', 'User B seed bookmark',
        'url', 'https://example.test/user-b',
        'domain', 'example.test',
        'favicon', 'https://example.test/favicon.ico',
        'faviconColor', 'coral',
        'description', '',
        'notes', '',
        'tagIds', '[]'::jsonb,
        'categoryId', null,
        'collectionIds', '[]'::jsonb,
        'createdAt', '2026-01-01T00:00:00.000Z',
        'updatedAt', '2026-01-01T00:00:00.000Z',
        'lastVisitedAt', null,
        'visitCount', 0,
        'starred', false,
        'pinned', false,
        'readStatus', 'unread',
        'health', 'ok',
        'healthCheckedAt', null,
        'healthHttpStatus', null,
        'healthFingerprint', null,
        'healthErrorCode', null,
        'aiSummary', '',
        'aiSuggestedTags', '[]'::jsonb,
        'thumbnail', null
      )
    ),
    'categories', '[]'::jsonb,
    'collections', '[]'::jsonb,
    'tags', '[]'::jsonb
  ),
  1,
  0
);
