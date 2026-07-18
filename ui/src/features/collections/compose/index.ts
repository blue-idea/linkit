import { DOMAIN_CONFIG } from '../../../config/domain';
import { createCollection } from '../../../domain/collections';
import { setBookmarkCollectionMembership } from '../../../domain/commands';
import type { LibraryData } from '../../../domain/library';
import type { CommandResult } from '../../../domain/commands/types';

export type ComposePreviewMember = {
  id: string;
  title: string;
};

export type ComposePreview = {
  bookmarkIds: string[];
  members: ComposePreviewMember[];
};

export type ComposePreviewResult =
  | ComposePreview
  | { ok: false; error: { code: string; message: string } };

export type ConfirmComposeInput = {
  name: string;
  emoji?: string;
  color?: LibraryData['collections'][number]['color'];
  description?: string;
  bookmarkIds: string[];
  idFactory?: () => string;
  now?: () => string;
};

function isErrorResult(
  value: ComposePreviewResult
): value is { ok: false; error: { code: string; message: string } } {
  return 'ok' in value && value.ok === false;
}

/**
 * 构建主题组合预览；确认前不修改资料库。
 * REQ-013-AC-001
 */
export function buildComposePreview(
  selectedIds: string[],
  bookmarks: LibraryData['bookmarks']
): ComposePreviewResult {
  const uniqueIds = [...new Set(selectedIds.filter(Boolean))];
  if (uniqueIds.length < 2) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.composeSelectionTooSmall } };
  }

  const byId = new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark]));
  const members: ComposePreviewMember[] = [];
  for (const id of uniqueIds) {
    const bookmark = byId.get(id);
    if (!bookmark) {
      return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };
    }
    members.push({ id: bookmark.id, title: bookmark.title });
  }

  return { bookmarkIds: uniqueIds, members };
}

/**
 * 确认创建主题并一次写入全部双向成员关系。
 * REQ-013-AC-002 / REQ-026-AC-003
 */
export function confirmComposeCollection(
  library: LibraryData,
  input: ConfirmComposeInput
): CommandResult<LibraryData> {
  const preview = buildComposePreview(input.bookmarkIds, library.bookmarks);
  if (isErrorResult(preview)) {
    return preview;
  }

  const created = createCollection(library, {
    name: input.name,
    emoji: input.emoji,
    color: input.color,
    description: input.description,
    idFactory: input.idFactory,
    now: input.now,
  });
  if (!created.ok) return created;

  const collectionId = created.events[0]?.payload.collectionId;
  if (typeof collectionId !== 'string' || !collectionId) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.collectionNotFound } };
  }

  let next = created.value;
  for (const bookmarkId of preview.bookmarkIds) {
    const membership = setBookmarkCollectionMembership(next, {
      bookmarkId,
      collectionId,
      member: true,
    });
    if (!membership.ok) return membership;
    next = membership.value;
  }

  return {
    ok: true,
    value: next,
    events: [
      ...created.events,
      {
        type: DOMAIN_CONFIG.events.collectionComposed,
        payload: {
          collectionId,
          bookmarkIds: [...preview.bookmarkIds],
        },
      },
    ],
  };
}

/**
 * 取消组合预览；调用方不得写库。
 * REQ-013-AC-001（确认前无副作用）
 */
export function cancelCompose(): { status: 'cancelled' } {
  return { status: 'cancelled' };
}
