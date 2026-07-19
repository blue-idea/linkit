import assert from 'node:assert/strict';
import test from 'node:test';
import { readRequiredEnv, resolveSupabaseTestConfig } from './test-env.mjs';

test('缺少必需环境变量时返回不含敏感值的英文错误', () => {
  assert.throws(
    () => readRequiredEnv('LINKIT_TEST_MISSING', {}),
    (error) => error instanceof Error
      && error.message === 'Required environment variable LINKIT_TEST_MISSING is not configured',
  );
});

test('Supabase 测试配置只从环境变量读取 publishable key', () => {
  const config = resolveSupabaseTestConfig({
    LINKIT_TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
    LINKIT_TEST_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-value',
  });
  assert.equal(config.apiUrl, 'http://127.0.0.1:54321');
  assert.equal(config.anonKey, 'test-publishable-value');
});
