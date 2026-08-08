package config

import (
	"testing"
)

func TestAppVersion(t *testing.T) {
	expected := "0.2.9"
	if AppVersion != expected {
		t.Errorf("AppVersion = %q; want %q", AppVersion, expected)
	}
}
