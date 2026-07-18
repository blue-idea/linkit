package config

const (
	ErrorCodeInvalidArgument  = "INVALID_ARGUMENT"
	ErrorCodeDocumentInvalid  = "DOCUMENT_INVALID"
	ErrorCodeLocalReadFailed  = "LOCAL_READ_FAILED"
	ErrorCodeLocalWriteFailed = "LOCAL_WRITE_FAILED"

	ErrorMessageInvalidArgument  = "Invalid local document request"
	ErrorMessageDocumentInvalid  = "Library document is invalid"
	ErrorMessageLocalReadFailed  = "Failed to read local document"
	ErrorMessageLocalWriteFailed = "Failed to write local document"
	ErrorMessageCloudDraftDirty  = "Cloud draft is dirty"
)
