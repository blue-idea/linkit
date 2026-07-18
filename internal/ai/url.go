package ai

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/blue-idea/collection/config"
)

// NormalizeAPIBase 去掉首尾空白与尾随斜杠，供 URL 拼装与授权匹配。
func NormalizeAPIBase(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	return strings.TrimRight(trimmed, "/")
}

// ChatCompletionsURL 将用户 API Base 规范为 Chat Completions 端点。
// 若 Base 已含 /v1，不得重复拼接；若已是完整 completions 路径则原样返回。
func ChatCompletionsURL(raw string) (string, error) {
	base := NormalizeAPIBase(raw)
	if base == "" {
		return "", newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, nil)
	}
	parsed, err := url.Parse(base)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, fmt.Errorf("invalid apiBase"))
	}
	if !(parsed.Scheme == "https" || parsed.Scheme == "http") {
		return "", newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, fmt.Errorf("apiBase must be HTTP(S)"))
	}

	path := strings.TrimRight(parsed.Path, "/")
	if strings.HasSuffix(path, "/chat/completions") {
		parsed.Path = path
		parsed.RawQuery = ""
		parsed.Fragment = ""
		return parsed.String(), nil
	}
	if !strings.HasSuffix(path, "/v1") {
		if path == "" {
			path = "/v1"
		} else {
			path = path + "/v1"
		}
	}
	parsed.Path = path + "/chat/completions"
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed.String(), nil
}
