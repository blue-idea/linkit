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
  },
  events: {
    collectionMembershipChanged: 'bookmark.collection-membership.changed',
    bookmarkCreated: 'bookmark.created',
    bookmarkUpdated: 'bookmark.updated',
    bookmarkDeleted: 'bookmark.deleted',
  },
} as const;
