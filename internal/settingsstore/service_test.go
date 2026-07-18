package settingsstore

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/blue-idea/collection/config"
)

const fixedTimeText = "2026-07-18T09:00:00Z"

var fixedTime = time.Date(2026, time.July, 18, 9, 0, 0, 0, time.UTC)

type codedError interface {
	error
	ErrorCode() string
	IsRetryable() bool
}

func TestDefaultRootDir(t *testing.T) {
	root, err := DefaultRootDir()
	if err != nil {
		t.Fatalf("DefaultRootDir returned error: %v", err)
	}
	if filepath.Base(root) != config.AppDataDirectoryName {
		t.Fatalf("Unexpected app data directory: got %q", root)
	}
	service, err := NewDefaultService()
	if err != nil {
		t.Fatalf("NewDefaultService returned error: %v", err)
	}
	if service.rootDir != root {
		t.Fatalf("Unexpected default service root: got %q, want %q", service.rootDir, root)
	}
}

func TestServiceSettingsLifecycle(t *testing.T) {
	root := t.TempDir()
	service := NewService(root, WithClock(func() time.Time { return fixedTime }))

	// REQ-023-AC-004：首次启动且无设置文件时必须返回正式默认值，locale 为 en。
	t.Run("空目录返回 default 与正式默认设置", func(t *testing.T) {
		result, err := service.ReadSettings()
		if err != nil {
			t.Fatalf("ReadSettings returned error: %v", err)
		}
		if result.State != "default" {
			t.Fatalf("Unexpected state: got %q, want default", result.State)
		}

		settings := decodeSettingsJSON(t, result.SettingsJSON)
		if settings.Locale != "en" {
			t.Fatalf("Unexpected default locale: got %q, want en", settings.Locale)
		}
		if settings.Theme != "midnight" || settings.StorageMode != "local" {
			t.Fatalf("Unexpected default preferences: %+v", settings)
		}
		if settings.AI.APIBase != "" || settings.AI.Model != "" || settings.AIConsent != nil {
			t.Fatalf("Default AI must be unconfigured: %+v", settings.AI)
		}
		if strings.Contains(result.SettingsJSON, "apiKey") || strings.Contains(result.SettingsJSON, "api_key") {
			t.Fatalf("Default settings must not contain API Key fields")
		}
	})

	// REQ-019-AC-001、REQ-023-AC-003：保存非敏感偏好后必须可往返读取，且不得包含 API Key。
	t.Run("写入后读取返回 found 并持久化主题与 AI 配置", func(t *testing.T) {
		payload := makeSettingsJSON(t, appSettings{
			SettingsVersion: 1,
			StorageMode:     "local",
			Theme:           "ocean",
			Locale:          "en",
			AI:              aiSettings{APIBase: "https://api.example.test/v1", Model: "test-model"},
			AIConsent:       nil,
			View:            viewSettings{DefaultMode: "card"},
			LastCloudRev:    nil,
		})

		if err := service.WriteSettings(SettingsWriteRequest{SettingsJSON: payload}); err != nil {
			t.Fatalf("WriteSettings returned error: %v", err)
		}
		assertPathMissing(t, filepath.Join(root, config.SettingsTemporaryName))

		result, err := service.ReadSettings()
		if err != nil {
			t.Fatalf("ReadSettings returned error: %v", err)
		}
		if result.State != "found" {
			t.Fatalf("Unexpected state: got %q, want found", result.State)
		}
		settings := decodeSettingsJSON(t, result.SettingsJSON)
		if settings.Theme != "ocean" || settings.AI.APIBase != "https://api.example.test/v1" || settings.AI.Model != "test-model" {
			t.Fatalf("Unexpected persisted settings: %+v", settings)
		}
		if strings.Contains(result.SettingsJSON, "apiKey") {
			t.Fatalf("Persisted settings must not include API Key")
		}
	})

	// REQ-019-AC-006：API Base 改变时必须使原授权失效。
	t.Run("API Base 改变时清除不匹配的 consent", func(t *testing.T) {
		grantedAt := fixedTimeText
		withConsent := makeSettingsJSON(t, appSettings{
			SettingsVersion: 1,
			StorageMode:     "local",
			Theme:           "midnight",
			Locale:          "en",
			AI:              aiSettings{APIBase: "https://api.example.test/v1", Model: "test-model"},
			AIConsent:       &aiConsent{APIBase: "https://api.example.test/v1", GrantedAt: grantedAt},
			View:            viewSettings{DefaultMode: "list"},
			LastCloudRev:    nil,
		})
		if err := service.WriteSettings(SettingsWriteRequest{SettingsJSON: withConsent}); err != nil {
			t.Fatalf("WriteSettings with consent returned error: %v", err)
		}

		changedBase := makeSettingsJSON(t, appSettings{
			SettingsVersion: 1,
			StorageMode:     "local",
			Theme:           "midnight",
			Locale:          "en",
			AI:              aiSettings{APIBase: "https://other.example.test/v1", Model: "test-model"},
			AIConsent:       &aiConsent{APIBase: "https://api.example.test/v1", GrantedAt: grantedAt},
			View:            viewSettings{DefaultMode: "list"},
			LastCloudRev:    nil,
		})
		if err := service.WriteSettings(SettingsWriteRequest{SettingsJSON: changedBase}); err != nil {
			t.Fatalf("WriteSettings with changed API Base returned error: %v", err)
		}

		result, err := service.ReadSettings()
		if err != nil {
			t.Fatalf("ReadSettings returned error: %v", err)
		}
		settings := decodeSettingsJSON(t, result.SettingsJSON)
		if settings.AIConsent != nil {
			t.Fatalf("Consent must be cleared after API Base change, got %+v", settings.AIConsent)
		}

		status, err := service.GetAIConsentStatus("https://other.example.test/v1")
		if err != nil {
			t.Fatalf("GetAIConsentStatus returned error: %v", err)
		}
		if status.Granted || status.GrantedAt != nil {
			t.Fatalf("Unexpected consent status after base change: %+v", status)
		}
	})

	// REQ-019-AC-005：明确授权后仅对规范化后完全匹配的 API Base 有效。
	t.Run("GrantAIConsent 仅对规范化后匹配的 API Base 生效", func(t *testing.T) {
		basePayload := makeSettingsJSON(t, appSettings{
			SettingsVersion: 1,
			StorageMode:     "local",
			Theme:           "graphite",
			Locale:          "zh",
			AI:              aiSettings{APIBase: "https://api.example.test/v1/", Model: "test-model"},
			AIConsent:       nil,
			View:            viewSettings{DefaultMode: "masonry"},
			LastCloudRev:    intPtr(3),
		})
		if err := service.WriteSettings(SettingsWriteRequest{SettingsJSON: basePayload}); err != nil {
			t.Fatalf("WriteSettings returned error: %v", err)
		}

		if err := service.GrantAIConsent("https://api.example.test/v1"); err != nil {
			t.Fatalf("GrantAIConsent returned error: %v", err)
		}
		status, err := service.GetAIConsentStatus("https://api.example.test/v1/")
		if err != nil {
			t.Fatalf("GetAIConsentStatus returned error: %v", err)
		}
		if !status.Granted || status.GrantedAt == nil || *status.GrantedAt != fixedTimeText {
			t.Fatalf("Unexpected granted status: %+v", status)
		}

		mismatch, err := service.GetAIConsentStatus("https://other.example.test/v1")
		if err != nil {
			t.Fatalf("GetAIConsentStatus mismatch returned error: %v", err)
		}
		if mismatch.Granted {
			t.Fatalf("Consent must not apply to a different API Base")
		}
	})
}

func TestServiceSettingsRecoveryAndValidation(t *testing.T) {
	root := t.TempDir()
	service := NewService(root, WithClock(func() time.Time { return fixedTime }))

	// TASK-007：损坏正式文件且备份可用时必须恢复备份。
	t.Run("损坏正式文件时从备份恢复", func(t *testing.T) {
		valid := makeSettingsJSON(t, DefaultAppSettings())
		if err := service.WriteSettings(SettingsWriteRequest{SettingsJSON: valid}); err != nil {
			t.Fatalf("WriteSettings returned error: %v", err)
		}
		updated := makeSettingsJSON(t, appSettings{
			SettingsVersion: 1,
			StorageMode:     "cloud",
			Theme:           "sunset",
			Locale:          "zh",
			AI:              aiSettings{APIBase: "https://api.example.test/v1", Model: "model-a"},
			AIConsent:       nil,
			View:            viewSettings{DefaultMode: "timeline"},
			LastCloudRev:    intPtr(7),
		})
		if err := service.WriteSettings(SettingsWriteRequest{SettingsJSON: updated}); err != nil {
			t.Fatalf("Second WriteSettings returned error: %v", err)
		}

		if err := os.WriteFile(filepath.Join(root, config.SettingsFileName), []byte("{not-json"), 0o600); err != nil {
			t.Fatalf("Unable to corrupt settings file: %v", err)
		}

		result, err := service.ReadSettings()
		if err != nil {
			t.Fatalf("ReadSettings returned error: %v", err)
		}
		if result.State != "found" {
			t.Fatalf("Unexpected recovery state: got %q, want found", result.State)
		}
		settings := decodeSettingsJSON(t, result.SettingsJSON)
		if settings.Theme != "midnight" || settings.StorageMode != "local" {
			t.Fatalf("Expected backup settings, got %+v", settings)
		}
	})

	// TASK-007：正式文件与备份均损坏时回退正式默认值。
	t.Run("正式文件与备份均损坏时返回 default", func(t *testing.T) {
		if err := os.WriteFile(filepath.Join(root, config.SettingsFileName), []byte("{bad"), 0o600); err != nil {
			t.Fatalf("Unable to corrupt settings: %v", err)
		}
		if err := os.WriteFile(filepath.Join(root, config.SettingsBackupName), []byte("{also-bad"), 0o600); err != nil {
			t.Fatalf("Unable to corrupt backup: %v", err)
		}

		result, err := service.ReadSettings()
		if err != nil {
			t.Fatalf("ReadSettings returned error: %v", err)
		}
		if result.State != "default" {
			t.Fatalf("Unexpected state: got %q, want default", result.State)
		}
	})

	// TASK-007：不支持的 settingsVersion 与非法枚举必须拒绝写入。
	t.Run("非法设置写入返回 SETTINGS_INVALID", func(t *testing.T) {
		err := service.WriteSettings(SettingsWriteRequest{SettingsJSON: `{"settingsVersion":0,"storageMode":"local","theme":"midnight","locale":"en","ai":{"apiBase":"","model":""},"aiConsent":null,"view":{"defaultMode":"card"},"lastCloudRevision":null}`})
		assertCodedError(t, err, config.ErrorCodeSettingsInvalid, false)

		err = service.WriteSettings(SettingsWriteRequest{SettingsJSON: `{"settingsVersion":1,"storageMode":"local","theme":"neon","locale":"en","ai":{"apiBase":"","model":""},"aiConsent":null,"view":{"defaultMode":"card"},"lastCloudRevision":null}`})
		assertCodedError(t, err, config.ErrorCodeSettingsInvalid, false)

		err = service.WriteSettings(SettingsWriteRequest{SettingsJSON: `{"settingsVersion":1,"storageMode":"local","theme":"midnight","locale":"en","ai":{"apiBase":"http://example.com/v1","model":"x"},"aiConsent":null,"view":{"defaultMode":"card"},"lastCloudRevision":null}`})
		assertCodedError(t, err, config.ErrorCodeSettingsInvalid, false)
	})

	// REQ-019-AC-001：设置载荷不得包含 API Key 字段。
	t.Run("包含 API Key 的设置被拒绝", func(t *testing.T) {
		err := service.WriteSettings(SettingsWriteRequest{SettingsJSON: `{"settingsVersion":1,"storageMode":"local","theme":"midnight","locale":"en","ai":{"apiBase":"https://api.example.test/v1","model":"x","apiKey":"secret"},"aiConsent":null,"view":{"defaultMode":"card"},"lastCloudRevision":null}`})
		assertCodedError(t, err, config.ErrorCodeSettingsInvalid, false)
	})
}

func makeSettingsJSON(t *testing.T, settings appSettings) string {
	t.Helper()
	content, err := json.Marshal(settings)
	if err != nil {
		t.Fatalf("Unable to encode settings: %v", err)
	}
	return string(content)
}

func decodeSettingsJSON(t *testing.T, raw string) appSettings {
	t.Helper()
	var settings appSettings
	if err := json.Unmarshal([]byte(raw), &settings); err != nil {
		t.Fatalf("Unable to decode settings JSON: %v", err)
	}
	return settings
}

func assertPathMissing(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("Path should be missing: %s (%v)", path, err)
	}
}

func assertCodedError(t *testing.T, err error, code string, retryable bool) {
	t.Helper()
	if err == nil {
		t.Fatalf("Expected coded error %s, got nil", code)
	}
	coded, ok := err.(codedError)
	if !ok {
		t.Fatalf("Expected coded error, got %T: %v", err, err)
	}
	if coded.ErrorCode() != code || coded.IsRetryable() != retryable {
		t.Fatalf("Unexpected coded error: code=%s retryable=%v, want code=%s retryable=%v", coded.ErrorCode(), coded.IsRetryable(), code, retryable)
	}
}

func intPtr(value int) *int {
	return &value
}
