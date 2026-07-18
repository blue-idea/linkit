/**
 * REQ-003-AC-002~003、REQ-025-AC-003~005
 * 通过本地 PostgREST 真实验证本人 CRUD、跨用户空结果、未认证读写边界。
 */
import { createClient } from '@supabase/supabase-js';

const API_URL = process.env.LINKIT_TEST_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY =
  process.env.LINKIT_TEST_SUPABASE_PUBLISHABLE_KEY ??
  process.env.LINKIT_TEST_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const USER_A = {
  email: process.env.LINKIT_TEST_USER_A_EMAIL ?? 'user-a@linkit.test',
  password: process.env.LINKIT_TEST_USER_A_PASSWORD ?? 'LinkitTestA-Passw0rd!',
};
const USER_B = {
  email: process.env.LINKIT_TEST_USER_B_EMAIL ?? 'user-b@linkit.test',
  password: process.env.LINKIT_TEST_USER_B_PASSWORD ?? 'LinkitTestB-Passw0rd!',
};

const emptyLibrary = {
  bookmarks: [],
  categories: [],
  collections: [],
  tags: [],
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function signIn(email, password) {
  const client = createClient(API_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert(!error, `登录失败 (${email}): ${error?.message}`);
  assert(data.user?.id, `登录后缺少 user id (${email})`);
  return { client, userId: data.user.id };
}

async function main() {
  const failures = [];

  // REQ-025-AC-003：未认证 SELECT → 空数组
  {
    const anon = createClient(API_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error, status } = await anon.from('user_bookmarks').select('*');
    try {
      assert(!error, `未认证 SELECT 不应报错: ${error?.message}`);
      assert(status === 200, `未认证 SELECT 期望 HTTP 200，实际 ${status}`);
      assert(Array.isArray(data) && data.length === 0, '未认证 SELECT 应返回空数组');
      console.log('PASS REQ-025-AC-003 未认证 SELECT 空结果');
    } catch (err) {
      failures.push(err.message);
      console.error('FAIL REQ-025-AC-003', err.message);
    }
  }

  // REQ-025-AC-005：未认证写入拒绝
  {
    const anon = createClient(API_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: insertError } = await anon.from('user_bookmarks').insert({
      data: emptyLibrary,
      schema_version: 1,
      revision: 0,
    });
    try {
      assert(insertError, '未认证 INSERT 应被拒绝');
      console.log('PASS REQ-025-AC-005 未认证写入拒绝', insertError.message);
    } catch (err) {
      failures.push(err.message);
      console.error('FAIL REQ-025-AC-005', err.message);
    }
  }

  const userA = await signIn(USER_A.email, USER_A.password);
  const userB = await signIn(USER_B.email, USER_B.password);

  // REQ-003-AC-002：本人可读可写
  {
    try {
      const { data: rows, error: readError, status } = await userA.client
        .from('user_bookmarks')
        .select('user_id, schema_version, revision, data')
        .eq('user_id', userA.userId);
      assert(!readError, `用户 A 读取失败: ${readError?.message}`);
      assert(status === 200, `用户 A 读取期望 200，实际 ${status}`);
      assert(rows?.length === 1, `用户 A 应读到 1 行，实际 ${rows?.length}`);
      assert(rows[0].user_id === userA.userId, '用户 A 行 user_id 必须匹配');
      assert(rows[0].schema_version >= 1, 'schema_version 必须 >= 1');
      assert(typeof rows[0].revision === 'number', 'revision 必须存在');

      const nextRevision = Number(rows[0].revision) + 1;
      const { data: updated, error: writeError } = await userA.client
        .from('user_bookmarks')
        .update({
          data: { ...emptyLibrary, bookmarks: [{ id: 'bookmark-api-rls' }] },
          schema_version: 1,
          revision: nextRevision,
        })
        .eq('user_id', userA.userId)
        .eq('revision', rows[0].revision)
        .select('revision')
        .maybeSingle();
      assert(!writeError, `用户 A 写入失败: ${writeError?.message}`);
      assert(updated?.revision === nextRevision, '用户 A 条件更新应递增 revision');
      console.log('PASS REQ-003-AC-002 本人 CRUD');
    } catch (err) {
      failures.push(err.message);
      console.error('FAIL REQ-003-AC-002', err.message);
    }
  }

  // REQ-003-AC-003：跨用户读取为空
  {
    try {
      const { data, error, status } = await userA.client
        .from('user_bookmarks')
        .select('*')
        .eq('user_id', userB.userId);
      assert(!error, `跨用户读取不应传输错误: ${error?.message}`);
      assert(status === 200, `跨用户读取期望 200，实际 ${status}`);
      assert(Array.isArray(data) && data.length === 0, '跨用户读取应返回空数组');
      console.log('PASS REQ-003-AC-003 跨用户空结果');
    } catch (err) {
      failures.push(err.message);
      console.error('FAIL REQ-003-AC-003', err.message);
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} failing assertion(s)`);
    process.exit(1);
  }
  console.log('\nAll Supabase RLS API checks passed');
}

main().catch((err) => {
  console.error('BLOCKED or FATAL:', err.message ?? err);
  process.exit(1);
});
