//go:build dev

package config

const (
	// AppIdentityProfile 标识当前构建的本地身份槽（开发调试）。
	AppIdentityProfile = "dev"
	// AppDataDirectoryName 与正式版隔离，避免开发数据污染发布安装验证。
	AppDataDirectoryName = "Linkit-Dev"
	// SecretServiceName 与正式版 Keychain 槽隔离。
	SecretServiceName = "Linkit-Dev"
	// AppTitle 便于从窗口标题区分开发实例。
	AppTitle = "Linkit (Dev)"
)
