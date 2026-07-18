package httpurl_test

import (
	"testing"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/httpurl"
)

func TestValidateAcceptsHTTPAndHTTPS(t *testing.T) {
	for _, raw := range []string{"https://example.test/a", "http://localhost:8080/x"} {
		if err := httpurl.Validate(raw); err != nil {
			t.Fatalf("Validate(%q) returned error: %v", raw, err)
		}
	}
}

func TestValidateRejectsUnsafeSchemes(t *testing.T) {
	for _, raw := range []string{"", "javascript:alert(1)", "file:///tmp", "data:text/html,x", "not-a-url"} {
		err := httpurl.Validate(raw)
		if err == nil {
			t.Fatalf("Validate(%q) should fail", raw)
		}
		coded, ok := err.(interface {
			ErrorCode() string
			IsRetryable() bool
		})
		if !ok || coded.ErrorCode() != config.ErrorCodeURLInvalid || coded.IsRetryable() {
			t.Fatalf("Unexpected error for %q: %v", raw, err)
		}
	}
}
