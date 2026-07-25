import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const versionPattern = /^(\s*)version "[^"]+"$/gm;
const sha256Pattern = /^(\s*)sha256 "[^"]+"$/gm;

export function normalizeReleaseTag(tag) {
  const normalizedTag = String(tag ?? '').trim();
  const match = normalizedTag.match(/^v?(\d+\.\d+\.\d+)$/);

  if (!match) {
    throw new Error('Invalid release tag: expected vX.Y.Z or X.Y.Z');
  }

  return match[1];
}

export function validateSha256(sha256) {
  const normalizedSha256 = String(sha256 ?? '').trim();

  if (!/^[a-f0-9]{64}$/.test(normalizedSha256)) {
    throw new Error('Invalid SHA256: expected 64 lowercase hexadecimal characters');
  }

  return normalizedSha256;
}

function replaceUniqueStanza(content, pattern, replacementFactory, stanzaName) {
  const matches = [...content.matchAll(pattern)];

  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${stanzaName} stanza, found ${matches.length}`);
  }

  pattern.lastIndex = 0;
  return content.replace(pattern, (...args) => replacementFactory(args[1]));
}

export function updateCaskContent(content, { tag, sha256 }) {
  const version = normalizeReleaseTag(tag);
  const normalizedSha256 = validateSha256(sha256);
  const versionUpdated = replaceUniqueStanza(
    content,
    versionPattern,
    (indentation) => `${indentation}version "${version}"`,
    'version'
  );
  const updatedContent = replaceUniqueStanza(
    versionUpdated,
    sha256Pattern,
    (indentation) => `${indentation}sha256 "${normalizedSha256}"`,
    'sha256'
  );

  return {
    changed: updatedContent !== content,
    content: updatedContent,
    sha256: normalizedSha256,
    version,
  };
}

function parseArguments(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];

    if (!name?.startsWith('--') || value === undefined) {
      throw new Error('Usage: update-homebrew-cask.mjs --cask <path> --tag <vX.Y.Z> --sha256 <hash>');
    }

    options[name.slice(2)] = value;
  }

  if (!options.cask || !options.tag || !options.sha256) {
    throw new Error('Usage: update-homebrew-cask.mjs --cask <path> --tag <vX.Y.Z> --sha256 <hash>');
  }

  return options;
}

export async function runCli(args) {
  const options = parseArguments(args);
  const caskPath = resolve(options.cask);
  const content = await readFile(caskPath, 'utf8');
  const result = updateCaskContent(content, options);

  if (result.changed) {
    await writeFile(caskPath, result.content, 'utf8');
  }

  return result;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';

if (invokedPath === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2))
    .then((result) => {
      const message = result.changed
        ? `Updated Homebrew Cask to ${result.version}`
        : `Homebrew Cask ${result.version} is already up to date`;
      console.log(message);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
