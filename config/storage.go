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
	SettingsFileName        = "settings.json"
	SettingsBackupName      = "settings.json.bak"
	SettingsTemporaryName   = "settings.json.tmp"
	// MaxSettingsBytes 限制本机设置文件大小；设置远小于资料库。
	MaxSettingsBytes int64 = 1 * 1024 * 1024
)
