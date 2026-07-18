/**
 * REQ-003-AC-005：expectedRevision 条件更新与零行冲突映射。
 * 使用真实本地 Supabase Auth + PostgREST，语义对齐 CloudRepository.save。
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

const FIXED_TS = '2026-07-18T10:00:00.000Z';

/** 最小合法 LibraryData，满足 Zod 与关系约束。 */
const validLibraryData = {
  bookmarks: [
    {
      id: 'bookmark-revision-api',
      title: 'Revision API bookmark',
      url: 'https://example.test/revision-api',
      domain: 'example.test',
      favicon: null,
      description: '',
      notes: '',
      tagIds: ['tag-revision-api'],
      categoryId: 'category-revision-api',
      collectionIds: ['collection-revision-api'],
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
    },
  ],
  categories: [
    {
      id: 'category-revision-api',
      name: 'Revision',
      icon: 'Bookmark',
      parentId: null,
      color: 'blue',
    },
  ],
  collections: [
    {
      id: 'collection-revision-api',
      name: 'Revision collection',
      emoji: '📚',
      color: 'blue',
      description: '',
      bookmarkIds: ['bookmark-revision-api'],
      createdAt: FIXED_TS,
      updatedAt: FIXED_TS,
    },
  ],
  tags: [{ id: 'tag-revision-api', label: 'Revision', color: 'blue' }],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

/**
 * 与 CloudRepository.save 相同的条件更新语义：
 * 返回一行 → 成功；零行无错误 → CLOUD_REVISION_CONFLICT。
 */
async function conditionalSave(client, userId, expectedRevision, data) {
  const nextRevision = expectedRevision + 1;
  const { data: row, error } = await client
    .from('user_bookmarks')
    .update({
      data,
      schema_version: 1,
      revision: nextRevision,
    })
    .eq('user_id', userId)
    .eq('revision', expectedRevision)
    .select('revision,updated_at')
    .maybeSingle();

  if (error) {
    return { ok: false, code: 'CLOUD_REQUEST_FAILED', message: error.message };
  }
  if (!row) {
    return { ok: false, code: 'CLOUD_REVISION_CONFLICT', message: 'Library revision conflict' };
  }
  return { ok: true, revision: row.revision, updatedAt: row.updated_at };
}

async function main() {
  const failures = [];
  const userA = await signIn(USER_A.email, USER_A.password);

  // 读取当前 revision（seed 或前序测试后的状态）
  const { data: rows, error: readError } = await userA.client
    .from('user_bookmarks')
    .select('revision')
    .eq('user_id', userA.userId);
  assert(!readError, `读取失败: ${readError?.message}`);
  assert(rows?.length === 1, `期望 1 行，实际 ${rows?.length}`);
  const baseRevision = Number(rows[0].revision);

  // REQ-003-AC-005 happy path：匹配 revision 的条件更新成功
  {
    try {
      const result = await conditionalSave(
        userA.client,
        userA.userId,
        baseRevision,
        validLibraryData
      );
      assert(result.ok, `期望保存成功，实际 ${result.code}: ${result.message}`);
      assert(result.revision === baseRevision + 1, `revision 应变为 ${baseRevision + 1}`);
      console.log('PASS REQ-003-AC-005 revision 条件更新成功', {
        from: baseRevision,
        to: result.revision,
      });
    } catch (err) {
      failures.push(err.message);
      console.error('FAIL REQ-003-AC-005 happy path', err.message);
    }
  }

  // REQ-003-AC-005：使用陈旧 expectedRevision → 零行 → CLOUD_REVISION_CONFLICT
  {
    try {
      const stale = await conditionalSave(
        userA.client,
        userA.userId,
        baseRevision,
        validLibraryData
      );
      assert(!stale.ok, '陈旧 revision 不应保存成功');
      assert(
        stale.code === 'CLOUD_REVISION_CONFLICT',
        `期望 CLOUD_REVISION_CONFLICT，实际 ${stale.code}`
      );

      // 确认云端 revision 未被错误覆盖
      const { data: after, error: afterError } = await userA.client
        .from('user_bookmarks')
        .select('revision')
        .eq('user_id', userA.userId)
        .maybeSingle();
      assert(!afterError, `冲突后读取失败: ${afterError?.message}`);
      assert(
        Number(after.revision) === baseRevision + 1,
        `冲突后 revision 应保持 ${baseRevision + 1}，实际 ${after.revision}`
      );
      console.log('PASS REQ-003-AC-005 零行更新映射 CLOUD_REVISION_CONFLICT', {
        staleExpected: baseRevision,
        cloudRevision: after.revision,
      });
    } catch (err) {
      failures.push(err.message);
      console.error('FAIL REQ-003-AC-005 conflict', err.message);
    }
  }

  // 用户 A 会话读取本人行仍成功（REQ-003-AC-002 回归）
  {
    try {
      const { data, error, status } = await userA.client
        .from('user_bookmarks')
        .select('user_id,revision,schema_version')
        .eq('user_id', userA.userId);
      assert(!error, `本人读取失败: ${error?.message}`);
      assert(status === 200, `期望 200，实际 ${status}`);
      assert(data?.length === 1 && data[0].user_id === userA.userId, '本人行必须可读');
      console.log('PASS REQ-003-AC-002 revision 后本人可读');
    } catch (err) {
      failures.push(err.message);
      console.error('FAIL REQ-003-AC-002', err.message);
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} failing assertion(s)`);
    process.exit(1);
  }
  console.log('\nAll Supabase revision API checks passed');
}

main().catch((err) => {
  console.error('BLOCKED or FATAL:', err.message ?? err);
  process.exit(1);
});
