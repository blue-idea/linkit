package config

import (
	"testing"
)

func TestAppVersion(t *testing.T) {
	expected := "0.3.7"
	if AppVersion != expected {
		t.Errorf("AppVersion = %q; want %q", AppVersion, expected)
	}

	// 验证 AppVersion 为变量，可在构建期通过 ldflags -X 注入
	original := AppVersion
	defer func() { AppVersion = original }()
	AppVersion = "9.9.9"
	if AppVersion != "9.9.9" {
		t.Fatalf("expected AppVersion to be mutable for ldflags injection, got %s", AppVersion)
	}
}

func TestGitHubURL(t *testing.T) {
	expected := "https://github.com/blue-idea/linkit"
	if GitHubURL != expected {
		t.Errorf("GitHubURL = %q; want %q", GitHubURL, expected)
	}
}
