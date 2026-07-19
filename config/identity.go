//go:build !dev

package config

const (
	// AppIdentityProfile 标识当前构建的本地身份槽（正式发布）。
	AppIdentityProfile = "release"
	// AppDataDirectoryName 是平台配置目录下的应用子目录名。
	AppDataDirectoryName = "Linkit"
	// SecretServiceName 与 OS Keychain / Credential Manager 服务名对齐。
	SecretServiceName = "Linkit"
	// AppTitle 是原生窗口显示的应用名称。
	AppTitle = "Linkit"
)
