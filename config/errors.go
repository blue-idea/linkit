package config

const (
	ErrorCodeInvalidArgument  = "INVALID_ARGUMENT"
	ErrorCodeDocumentInvalid  = "DOCUMENT_INVALID"
	ErrorCodeSettingsInvalid  = "SETTINGS_INVALID"
	ErrorCodeImportInvalid        = "IMPORT_INVALID"
	ErrorCodeExportInvalid        = "EXPORT_INVALID"
	ErrorCodeURLInvalid          = "URL_INVALID"
	ErrorCodeMetadataFetchFailed = "METADATA_FETCH_FAILED"
	ErrorCodeExternalOpenFailed  = "EXTERNAL_OPEN_FAILED"
	ErrorCodeLocalReadFailed     = "LOCAL_READ_FAILED"
	ErrorCodeLocalWriteFailed    = "LOCAL_WRITE_FAILED"

	ErrorMessageInvalidArgument     = "Invalid local document request"
	ErrorMessageDocumentInvalid     = "Library document is invalid"
	ErrorMessageSettingsInvalid     = "Settings document is invalid"
	ErrorMessageImportInvalid       = "Import file is invalid"
	ErrorMessageExportInvalid       = "Export document is invalid"
	ErrorMessageURLInvalid          = "URL must use HTTP or HTTPS"
	ErrorMessageMetadataFetchFailed = "Failed to fetch page metadata"
	ErrorMessageExternalOpenFailed  = "Failed to open URL in system browser"
	ErrorMessageLocalReadFailed     = "Failed to read local document"
	ErrorMessageLocalWriteFailed    = "Failed to write local document"
	ErrorMessageCloudDraftDirty     = "Cloud draft is dirty"
)
