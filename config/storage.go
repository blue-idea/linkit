package config

const (
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
	// DataRootFileName 保存在引导根，指向有效数据根。
	DataRootFileName = "data-root.json"
	// DataRootFormat 是引导指针文件的固定 format。
	DataRootFormat = "linkit-data-root"
	// MaxSettingsBytes 限制本机设置文件大小；设置远小于资料库。
	MaxSettingsBytes int64 = 1 * 1024 * 1024
)

// MigratableDataFileNames 是目录迁移时允许复制/清理的应用数据文件白名单。
var MigratableDataFileNames = []string{
	LibraryFileName,
	LibraryBackupName,
	LibraryTemporaryName,
	CloudDraftFileName,
	CloudDraftTemporaryName,
	SettingsFileName,
	SettingsBackupName,
	SettingsTemporaryName,
}
