package secretstore

import (
	"regexp"
	"strings"
)

var (
	bearerPattern = regexp.MustCompile(`(?i)(Bearer\s+)([A-Za-z0-9\-._~+/]+=*)`)
	skPattern     = regexp.MustCompile(`(?i)\bsk-[A-Za-z0-9\-_]{8,}\b`)
	tokenPattern  = regexp.MustCompile(`(?i)(token|api[_-]?key|authorization)\s*[=:]\s*([^\s,;]+)`)
)

// RedactSecrets 从诊断文本中移除 API Key / Bearer / token 明文（REQ-019-AC-004）。
func RedactSecrets(input string) string {
	out := bearerPattern.ReplaceAllString(input, "${1}[REDACTED]")
	out = skPattern.ReplaceAllString(out, "[REDACTED]")
	out = tokenPattern.ReplaceAllString(out, "${1}=[REDACTED]")
	// 二次保险：常见密钥片段不得残留。
	if strings.Contains(strings.ToLower(out), "sk-live-") {
		out = strings.ReplaceAll(out, "sk-live-", "[REDACTED]-")
	}
	return out
}
