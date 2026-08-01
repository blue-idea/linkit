package config

const (
	// AIConnectionTestSystemPrompt 仅用于连通性测试，不包含任何用户或收藏内容。
	AIConnectionTestSystemPrompt = "You are a connection health check. Reply briefly."
	// AIConnectionTestUserPrompt 是固定探针内容，不读取应用资料库。
	AIConnectionTestUserPrompt = "ping"
)
