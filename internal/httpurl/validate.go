package httpurl

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/blue-idea/collection/config"
)

type InvalidError struct {
	cause error
}

func (err *InvalidError) Error() string {
	return config.ErrorMessageURLInvalid
}

func (err *InvalidError) Unwrap() error {
	return err.cause
}

func (err *InvalidError) ErrorCode() string {
	return config.ErrorCodeURLInvalid
}

func (err *InvalidError) IsRetryable() bool {
	return false
}

// Validate 仅接受带 host 的 http/https URL。
func Validate(raw string) error {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return &InvalidError{cause: fmt.Errorf("url is empty")}
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return &InvalidError{cause: fmt.Errorf("url is malformed")}
	}
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return &InvalidError{cause: fmt.Errorf("unsupported scheme %q", parsed.Scheme)}
	}
	return nil
}
