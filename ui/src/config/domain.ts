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
    collectionNameInvalid: {
      code: 'COLLECTION_NAME_INVALID',
      message: 'Collection name is required',
    },
    collectionEmojiInvalid: {
      code: 'COLLECTION_EMOJI_INVALID',
      message: 'Collection emoji is required',
    },
    readStatusInvalid: {
      code: 'READ_STATUS_INVALID',
      message: 'Read status must be unread, reading, read or archived',
    },
    categoryNotFound: {
      code: 'CATEGORY_NOT_FOUND',
      message: 'Category was not found',
    },
    categoryNameInvalid: {
      code: 'CATEGORY_NAME_INVALID',
      message: 'Category name is required',
    },
    categoryParentInvalid: {
      code: 'CATEGORY_PARENT_INVALID',
      message: 'Category parent is invalid',
    },
    categoryRecursiveConfirmRequired: {
      code: 'CATEGORY_RECURSIVE_CONFIRM_REQUIRED',
      message: 'Recursive category delete requires a second confirmation',
    },
  },
  events: {
    collectionMembershipChanged: 'bookmark.collection-membership.changed',
    collectionCreated: 'collection.created',
    collectionUpdated: 'collection.updated',
    collectionDeleted: 'collection.deleted',
    bookmarkCreated: 'bookmark.created',
    bookmarkUpdated: 'bookmark.updated',
    bookmarkDeleted: 'bookmark.deleted',
    bookmarkStarredToggled: 'bookmark.starred.toggled',
    bookmarkPinnedToggled: 'bookmark.pinned.toggled',
    bookmarkReadStatusChanged: 'bookmark.read-status.changed',
    bookmarkVisited: 'bookmark.visited',
    categoryCreated: 'category.created',
    categoryRenamed: 'category.renamed',
    categoryDeleted: 'category.deleted',
  },
} as const;
