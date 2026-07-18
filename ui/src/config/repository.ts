export const REPOSITORY_CONFIG = {
  errors: {
    documentInvalid: {
      code: 'DOCUMENT_INVALID',
      message: 'Library document is invalid',
      retryable: false,
    },
    revisionConflict: {
      code: 'CLOUD_REVISION_CONFLICT',
      message: 'Library revision conflict',
      retryable: false,
    },
  },
} as const;
