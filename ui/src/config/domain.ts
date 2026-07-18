export const DOMAIN_CONFIG = {
  errors: {
    bookmarkNotFound: {
      code: 'BOOKMARK_NOT_FOUND',
      message: 'Bookmark was not found',
    },
    collectionNotFound: {
      code: 'COLLECTION_NOT_FOUND',
      message: 'Collection was not found',
    },
  },
  events: {
    collectionMembershipChanged: 'bookmark.collection-membership.changed',
  },
} as const;
