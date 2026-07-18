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
	// MetadataMaxContentRunes 限制清洗后纯文本长度。
	MetadataMaxContentRunes = 8_000
	// HTTPUserAgent 标识 Linkit 版本，避免伪装浏览器。
	HTTPUserAgent = "Linkit/" + AppVersion + " (+desktop)"
)
