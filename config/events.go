package config

const (
	// EventOpenSettings 请求前端打开 Settings 对话框。
	EventOpenSettings = "linkit:open-settings"
	// EventOpenAbout 请求前端打开 About 对话框。
	EventOpenAbout = "linkit:open-about"
	// EventHealthScanProgress 报告单项健康结果和总体进度。
	EventHealthScanProgress = "linkit:health-scan-progress"
	// EventHealthScanFinished 报告健康扫描最终状态。
	EventHealthScanFinished = "linkit:health-scan-finished"
	// EventUpdateAvailable 报告有新版本可下载。
	EventUpdateAvailable = "linkit:update-available"
)
