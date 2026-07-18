package settingsstore

import (
	"strings"
	"testing"
	"time"

	"github.com/blue-idea/collection/config"
)

func TestNormalizeAndConsentHelpers(t *testing.T) {
	t.Run("normalizeAPIBase 去掉空白与尾随斜杠", func(t *testing.T) {
		if got := normalizeAPIBase(" https://api.example.test/v1/ "); got != "https://api.example.test/v1" {
			t.Fatalf("Unexpected normalized API Base: %q", got)
		}
	})

	t.Run("loopback HTTP API Base 合法且非 loopback HTTP 非法", func(t *testing.T) {
		if err := validateAPIBase("http://127.0.0.1:11434/v1", false); err != nil {
			t.Fatalf("loopback HTTP should be allowed: %v", err)
		}
		if err := validateAPIBase("http://example.com/v1", false); err == nil {
			t.Fatal("non-loopback HTTP should be rejected")
		}
	})

	t.Run("consentMatches 要求配置与授权 API Base 同时匹配", func(t *testing.T) {
		settings := DefaultAppSettings()
		settings.AI.APIBase = "https://api.example.test/v1/"
		settings.AIConsent = &aiConsent{APIBase: "https://api.example.test/v1", GrantedAt: fixedTimeText}
		if !consentMatches(settings, "https://api.example.test/v1/") {
			t.Fatal("Expected matching consent")
		}
		settings.AI.APIBase = "https://other.example.test/v1"
		if consentMatches(settings, "https://api.example.test/v1") {
			t.Fatal("Consent must not match after AI API Base drift")
		}
	})
}

func TestGrantAIConsentRequiresMatchingConfiguredBase(t *testing.T) {
	root := t.TempDir()
	service := NewService(root, WithClock(func() time.Time { return fixedTime }))

	payload := makeSettingsJSON(t, appSettings{
		SettingsVersion: 1,
		StorageMode:     "local",
		Theme:           "midnight",
		Locale:          "en",
		AI:              aiSettings{APIBase: "https://api.example.test/v1", Model: "test-model"},
		AIConsent:       nil,
		View:            viewSettings{DefaultMode: "card"},
		LastCloudRev:    nil,
	})
	if err := service.WriteSettings(SettingsWriteRequest{SettingsJSON: payload}); err != nil {
		t.Fatalf("WriteSettings returned error: %v", err)
	}

	err := service.GrantAIConsent("https://other.example.test/v1")
	assertCodedError(t, err, config.ErrorCodeSettingsInvalid, false)
	if !strings.Contains(err.Error(), config.ErrorMessageSettingsInvalid) {
		t.Fatalf("Unexpected error message: %v", err)
	}
}
