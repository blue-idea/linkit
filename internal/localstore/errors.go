package localstore

type ServiceError struct {
	code      string
	message   string
	retryable bool
	cause     error
}

func newServiceError(code string, message string, retryable bool, cause error) *ServiceError {
	return &ServiceError{code: code, message: message, retryable: retryable, cause: cause}
}

func (serviceError *ServiceError) Error() string {
	return serviceError.message
}

func (serviceError *ServiceError) Unwrap() error {
	return serviceError.cause
}

func (serviceError *ServiceError) ErrorCode() string {
	return serviceError.code
}

func (serviceError *ServiceError) IsRetryable() bool {
	return serviceError.retryable
}
