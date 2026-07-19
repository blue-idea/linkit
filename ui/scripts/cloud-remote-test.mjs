/**
 * TASK-030 · 远程 Supabase 云端验收
 *
 * 覆盖 AC：
 *   REQ-001-AC-001~004  Auth 登录 / 无效凭据 / getSession / signOut
 *   REQ-003-AC-001~005  本人 CRUD / 跨用户隔离 / 草稿清理 / revision 乐观锁
 *   REQ-004-AC-001~004  存储切换（CloudRepository 层语义验证）
 *   REQ-025-AC-003~005  未认证 SELECT 空结果 / 写入拒绝
 *
 * 前置条件：
 *   - ui/.env.test 中配置 LINKIT_TEST_SUPABASE_URL / PUBLISHABLE_KEY / USER_A / USER_B
 *   - 远程 linkit 项目已应用 migration 并执行双用户 seed
 *
 * 运行：
 *   node ./scripts/cloud-remote-test.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { loadTestEnv } from './test-env.mjs';

// ─── 加载环境变量（.env.test） ────────────────────────────────────────────
loadTestEnv();

// ─── 门禁检查 ──────────────────────────────────────────────────────────────
const API_URL = process.env.LINKIT_TEST_SUPABASE_URL;
const ANON_KEY = process.env.LINKIT_TEST_SUPABASE_PUBLISHABLE_KEY;

if (!API_URL || API_URL.includes('127.0.0.1') || API_URL.includes('localhost')) {
  console.error('BLOCKED: LINKIT_TEST_SUPABASE_URL 必须指向远程 staging 项目');
  process.exit(2);
}
if (!ANON_KEY) {
  console.error('BLOCKED: LINKIT_TEST_SUPABASE_PUBLISHABLE_KEY 未配置');
  process.exit(2);
}

const USER_A = {
  email: process.env.LINKIT_TEST_USER_A_EMAIL ?? 'user-a@linkit.test',
  password: process.env.LINKIT_TEST_USER_A_PASSWORD ?? 'LinkitTestA-Passw0rd!',
};
const USER_B = {
  email: process.env.LINKIT_TEST_USER_B_EMAIL ?? 'user-b@linkit.test',
  password: process.env.LINKIT_TEST_USER_B_PASSWORD ?? 'LinkitTestB-Passw0rd!',
};

// ─── 辅助函数 ──────────────────────────────────────────────────────────────
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mkClient() {
  return createClient(API_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(user) {
  const client = mkClient();
  const { data, error } = await client.auth.signInWithPassword(user);
  assert(!error, `登录失败 (${user.email}): ${error?.message}`);
  assert(data.user?.id, `登录后缺少 user id (${user.email})`);
  return { client, userId: data.user.id };
}

/** 条件更新，语义对齐 CloudRepository.save */
async function conditionalSave(client, userId, expectedRevision, data) {
  const nextRevision = expectedRevision + 1;
  const { data: row, error } = await client
    .from('user_bookmarks')
    .update({ data, schema_version: 1, revision: nextRevision })
    .eq('user_id', userId)
    .eq('revision', expectedRevision)
    .select('revision,updated_at')
    .maybeSingle();
  if (error) return { ok: false, code: 'CLOUD_REQUEST_FAILED', message: error.message };
  if (!row) return { ok: false, code: 'CLOUD_REVISION_CONFLICT', message: 'Library revision conflict' };
  return { ok: true, revision: row.revision, updatedAt: row.updated_at };
}

// ─── 最小合法测试数据 ──────────────────────────────────────────────────────
const FIXED_TS = '2026-07-18T13:00:00.000Z';
const emptyLibrary = { bookmarks: [], categories: [], collections: [], tags: [] };
const testLibrary = {
  bookmarks: [{
    id: 'bm-remote-task030',
    title: 'Remote TASK-030 test',
    url: 'https://example.test/task030',
    domain: 'example.test',
    favicon: null,
    description: '',
    notes: '',
    tagIds: ['tag-task030'],
    categoryId: 'cat-task030',
    collectionIds: ['col-task030'],
    createdAt: FIXED_TS,
    updatedAt: FIXED_TS,
    lastVisitedAt: null,
    visitCount: 0,
    starred: false,
    pinned: false,
    readStatus: 'unread',
    health: 'ok',
    healthCheckedAt: null,
    healthHttpStatus: null,
    healthFingerprint: null,
    healthErrorCode: null,
    aiSummary: '',
    aiSuggestedTags: [],
    thumbnail: null,
  }],
  categories: [{ id: 'cat-task030', name: 'Task030', icon: 'Bookmark', parentId: null, color: 'blue' }],
  collections: [{
    id: 'col-task030',
    name: 'Task030 collection',
    emoji: '☁️',
    color: 'blue',
    description: '',
    bookmarkIds: ['bm-remote-task030'],
    createdAt: FIXED_TS,
    updatedAt: FIXED_TS,
  }],
  tags: [{ id: 'tag-task030', label: 'remote', color: 'blue' }],
};

// ─── 测试运行器 ────────────────────────────────────────────────────────────
const results = [];
let passCount = 0;
let failCount = 0;

function pass(id, label, detail) {
  passCount++;
  const msg = detail ? `PASS ${id} ${label} ${JSON.stringify(detail)}` : `PASS ${id} ${label}`;
  console.log(msg);
  results.push({ id, label, status: 'PASS', detail: detail ?? null });
}

function fail(id, label, error) {
  failCount++;
  console.error(`FAIL ${id} ${label}:`, error);
  results.push({ id, label, status: 'FAIL', error: String(error) });
}

// ─── 测试套件 ──────────────────────────────────────────────────────────────
async function runTests() {
  console.log(`\n🔗 远程 Supabase 验收 · ${API_URL}\n`);

  // ══════════════════════════════════════════════════════════════
  // 分组 1：REQ-025-AC-003~005  未认证安全边界
  // ══════════════════════════════════════════════════════════════
  console.log('── 分组 1：未认证安全边界 ──────────────────────────────────');

  // REQ-025-AC-003：未认证 SELECT → 200 + 空数组
  try {
    const anon = mkClient();
    const { data, error, status } = await anon.from('user_bookmarks').select('*');
    assert(!error, `未认证 SELECT 不应报错: ${error?.message}`);
    assert(status === 200, `未认证 SELECT 期望 HTTP 200，实际 ${status}`);
    assert(Array.isArray(data) && data.length === 0, `未认证 SELECT 应返回空数组，实际 ${data?.length} 行`);
    pass('REQ-025-AC-003', '未认证 SELECT 返回空数组', { status, rows: data.length });
  } catch (e) { fail('REQ-025-AC-003', '未认证 SELECT 安全边界', e.message); }

  // REQ-025-AC-005：未认证 INSERT 被拒绝
  try {
    const anon = mkClient();
    const { error: insertError } = await anon.from('user_bookmarks').insert({
      data: emptyLibrary, schema_version: 1, revision: 0,
    });
    assert(insertError, '未认证 INSERT 应被拒绝');
    pass('REQ-025-AC-005', '未认证 INSERT 拒绝', { code: insertError.code });
  } catch (e) { fail('REQ-025-AC-005', '未认证 INSERT 拒绝', e.message); }

  // REQ-025-AC-005（补充）：未认证 UPDATE 被拒绝
  try {
    const anon = mkClient();
    const { error: updateError } = await anon.from('user_bookmarks').update({ revision: 999 });
    assert(updateError, '未认证 UPDATE 应被拒绝');
    pass('REQ-025-AC-005b', '未认证 UPDATE 拒绝', { code: updateError.code });
  } catch (e) { fail('REQ-025-AC-005b', '未认证 UPDATE 拒绝', e.message); }

  // ══════════════════════════════════════════════════════════════
  // 分组 2：REQ-001-AC-001~004  Auth 登录流程
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 分组 2：Auth 登录流程 ──────────────────────────────────');

  // REQ-001-AC-003：无效凭据被拒绝
  try {
    const client = mkClient();
    const { error } = await client.auth.signInWithPassword({
      email: USER_A.email, password: 'wrong-password-xyz',
    });
    assert(error, '无效凭据应返回错误');
    pass('REQ-001-AC-003', '无效凭据被拒绝', { message: error.message });
  } catch (e) { fail('REQ-001-AC-003', '无效凭据被拒绝', e.message); }

  // REQ-001-AC-001：有效登录返回 session（用户 A）
  let userA, userB;
  try {
    userA = await signIn(USER_A);
    pass('REQ-001-AC-001', '用户 A 有效登录返回 session', { userId: userA.userId });
  } catch (e) { fail('REQ-001-AC-001', '用户 A 有效登录', e.message); }

  // REQ-001-AC-004：getSession 恢复会话
  if (userA) {
    try {
      const { data: sessionData } = await userA.client.auth.getSession();
      assert(sessionData.session?.user?.id === userA.userId, 'getSession 应返回同一 userId');
      pass('REQ-001-AC-004', 'getSession 恢复会话', { userId: userA.userId });
    } catch (e) { fail('REQ-001-AC-004', 'getSession 恢复会话', e.message); }
  } else {
    fail('REQ-001-AC-004', 'getSession 恢复会话', 'SKIP: 依赖用户 A 登录失败');
  }

  // REQ-001-AC-002：用户 B 独立登录
  try {
    userB = await signIn(USER_B);
    pass('REQ-001-AC-002', '用户 B 有效登录返回 session', { userId: userB.userId });
  } catch (e) { fail('REQ-001-AC-002', '用户 B 有效登录', e.message); }

  // ══════════════════════════════════════════════════════════════
  // 分组 3：REQ-003-AC-001~003  本人 CRUD 与跨用户隔离
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 分组 3：本人 CRUD 与跨用户 RLS 隔离 ─────────────────────');

  let baseRevisionA = 0;
  if (userA) {
    // REQ-003-AC-001：本人 SELECT 返回自己的行
    try {
      const { data: rows, error, status } = await userA.client
        .from('user_bookmarks')
        .select('user_id,schema_version,revision,data')
        .eq('user_id', userA.userId);
      assert(!error, `用户 A SELECT 失败: ${error?.message}`);
      assert(status === 200, `期望 200，实际 ${status}`);
      assert(rows?.length === 1, `期望 1 行，实际 ${rows?.length}`);
      assert(rows[0].user_id === userA.userId, 'user_id 必须匹配');
      assert(rows[0].schema_version >= 1, 'schema_version 必须 >= 1');
      baseRevisionA = Number(rows[0].revision);
      pass('REQ-003-AC-001', '用户 A SELECT 本人行', { rows: rows.length, revision: baseRevisionA });
    } catch (e) { fail('REQ-003-AC-001', '用户 A SELECT 本人行', e.message); }

    // REQ-003-AC-002：本人 UPDATE（乐观锁条件更新）
    try {
      const result = await conditionalSave(userA.client, userA.userId, baseRevisionA, testLibrary);
      assert(result.ok, `条件保存失败: ${result.code}: ${result.message}`);
      assert(result.revision === baseRevisionA + 1, `revision 应从 ${baseRevisionA} 递增到 ${baseRevisionA + 1}`);
      pass('REQ-003-AC-002', '用户 A 条件 UPDATE 成功', { from: baseRevisionA, to: result.revision });
      baseRevisionA = result.revision;
    } catch (e) { fail('REQ-003-AC-002', '用户 A 条件 UPDATE', e.message); }

    // REQ-003-AC-003：跨用户读取为空
    if (userB) {
      try {
        const { data, error, status } = await userA.client
          .from('user_bookmarks')
          .select('*')
          .eq('user_id', userB.userId);
        assert(!error, `跨用户读取不应报错: ${error?.message}`);
        assert(status === 200, `期望 200，实际 ${status}`);
        assert(Array.isArray(data) && data.length === 0, '跨用户读取应返回空数组');
        pass('REQ-003-AC-003', '用户 A 越权读取用户 B 返回空', { rows: data.length });
      } catch (e) { fail('REQ-003-AC-003', '越权读取隔离', e.message); }
    } else {
      fail('REQ-003-AC-003', '越权读取隔离', 'SKIP: 依赖用户 B 登录失败');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 分组 4：REQ-003-AC-004~005  revision 乐观锁与冲突映射
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 分组 4：revision 乐观锁与冲突 ───────────────────────────');

  if (userA) {
    // REQ-003-AC-005 happy path：匹配 revision 的条件更新
    try {
      const result = await conditionalSave(userA.client, userA.userId, baseRevisionA, testLibrary);
      assert(result.ok, `期望保存成功，实际 ${result.code}: ${result.message}`);
      assert(result.revision === baseRevisionA + 1, `revision 应为 ${baseRevisionA + 1}，实际 ${result.revision}`);
      pass('REQ-003-AC-005-happy', 'revision 条件更新成功', { from: baseRevisionA, to: result.revision });
      baseRevisionA = result.revision;
    } catch (e) { fail('REQ-003-AC-005-happy', 'revision 条件更新 happy path', e.message); }

    // REQ-003-AC-005 conflict：陈旧 revision → CLOUD_REVISION_CONFLICT
    try {
      const staleRevision = baseRevisionA - 1; // 刻意用旧 revision
      const stale = await conditionalSave(userA.client, userA.userId, staleRevision, testLibrary);
      assert(!stale.ok, '陈旧 revision 不应保存成功');
      assert(stale.code === 'CLOUD_REVISION_CONFLICT', `期望 CLOUD_REVISION_CONFLICT，实际 ${stale.code}`);

      // 确认云端 revision 未被覆盖
      const { data: after } = await userA.client
        .from('user_bookmarks').select('revision').eq('user_id', userA.userId).maybeSingle();
      assert(Number(after.revision) === baseRevisionA, `冲突后 revision 应保持 ${baseRevisionA}，实际 ${after?.revision}`);
      pass('REQ-003-AC-005-conflict', '陈旧 revision 映射 CLOUD_REVISION_CONFLICT', {
        staleUsed: staleRevision, cloudRevision: after?.revision,
      });
    } catch (e) { fail('REQ-003-AC-005-conflict', 'revision 冲突映射', e.message); }

    // REQ-003-AC-004：本人 DELETE
    try {
      const { error: delError } = await userA.client
        .from('user_bookmarks').delete().eq('user_id', userA.userId);
      assert(!delError, `DELETE 失败: ${delError?.message}`);
      const { data: afterDel } = await userA.client
        .from('user_bookmarks').select('*').eq('user_id', userA.userId);
      assert(afterDel?.length === 0, 'DELETE 后应无记录');
      pass('REQ-003-AC-004', '本人 DELETE 成功且行消失', { rows: afterDel?.length });
    } catch (e) { fail('REQ-003-AC-004', '本人 DELETE', e.message); }

    // 恢复 seed 行（供后续测试复用）
    try {
      const { error: insError } = await userA.client
        .from('user_bookmarks')
        .insert({ user_id: userA.userId, data: emptyLibrary, schema_version: 1, revision: 0 });
      if (insError) console.warn('  ⚠ 恢复 seed 行失败（可忽略）:', insError.message);
      else console.log('  ℹ 恢复用户 A seed 行');
    } catch { /* 非致命 */ }
  }

  // ══════════════════════════════════════════════════════════════
  // 分组 5：REQ-004-AC-001~004  存储模式语义验证
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 分组 5：存储模式语义（CloudRepository 层） ───────────────');

  if (userA) {
    // REQ-004-AC-001：云存储下可读取云数据
    try {
      const { data, error } = await userA.client
        .from('user_bookmarks').select('revision,schema_version').eq('user_id', userA.userId);
      assert(!error, `云读取失败: ${error?.message}`);
      assert(data?.length >= 0, '云读取应返回数组');
      pass('REQ-004-AC-001', '云存储下可读取云数据', { rows: data?.length });
    } catch (e) { fail('REQ-004-AC-001', '云存储下可读取云数据', e.message); }

    // REQ-004-AC-002：signOut 后无法操作云数据
    try {
      await userA.client.auth.signOut();
      const { data: afterSignout } = await userA.client
        .from('user_bookmarks').select('*').eq('user_id', userA.userId);
      assert(afterSignout?.length === 0, 'signOut 后 SELECT 应返回空（RLS）');
      pass('REQ-004-AC-002', 'signOut 后 RLS 立即生效', { rows: afterSignout?.length });
    } catch (e) { fail('REQ-004-AC-002', 'signOut 后 RLS 生效', e.message); }

    // REQ-004-AC-003：跨用户写入被拒绝（用户 B 尝试写入用户 A 的行）
    if (userB) {
      try {
        const { error: crossWriteError } = await userB.client
          .from('user_bookmarks')
          .update({ revision: 9999 })
          .eq('user_id', userA.userId);
        // 正常情况：RLS 过滤后零行更新（无 error），且云端值不变
        const { data: check } = await userB.client
          .from('user_bookmarks').select('revision').eq('user_id', userA.userId);
        assert(!crossWriteError, `跨用户 UPDATE 不应报 error: ${crossWriteError?.message}`);
        assert(check?.length === 0, 'RLS 过滤后用户 B 看不到用户 A 的行');
        pass('REQ-004-AC-003', '用户 B 无法读写用户 A 的行（RLS）', { crossRows: check?.length });
      } catch (e) { fail('REQ-004-AC-003', '跨用户写入拒绝', e.message); }
    } else {
      fail('REQ-004-AC-003', '跨用户写入拒绝', 'SKIP: 依赖用户 B 登录失败');
    }

    // REQ-004-AC-004：signOut 后无法 INSERT
    try {
      const { error: insertAfterOut } = await userA.client
        .from('user_bookmarks').insert({ data: emptyLibrary, schema_version: 1, revision: 0 });
      assert(insertAfterOut, 'signOut 后 INSERT 应被拒绝');
      pass('REQ-004-AC-004', 'signOut 后 INSERT 被拒绝', { code: insertAfterOut.code });
    } catch (e) { fail('REQ-004-AC-004', 'signOut 后 INSERT 被拒绝', e.message); }
  }

  // ══════════════════════════════════════════════════════════════
  // 汇总
  // ══════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────────');
  console.log(`结果：${passCount} PASS  ${failCount} FAIL`);
  console.log('────────────────────────────────────────────────────────────');

  if (failCount > 0) {
    console.error('\n❌ 以下 AC 未通过：');
    results.filter(r => r.status === 'FAIL').forEach(r =>
      console.error(`  - ${r.id}: ${r.label} — ${r.error}`)
    );
    process.exit(1);
  }
  console.log('\n✅ 所有远程 Supabase 验收 AC 通过');
}

runTests().catch(err => {
  console.error('BLOCKED or FATAL:', err.message ?? err);
  process.exit(1);
});
