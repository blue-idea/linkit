import { z } from 'zod';
import { createCollection } from '../../../domain/collections';
import { setBookmarkCollectionMembership } from '../../../domain/commands';
import type { LibraryData } from '../../../domain/library';
import type { CommandResult } from '../../../domain/commands/types';
import { DOMAIN_CONFIG } from '../../../config/domain';

export interface CollectionSuggestion {
  name: string;
  description: string;
  suggestedTags: string[];
  bookmarkIds: string[];
}

export function collectionSuggestionSchema(candidateIds: string[]) {
  const allowed = new Set(candidateIds);
  return z.object({
    name: z.string().trim().min(1),
    description: z.string(),
    suggestedTags: z.array(z.string().trim().min(1).max(64)),
    bookmarkIds: z.array(z.string().refine((id) => allowed.has(id), 'Bookmark is outside the current library')),
  });
}

type GoAIService = { GenerateCollection?: (request: unknown) => Promise<unknown> };

/** 调用 Wails AI 主题生成，并在前端再次约束返回成员必须来自候选集。 */
export async function generateCollectionPreview(input: {
  context: { apiBase: string; model: string; locale: 'en' | 'zh' };
  goal: string;
  bookmarks: Array<{ id: string; title: string; description: string; tagLabels: string[] }>;
}): Promise<CollectionSuggestion> {
  const service = (window as unknown as { go?: { ai?: { Service?: GoAIService } } }).go?.ai?.Service;
  if (typeof service?.GenerateCollection !== 'function') {
    throw { code: 'AI_REQUEST_FAILED', message: 'AI service is unavailable in this environment' };
  }
  const payload = await service.GenerateCollection({
    context: input.context,
    goal: input.goal,
    bookmarkCandidates: input.bookmarks,
  });
  return collectionSuggestionSchema(input.bookmarks.map(({ id }) => id)).parse(payload);
}

/** 用户确认前直接返回原资料库；确认后复用领域命令建立双向成员关系。 */
export function applyCollectionSuggestion(
  library: LibraryData,
  input: {
    preview: CollectionSuggestion;
    confirmed: boolean;
    acceptedBookmarkIds: string[];
    idFactory?: () => string;
    now?: () => string;
  },
): CommandResult<LibraryData> {
  if (!input.confirmed) return { ok: true, value: library, events: [] };
  const accepted = [...new Set(input.acceptedBookmarkIds)].filter((id) => input.preview.bookmarkIds.includes(id));
  if (accepted.some((id) => !library.bookmarks.some((bookmark) => bookmark.id === id))) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };
  }
  const created = createCollection(library, {
    name: input.preview.name,
    description: input.preview.description,
    idFactory: input.idFactory,
    now: input.now,
  });
  if (!created.ok) return created;
  const collectionId = created.value.collections[created.value.collections.length - 1]?.id;
  if (!collectionId) return { ok: false, error: { ...DOMAIN_CONFIG.errors.collectionNotFound } };

  let value = created.value;
  const events = [...created.events];
  for (const bookmarkId of accepted) {
    const membership = setBookmarkCollectionMembership(value, { bookmarkId, collectionId, member: true });
    if (!membership.ok) return membership;
    value = membership.value;
    events.push(...membership.events);
  }
  events.push({ type: DOMAIN_CONFIG.events.aiCollectionConfirmed, payload: { collectionId } });
  return { ok: true, value, events };
}
