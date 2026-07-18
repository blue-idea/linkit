package config

const (
	// AppDataDirectoryName 是平台配置目录下的应用子目录名。
	AppDataDirectoryName = "Linkit"
	// MaxDocumentBytes 限制资料库与云草稿的单文件大小为 64 MiB。
	MaxDocumentBytes int64 = 64 * 1024 * 1024

	LibraryFileName         = "library.json"
	LibraryBackupName       = "library.json.bak"
	LibraryTemporaryName    = "library.json.tmp"
	CloudDraftFileName      = "cloud-draft.json"
	CloudDraftTemporaryName = "cloud-draft.json.tmp"
)
