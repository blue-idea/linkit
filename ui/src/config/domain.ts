export const DOMAIN_CONFIG = {
  errors: {
    bookmarkNotFound: {
      code: 'BOOKMARK_NOT_FOUND',
      message: 'Bookmark was not found',
    },
    bookmarkUrlInvalid: {
      code: 'BOOKMARK_URL_INVALID',
      message: 'Bookmark URL must be http or https',
    },
    collectionNotFound: {
      code: 'COLLECTION_NOT_FOUND',
      message: 'Collection was not found',
    },
    readStatusInvalid: {
      code: 'READ_STATUS_INVALID',
      message: 'Read status must be unread, reading, read or archived',
    },
  },
  events: {
    collectionMembershipChanged: 'bookmark.collection-membership.changed',
    bookmarkCreated: 'bookmark.created',
    bookmarkUpdated: 'bookmark.updated',
    bookmarkDeleted: 'bookmark.deleted',
    bookmarkStarredToggled: 'bookmark.starred.toggled',
    bookmarkPinnedToggled: 'bookmark.pinned.toggled',
    bookmarkReadStatusChanged: 'bookmark.read-status.changed',
    bookmarkVisited: 'bookmark.visited',
  },
} as const;
