import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const validSha256 = '0123456789abcdef'.repeat(4);
const execFileAsync = promisify(execFile);
const updaterPath = join(import.meta.dirname, 'update-homebrew-cask.mjs');

async function loadUpdater() {
  try {
    return await import(pathToFileURL(updaterPath).href);
  } catch (error) {
    assert.fail(`Homebrew Cask updater is unavailable: ${error.message}`);
  }
}

function createCask({ version = '0.2.2', sha256 = 'f'.repeat(64) } = {}) {
  return `cask "linkit" do
  version "${version}"
  sha256 "${sha256}"

  url "https://github.com/blue-idea/collection/releases/download/v#{version}/Linkit.dmg"
  app "Linkit.app"
end
`;
}

test('REQ-032-AC-004：版本规范化仅接受 vX.Y.Z 发布标签', async () => {
  const { normalizeReleaseTag } = await loadUpdater();

  assert.equal(normalizeReleaseTag('v1.2.3'), '1.2.3');
  assert.equal(normalizeReleaseTag('1.2.3'), '1.2.3');
  assert.throws(() => normalizeReleaseTag('release-1.2.3'), /Invalid release tag/);
});

test('REQ-032-AC-005：SHA256 校验拒绝占位值、大写与错误长度', async () => {
  const { validateSha256 } = await loadUpdater();

  assert.equal(validateSha256(validSha256), validSha256);
  assert.throws(() => validateSha256('ARM64_RELEASE_DMG_SHA256_HASH'), /Invalid SHA256/);
  assert.throws(() => validateSha256(validSha256.toUpperCase()), /Invalid SHA256/);
  assert.throws(() => validateSha256('a'.repeat(63)), /Invalid SHA256/);
});

test('REQ-032-AC-004：更新器只替换唯一 version 与 sha256 stanza', async () => {
  const { updateCaskContent } = await loadUpdater();

  const result = updateCaskContent(createCask(), {
    tag: 'v1.4.0',
    sha256: validSha256,
  });

  assert.equal(result.version, '1.4.0');
  assert.equal(result.changed, true);
  assert.match(result.content, /^  version "1\.4\.0"$/m);
  assert.match(result.content, new RegExp(`^  sha256 "${validSha256}"$`, 'm'));
  assert.equal((result.content.match(/^  version /gm) ?? []).length, 1);
  assert.equal((result.content.match(/^  sha256 /gm) ?? []).length, 1);
});

test('REQ-032-AC-005：Cask stanza 重复时更新器失败且不猜测目标', async () => {
  const { updateCaskContent } = await loadUpdater();
  const duplicateVersion = `${createCask()}\n  version "9.9.9"\n`;

  assert.throws(
    () => updateCaskContent(duplicateVersion, { tag: 'v1.4.0', sha256: validSha256 }),
    /Expected exactly one version stanza/
  );
});

test('REQ-032-AC-004：相同版本与哈希重复执行保持幂等', async () => {
  const { updateCaskContent } = await loadUpdater();
  const content = createCask({ version: '1.4.0', sha256: validSha256 });

  const result = updateCaskContent(content, { tag: 'v1.4.0', sha256: validSha256 });

  assert.equal(result.changed, false);
  assert.equal(result.content, content);
});

test('REQ-032-AC-004：CLI 只在内容变化时写回 Cask 文件', async () => {
  const { runCli } = await loadUpdater();
  const testDirectory = await mkdtemp(join(tmpdir(), 'linkit-homebrew-cask-'));
  const caskPath = join(testDirectory, 'linkit.rb');

  try {
    await writeFile(caskPath, createCask(), 'utf8');

    const first = await runCli([
      '--cask',
      caskPath,
      '--tag',
      'v1.4.0',
      '--sha256',
      validSha256,
    ]);
    const updated = await readFile(caskPath, 'utf8');
    const second = await runCli([
      '--cask',
      caskPath,
      '--tag',
      'v1.4.0',
      '--sha256',
      validSha256,
    ]);

    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
    assert.match(updated, /^  version "1\.4\.0"$/m);
    assert.match(updated, new RegExp(`^  sha256 "${validSha256}"$`, 'm'));
  } finally {
    await rm(testDirectory, { recursive: true, force: true });
  }
});

test('REQ-032-AC-004：直接执行 CLI 输出更新与幂等状态', async () => {
  const testDirectory = await mkdtemp(join(tmpdir(), 'linkit-homebrew-cask-process-'));
  const caskPath = join(testDirectory, 'linkit.rb');

  try {
    await writeFile(caskPath, createCask(), 'utf8');
    const argumentsList = [
      updaterPath,
      '--cask',
      caskPath,
      '--tag',
      'v1.4.0',
      '--sha256',
      validSha256,
    ];

    const first = await execFileAsync(process.execPath, argumentsList);
    const second = await execFileAsync(process.execPath, argumentsList);

    assert.match(first.stdout, /Updated Homebrew Cask to 1\.4\.0/);
    assert.match(second.stdout, /Homebrew Cask 1\.4\.0 is already up to date/);
  } finally {
    await rm(testDirectory, { recursive: true, force: true });
  }
});

test('REQ-032-AC-005：CLI 参数缺失时以英文错误和非零状态终止', async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [updaterPath, '--cask', 'missing.rb']),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Usage: update-homebrew-cask\.mjs/);
      return true;
    }
  );
});
