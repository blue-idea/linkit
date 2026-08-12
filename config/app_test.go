package config

import (
	"testing"
)

func TestAppVersion(t *testing.T) {
	expected := "0.3.1"
	if AppVersion != expected {
		t.Errorf("AppVersion = %q; want %q", AppVersion, expected)
	}
}

func TestGitHubURL(t *testing.T) {
	expected := "https://github.com/blue-idea/linkit"
	if GitHubURL != expected {
		t.Errorf("GitHubURL = %q; want %q", GitHubURL, expected)
	}
}
