import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.lock']);
const detectors = [
  ['OpenAI-style key', /sk-[A-Za-z0-9_-]{20,}/g],
  ['JWT', /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const trackedFiles = execFileSync('git', ['-C', repositoryRoot, 'ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);
const findings = [];
for (const file of trackedFiles) {
  if (binaryExtensions.has(extname(file).toLowerCase())) continue;
  const content = readFileSync(resolve(repositoryRoot, file), 'utf8');
  for (const [name, pattern] of detectors) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push(`${name}: ${file}`);
  }
}

if (findings.length > 0) {
  console.error('Security scan found credential-like values:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log(`Security scan passed: ${trackedFiles.length} tracked files checked, no credential-like values found`);
}
