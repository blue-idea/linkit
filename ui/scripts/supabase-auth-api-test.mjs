/**
 * REQ-001：本地 Auth API 冒烟（登录成功 / 无效凭据）。
 * 依赖：`pnpm --dir ui run supabase:reset` 后的 seed 用户。
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const client = createClient(API_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const bad = await client.auth.signInWithPassword({
    email: USER_A.email,
    password: 'definitely-wrong-password',
  });
  assert(bad.error, '无效凭据应失败');
  console.log('PASS REQ-001-AC-003 无效凭据被拒绝:', bad.error.message);

  const ok = await client.auth.signInWithPassword(USER_A);
  assert(!ok.error, `有效登录失败: ${ok.error?.message}`);
  assert(ok.data.session, '有效登录应返回 session');
  console.log('PASS REQ-001-AC-001 有效登录返回 session');

  const session = await client.auth.getSession();
  assert(session.data.session?.user?.id === ok.data.user?.id, 'getSession 应恢复同一用户');
  console.log('PASS REQ-001-AC-004 getSession 恢复会话');

  await client.auth.signOut();
  const after = await client.auth.getSession();
  assert(!after.data.session, 'signOut 后 session 应为空');
  console.log('PASS REQ-002-AC-003 signOut 清除会话');

  console.log('\nAll Supabase Auth API checks passed');
}

main().catch((err) => {
  console.error('BLOCKED or FATAL:', err.message ?? err);
  process.exit(1);
});
