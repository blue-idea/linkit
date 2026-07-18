package secretstore

import (
	"testing"

	"github.com/blue-idea/collection/config"
)

type codedError interface {
	error
	ErrorCode() string
	IsRetryable() bool
}

func assertCodedError(t *testing.T, err error, code string, retryable bool) {
	t.Helper()
	if err == nil {
		t.Fatalf("Expected error with code %s", code)
	}
	coded, ok := err.(codedError)
	if !ok {
		t.Fatalf("Expected coded error, got %T: %v", err, err)
	}
	if coded.ErrorCode() != code {
		t.Fatalf("Unexpected code: got %q, want %q", coded.ErrorCode(), code)
	}
	if coded.IsRetryable() != retryable {
		t.Fatalf("Unexpected retryable: got %v, want %v", coded.IsRetryable(), retryable)
	}
}

func TestMemorySecretStoreLifecycle(t *testing.T) {
	service := NewService(NewMemoryBackend())

	// REQ-025-AC-002：未配置时仅返回 configured=false，不暴露明文。
	t.Run("初始状态未配置", func(t *testing.T) {
		status, err := service.GetAIKeyStatus()
		if err != nil {
			t.Fatalf("GetAIKeyStatus returned error: %v", err)
		}
		if status.Configured {
			t.Fatalf("Expected configured=false")
		}
	})

	// REQ-019-AC-001 / REQ-025-AC-002：Key 写入 SecretStore，空值拒绝。
	t.Run("空值不得写入", func(t *testing.T) {
		err := service.SetAIKey(SetSecretRequest{Value: "   "})
		assertCodedError(t, err, config.ErrorCodeInvalidArgument, false)
	})

	t.Run("写入后状态为已配置且可内部加载", func(t *testing.T) {
		if err := service.SetAIKey(SetSecretRequest{Value: "sk-test-secret"}); err != nil {
			t.Fatalf("SetAIKey returned error: %v", err)
		}
		status, err := service.GetAIKeyStatus()
		if err != nil {
			t.Fatalf("GetAIKeyStatus returned error: %v", err)
		}
		if !status.Configured {
			t.Fatalf("Expected configured=true")
		}
		// LoadAIKey 仅供 Go AI 适配器使用，不作为前端绑定契约的一部分。
		value, err := service.LoadAIKey()
		if err != nil {
			t.Fatalf("LoadAIKey returned error: %v", err)
		}
		if value != "sk-test-secret" {
			t.Fatalf("Unexpected key value")
		}
	})

	t.Run("删除后恢复未配置", func(t *testing.T) {
		if err := service.DeleteAIKey(); err != nil {
			t.Fatalf("DeleteAIKey returned error: %v", err)
		}
		status, err := service.GetAIKeyStatus()
		if err != nil {
			t.Fatalf("GetAIKeyStatus returned error: %v", err)
		}
		if status.Configured {
			t.Fatalf("Expected configured=false after delete")
		}
		_, err = service.LoadAIKey()
		assertCodedError(t, err, config.ErrorCodeSecretNotConfigured, false)
	})
}

// REQ-019-AC-004：日志脱敏不得保留 API Key 明文。
func TestRedactSecrets(t *testing.T) {
	input := "Authorization: Bearer sk-live-abc123 and token=xyz"
	redacted := RedactSecrets(input)
	if contains(redacted, "sk-live-abc123") || contains(redacted, "xyz") {
		t.Fatalf("Expected secrets redacted, got %q", redacted)
	}
	if !contains(redacted, "[REDACTED]") {
		t.Fatalf("Expected redaction marker, got %q", redacted)
	}
}

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (haystack == needle || len(needle) == 0 ||
		(len(haystack) > 0 && (indexOf(haystack, needle) >= 0)))
}

func indexOf(s, substr string) int {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
