import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const uiDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(uiDirectory, '..');

async function readRepositoryFile(relativePath) {
  return readFile(resolve(repositoryRoot, relativePath), 'utf8');
}

async function verifyPackageScripts() {
  const packageJson = JSON.parse(await readRepositoryFile('ui/package.json'));

  assert.equal(
    packageJson.scripts?.prepare,
    'cd .. && husky ui/.husky',
    'Husky prepare script is missing'
  );
  assert.equal(
    packageJson.scripts?.['lint:staged'],
    'lint-staged --config ../config/lint-staged.mjs',
    'lint-staged script is missing'
  );
  assert.equal(
    packageJson.scripts?.['verify:quality-config'],
    'node verify-quality-config.mjs',
    'Quality configuration verification script is missing'
  );
  assert.equal(packageJson.devDependencies?.husky, '9.1.7', 'Husky version is not pinned');
  assert.equal(
    packageJson.devDependencies?.['lint-staged'],
    '17.0.8',
    'lint-staged version is not pinned'
  );
}

async function verifyHooks() {
  const preCommit = await readRepositoryFile('ui/.husky/pre-commit');
  const prePush = await readRepositoryFile('ui/.husky/pre-push');

  assert.match(preCommit, /pnpm --dir ui lint:staged/, 'pre-commit must run lint-staged');
  assert.match(preCommit, /pnpm --dir ui typecheck/, 'pre-commit must run typecheck');
  assert.match(prePush, /pnpm --dir ui quality/, 'pre-push must run frontend quality checks');
  assert.match(prePush, /go vet \.\/\.\.\./, 'pre-push must run go vet');
  assert.match(prePush, /go test \.\/\.\.\./, 'pre-push must run Go tests');
}

async function verifyWorkflows() {
  const ciWorkflow = await readRepositoryFile('.github/workflows/ci.yml');
  const desktopBuildWorkflow = await readRepositoryFile('.github/workflows/desktop-build.yml');
  const releaseWorkflow = await readRepositoryFile('.github/workflows/release.yml');

  assert.match(ciWorkflow, /permissions:\s*\n\s*contents: read/, 'CI permissions must be read-only');
  assert.match(ciWorkflow, /pnpm --dir ui audit --audit-level high/, 'CI must scan Node dependencies');
  assert.match(ciWorkflow, /go vet \.\/\.\.\./, 'CI must run go vet');
  assert.match(ciWorkflow, /go test \.\/\.\.\./, 'CI must run Go tests');
  assert.match(desktopBuildWorkflow, /windows-latest/, 'CI must build on Windows');
  assert.match(desktopBuildWorkflow, /macos-latest/, 'CI must build on macOS');
  assert.match(
    desktopBuildWorkflow,
    /go run github\.com\/wailsapp\/wails\/v2\/cmd\/wails@\$\{\{ env\.WAILS_VERSION \}\} build -clean/,
    'Desktop workflow must build with the pinned Wails CLI'
  );
  assert.match(releaseWorkflow, /contents: write/, 'Release workflow must declare write permission');
  assert.match(releaseWorkflow, /gh release create/, 'Release workflow must publish a GitHub release');
}

async function verifyTestFramework() {
  const packageJson = JSON.parse(await readRepositoryFile('ui/package.json'));

  for (const script of ['test', 'test:coverage', 'test:e2e', 'test:visual']) {
    assert.ok(packageJson.scripts?.[script], `Missing package script: ${script}`);
  }

  for (const dependency of [
    'vitest',
    '@vitest/coverage-v8',
    '@testing-library/react',
    '@playwright/test',
    '@axe-core/playwright',
  ]) {
    assert.ok(packageJson.devDependencies?.[dependency], `Missing devDependency: ${dependency}`);
  }

  const vitestConfig = await readRepositoryFile('ui/vitest.config.ts');
  const playwrightConfig = await readRepositoryFile('ui/playwright.config.ts');
  const coverageConfig = await readRepositoryFile('config/test/coverage.mjs');

  assert.match(vitestConfig, /jsdom/, 'Vitest must use jsdom');
  assert.match(playwrightConfig, /webServer/, 'Playwright must configure a dev webServer');
  assert.match(coverageConfig, /provider: 'v8'/, 'Coverage must use the V8 provider');
}

await verifyPackageScripts();
await verifyHooks();
await verifyWorkflows();
await verifyTestFramework();

console.log('Quality configuration is valid');
