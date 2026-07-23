package config

import "time"

const (
	// HTTPConnectTimeout 限制建立连接等待时间。
	HTTPConnectTimeout = 5 * time.Second
	// HTTPResponseHeaderTimeout 限制等待响应头的时间。
	HTTPResponseHeaderTimeout = 5 * time.Second
	// HTTPTotalTimeout 限制单次元数据请求总耗时。
	HTTPTotalTimeout = 15 * time.Second
	// HTTPMaxRedirects 限制重定向次数，且每次重定向都重新校验协议。
	HTTPMaxRedirects = 5
	// HTTPMaxResponseBytes 达到上限后立即停止读取响应体。
	HTTPMaxResponseBytes int64 = 2 * 1024 * 1024
	// HTTPMaxFaviconBytes 限制 favicon 抓取体积。
	HTTPMaxFaviconBytes int64 = 256 * 1024
	// MetadataMaxContentRunes 限制清洗后纯文本长度。
	MetadataMaxContentRunes = 8_000
	// HTTPUserAgent 标识 Linkit 版本，避免伪装浏览器。
	HTTPUserAgent = "Linkit/" + AppVersion + " (+desktop)"
	// HealthMaxConcurrency 限制手动链接健康扫描的并发请求数。
	HealthMaxConcurrency = 4

	// AITotalTimeout 限制单次 Chat Completions 请求总耗时。
	AITotalTimeout = 40 * time.Second
	// AIConnectTimeout 限制建立 AI 连接等待时间。
	AIConnectTimeout = 5 * time.Second
	// AIResponseHeaderTimeout 限制等待 AI 响应头的时间。
	AIResponseHeaderTimeout = 40 * time.Second
	// AIMaxResponseBytes 达到上限后立即停止读取响应体。
	AIMaxResponseBytes int64 = 1 * 1024 * 1024
	// AIMaxRetries 是可重试失败后的额外尝试次数（总尝试 = 1 + AIMaxRetries）。
	AIMaxRetries = 2
	// AIRetryBaseDelay 为带抖动退避的基础延迟。
	AIRetryBaseDelay = 50 * time.Millisecond
	// AIMaxSemanticCandidates 限制送入 AI 重排的本地候选数量。
	AIMaxSemanticCandidates = 40
	// AISummaryMaxRunes 限制 AI 书签摘要的 Unicode 字符数。
	AISummaryMaxRunes = 200
)
