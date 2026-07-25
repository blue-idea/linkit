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
  assert.equal(
    packageJson.scripts?.['test:homebrew-tap'],
    'node --test ../scripts/update-homebrew-cask.test.mjs',
    'Homebrew Tap test script is missing'
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
  const nfpmConfig = await readRepositoryFile('nfpm.yaml');
  const linuxDesktopEntry = await readRepositoryFile('build/linux/linkit.desktop');

  assert.match(ciWorkflow, /permissions:\s*\n\s*contents: read/, 'CI permissions must be read-only');
  assert.match(ciWorkflow, /pnpm --dir ui audit --audit-level high/, 'CI must scan Node dependencies');
  assert.match(ciWorkflow, /go vet \.\/\.\.\./, 'CI must run go vet');
  assert.match(ciWorkflow, /go test \.\/\.\.\./, 'CI must run Go tests');
  assert.match(desktopBuildWorkflow, /ubuntu-24\.04/, 'CI must build on Linux');
  assert.match(desktopBuildWorkflow, /windows-latest/, 'CI must build on Windows');
  assert.match(desktopBuildWorkflow, /macos-latest/, 'CI must build on macOS');
  assert.match(
    desktopBuildWorkflow,
    /go run github\.com\/wailsapp\/wails\/v2\/cmd\/wails@\$\{\{ env\.WAILS_VERSION \}\} build -clean/,
    'Desktop workflow must build with the pinned Wails CLI'
  );
  assert.match(releaseWorkflow, /contents: write/, 'Release workflow must declare write permission');
  assert.match(releaseWorkflow, /gh release create/, 'Release workflow must publish a GitHub release');
  assert.match(releaseWorkflow, /linux\/amd64/, 'Release workflow must build Linux amd64');
  assert.match(releaseWorkflow, /NFPM_VERSION:/, 'Release workflow must pin nFPM version');
  assert.match(releaseWorkflow, /goreleaser\/nfpm\/v2\/cmd\/nfpm/, 'Release workflow must install pinned nFPM');
  assert.match(releaseWorkflow, /nfpm pkg --packager deb/, 'Release workflow must build Debian packages');
  assert.match(releaseWorkflow, /linkit_\$\{\{ env\.RELEASE_TAG \}\}_\$\{\{ matrix\.deb_arch \}\}\.deb/, 'Release workflow must produce architecture-specific deb artifacts');
  assert.match(releaseWorkflow, /^  update-homebrew-tap:$/m, 'Release workflow must define the Homebrew Tap update job');
  assert.match(releaseWorkflow, /needs: release/, 'Homebrew Tap update must wait for the release matrix');
  assert.match(releaseWorkflow, /TAP_GITHUB_TOKEN/, 'Homebrew Tap update must use the repository secret');
  assert.match(releaseWorkflow, /gh release download/, 'Homebrew Tap update must download the published DMG');
  assert.match(releaseWorkflow, /update-homebrew-cask\.mjs/, 'Homebrew Tap update must use the tested updater');
  assert.match(releaseWorkflow, /git diff --quiet/, 'Homebrew Tap update must avoid empty commits');
  assert.match(releaseWorkflow, /--add-file "Fix Gatekeeper\.command"/, 'Release workflow must embed Fix Gatekeeper script in DMG');

  const gatekeeperScript = await readRepositoryFile('scripts/Fix Gatekeeper.command');
  assert.match(gatekeeperScript, /xattr -dr com\.apple\.quarantine/, 'Gatekeeper script must execute xattr quarantine removal');

  assert.match(nfpmConfig, /^name: linkit$/m, 'nFPM package name must be linkit');
  assert.match(nfpmConfig, /^arch: \$\{NFPM_ARCH\}$/m, 'nFPM architecture must come from NFPM_ARCH');
  assert.match(nfpmConfig, /^version: \$\{PACKAGE_VERSION\}$/m, 'nFPM version must come from PACKAGE_VERSION');
  assert.match(nfpmConfig, /src: \.\/build\/bin\/linkit/, 'nFPM must package the Linux binary');
  assert.match(nfpmConfig, /dst: \/usr\/bin\/linkit/, 'nFPM must install the binary into /usr/bin');
  assert.match(nfpmConfig, /libgtk-3-0/, 'nFPM must declare GTK runtime dependency');
  assert.match(nfpmConfig, /libwebkit2gtk-4\.1-0|libwebkit2gtk-4\.0-37/, 'nFPM must declare WebKitGTK runtime dependency');
  assert.match(linuxDesktopEntry, /^Exec=linkit$/m, 'Linux desktop entry must launch linkit');
  assert.match(linuxDesktopEntry, /^Icon=linkit$/m, 'Linux desktop entry must reference the linkit icon');
}

async function verifyHomebrewTap() {
  const tapConfig = JSON.parse(await readRepositoryFile('config/homebrew-tap.json'));
  const cask = await readRepositoryFile('homebrew-tap/Casks/linkit.rb');
  const tapReadme = await readRepositoryFile('homebrew-tap/README.md');
  const tapWorkflow = await readRepositoryFile('homebrew-tap/.github/workflows/ci.yml');
  const englishReadme = await readRepositoryFile('README.md');
  const chineseReadme = await readRepositoryFile('README.zh-CN.md');

  assert.deepEqual(tapConfig, {
    tapRepository: 'blue-idea/homebrew-tap',
    releaseRepository: 'blue-idea/collection',
    caskRelativePath: 'Casks/linkit.rb',
    releaseAsset: 'Linkit.dmg',
  });

  assert.match(cask, /^cask "linkit" do$/m, 'Cask token must be linkit');
  assert.match(cask, /^  version "0\.2\.2"$/m, 'Seed Cask must target the latest verified release');
  assert.match(
    cask,
    /^  sha256 "41ed2e929a23e415d40ee3c58b09f755dcf6d6e4976ccebec0fd0a3bee47741d"$/m,
    'Seed Cask SHA256 must match the published Linkit.dmg digest'
  );
  assert.match(cask, /releases\/download\/v#\{version\}\/Linkit\.dmg/, 'Cask URL must use the versioned universal DMG');
  assert.match(cask, /^  app "Linkit\.app"$/m, 'Cask must install Linkit.app');
  assert.match(cask, /strategy :github_latest/, 'Cask must use GitHub latest livecheck');
  assert.match(cask, /^  depends_on :macos$/m, 'Cask must declare its macOS-only platform dependency');
  assert.match(
    cask,
    /livecheck do[\s\S]*?^  end\r?\n\r?\n^  depends_on :macos\r?\n\r?\n^  app "Linkit\.app"$/m,
    'Cask livecheck, depends_on and app stanzas must follow Homebrew order'
  );
  assert.match(cask, /args: \["-dr", "com\.apple\.quarantine", "#\{appdir\}\/Linkit\.app"\]/, 'Cask must limit xattr to Linkit.app');
  assert.match(cask, /sudo: false/, 'Cask quarantine cleanup must not use sudo');
  assert.match(tapWorkflow, /runs-on: macos-latest/, 'Tap CI must use a real macOS runner');
  assert.match(tapWorkflow, /ruby -c Casks\/linkit\.rb/, 'Tap CI must validate Ruby syntax');
  assert.match(tapWorkflow, /brew style Casks\/linkit\.rb/, 'Tap CI must validate Homebrew style');
  assert.match(tapWorkflow, /brew tap blue-idea\/tap/, 'Tap CI must register the public Tap');
  assert.match(tapWorkflow, /brew install --cask blue-idea\/tap\/linkit/, 'Tap CI must use the public user installation command');
  assert.match(tapWorkflow, /xattr -p com\.apple\.quarantine/, 'Tap CI must verify quarantine cleanup');
  assert.match(tapWorkflow, /brew uninstall --cask linkit/, 'Tap CI must uninstall Linkit during cleanup');

  for (const readme of [tapReadme, englishReadme, chineseReadme]) {
    assert.match(readme, /brew install blue-idea\/tap\/linkit/, 'README must document the Homebrew install command');
    assert.match(readme, /brew upgrade linkit/, 'README must document the Homebrew upgrade command');
  }
  assert.match(englishReadme, /quarantine/i, 'English README must disclose quarantine cleanup');
  assert.match(chineseReadme, /隔离属性/, 'Chinese README must disclose quarantine cleanup');
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
await verifyHomebrewTap();
await verifyTestFramework();

console.log('Quality configuration is valid');
