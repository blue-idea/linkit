export const AUTH_CONFIG = {
  errors: {
    notConfigured: {
      code: 'AUTH_NOT_CONFIGURED',
      message: 'Cloud auth is not configured',
      retryable: false,
    },
    invalidCredentials: {
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid login credentials',
      retryable: false,
    },
    requestFailed: {
      code: 'CLOUD_REQUEST_FAILED',
      message: 'Authentication request failed',
      retryable: true,
    },
  },
} as const;
