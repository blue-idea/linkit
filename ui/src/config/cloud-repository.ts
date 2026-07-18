/** CloudRepository 相关错误与草稿格式常量。 */
export const CLOUD_REPOSITORY_CONFIG = {
  draftFormat: 'linkit-cloud-draft' as const,
  errors: {
    authRequired: {
      code: 'CLOUD_AUTH_REQUIRED',
      message: 'Cloud authentication is required',
      retryable: false,
    },
    revisionConflict: {
      code: 'CLOUD_REVISION_CONFLICT',
      message: 'Library revision conflict',
      retryable: false,
    },
    requestFailed: {
      code: 'CLOUD_REQUEST_FAILED',
      message: 'Cloud request failed',
      retryable: true,
    },
    documentInvalid: {
      code: 'DOCUMENT_INVALID',
      message: 'Library document is invalid',
      retryable: false,
    },
  },
} as const;
