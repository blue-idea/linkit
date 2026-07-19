import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 加载本机测试环境文件；已存在的进程环境变量优先。 */
export function loadTestEnv(environment = process.env) {
  const directory = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(directory, '../.env.test');
  if (!existsSync(envPath)) return environment;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!environment[key] && value) environment[key] = value;
  }
  return environment;
}

export function readRequiredEnv(name, environment = process.env) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Required environment variable ${name} is not configured`);
  return value;
}

export function resolveSupabaseTestConfig(environment = loadTestEnv()) {
  const anonKey = environment.LINKIT_TEST_SUPABASE_PUBLISHABLE_KEY?.trim()
    || environment.LINKIT_TEST_SUPABASE_ANON_KEY?.trim();
  if (!anonKey) {
    throw new Error('Required environment variable LINKIT_TEST_SUPABASE_PUBLISHABLE_KEY is not configured');
  }
  return {
    apiUrl: environment.LINKIT_TEST_SUPABASE_URL?.trim() || 'http://127.0.0.1:54321',
    anonKey,
  };
}
