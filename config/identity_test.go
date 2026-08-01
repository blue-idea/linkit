package config

import (
	"strings"
	"testing"
)

// 开发与发布身份共享约束：目录名与密钥服务名必须同源，避免读写错槽。
func TestIdentityIsolationInvariants(t *testing.T) {
	t.Parallel()

	if AppIdentityProfile == "" {
		t.Fatal("AppIdentityProfile must be defined")
	}
	if !strings.HasPrefix(AppDataDirectoryName, "Linkit") {
		t.Fatalf("AppDataDirectoryName must start with Linkit, got %q", AppDataDirectoryName)
	}
	if AppDataDirectoryName != SecretServiceName {
		t.Fatalf(
			"AppDataDirectoryName (%q) must equal SecretServiceName (%q)",
			AppDataDirectoryName,
			SecretServiceName,
		)
	}
	if strings.TrimSpace(AppTitle) == "" {
		t.Fatal("AppTitle must not be empty")
	}
	// 密钥逻辑键保持稳定，仅通过服务名隔离通道。
	if AIAPIKeySecretKey != "linkit.ai.api-key" {
		t.Fatalf("Unexpected AIAPIKeySecretKey: %q", AIAPIKeySecretKey)
	}
}
