import { TEST_DATA_CONFIG } from '../../config/test-data';
import type { LibraryEnvelope } from '../../domain/library';
import {
  createBookmark,
  createCategory,
  createCollection,
  createLibraryEnvelope,
  createTag,
} from '../factories';

export interface PerformanceDataOptions {
  bookmarkCount?: number;
  seed?: string;
}

const colors = ['blue', 'green', 'amber', 'coral', 'violet', 'gray'] as const;
const readStatuses = ['unread', 'reading', 'read', 'archived'] as const;
const healthStatuses = ['ok', 'changed', 'broken'] as const;

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function indexedId(prefix: string, seedToken: string, index: number): string {
  return `${prefix}-${seedToken}-${index.toString().padStart(5, '0')}`;
}

// REQ-026-AC-001~003、REQ-028-AC-005~007：生成可复现且引用完整的性能资料库。
export function generatePerformanceLibrary(options: PerformanceDataOptions = {}): LibraryEnvelope {
  const bookmarkCount = options.bookmarkCount ?? TEST_DATA_CONFIG.performanceBookmarkCount;
  if (!Number.isSafeInteger(bookmarkCount) || bookmarkCount < 0) {
    throw new Error(TEST_DATA_CONFIG.errors.invalidBookmarkCount);
  }
  const seed = options.seed ?? TEST_DATA_CONFIG.defaultPerformanceSeed;
  const seedHash = hashSeed(seed);
  const seedToken = seedHash.toString(36);
  const categoryOffset = seedHash % TEST_DATA_CONFIG.performanceCategoryCount;
  const collectionOffset = seedHash % TEST_DATA_CONFIG.performanceCollectionCount;
  const tagOffset = seedHash % TEST_DATA_CONFIG.performanceTagCount;

  const tags = Array.from({ length: TEST_DATA_CONFIG.performanceTagCount }, (_, index) => createTag({
    id: indexedId('tag', seedToken, index),
    label: `Performance tag ${index + 1}`,
    color: colors[index % colors.length],
  }));
  const categories = Array.from({ length: TEST_DATA_CONFIG.performanceCategoryCount }, (_, index) => createCategory({
    id: indexedId('category', seedToken, index),
    name: `Performance category ${index + 1}`,
    icon: 'Folder',
    parentId: null,
    color: colors[index % colors.length],
  }));
  const collectionBookmarkIds = Array.from(
    { length: TEST_DATA_CONFIG.performanceCollectionCount },
    () => [] as string[],
  );
  const bookmarks = Array.from({ length: bookmarkCount }, (_, index) => {
    const id = indexedId('bookmark', seedToken, index);
    const collectionIndex = (index + collectionOffset) % TEST_DATA_CONFIG.performanceCollectionCount;
    const collectionId = indexedId('collection', seedToken, collectionIndex);
    const primaryTagIndex = (index + tagOffset) % TEST_DATA_CONFIG.performanceTagCount;
    const secondaryTagIndex = (primaryTagIndex + 7) % TEST_DATA_CONFIG.performanceTagCount;
    const host = `source-${index % 100}.example.test`;
    const health = healthStatuses[(index + seedHash) % healthStatuses.length];
    collectionBookmarkIds[collectionIndex].push(id);

    return createBookmark({
      id,
      title: `Performance bookmark ${index + 1}`,
      url: `https://${host}/resource/${seedToken}/${index}`,
      domain: host,
      description: `Deterministic performance fixture ${index + 1}.`,
      notes: index % 5 === 0 ? 'Performance note' : '',
      tagIds: [
        indexedId('tag', seedToken, primaryTagIndex),
        indexedId('tag', seedToken, secondaryTagIndex),
      ],
      categoryId: indexedId(
        'category',
        seedToken,
        (index + categoryOffset) % TEST_DATA_CONFIG.performanceCategoryCount,
      ),
      collectionIds: [collectionId],
      visitCount: (index + seedHash) % 250,
      starred: index % 11 === 0,
      pinned: index % 37 === 0,
      readStatus: readStatuses[(index + seedHash) % readStatuses.length],
      health,
      healthCheckedAt: health === 'ok' ? null : TEST_DATA_CONFIG.fixedTimestamp,
      healthHttpStatus: health === 'broken' ? 404 : health === 'changed' ? 200 : null,
      healthFingerprint: health === 'ok' ? null : `fixture-${seedToken}-${index}`,
      healthErrorCode: health === 'broken' ? 'HTTP_NOT_FOUND' : null,
      aiSummary: index % 3 === 0 ? `Summary for performance bookmark ${index + 1}.` : '',
      aiSuggestedTags: index % 7 === 0 ? ['performance'] : [],
      thumbnail: colors[index % colors.length],
    });
  });
  const collections = collectionBookmarkIds.map((bookmarkIds, index) => createCollection({
    id: indexedId('collection', seedToken, index),
    name: `Performance collection ${index + 1}`,
    color: colors[index % colors.length],
    bookmarkIds,
  }));

  return createLibraryEnvelope({ bookmarks, categories, collections, tags });
}
