package settingsstore

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/blue-idea/collection/config"
)

// REQ-031-AC-002：缺省 uiSize 合并为 medium。
func TestDefaultAppSettingsUiSizeIsMedium(t *testing.T) {
	settings := DefaultAppSettings()
	if settings.UiSize != config.UiSizeMedium {
		t.Fatalf("default uiSize=%q, want %q", settings.UiSize, config.UiSizeMedium)
	}
}

// REQ-031-AC-004：旧 settings 无 uiSize 时读取合并为 medium。
func TestReadSettingsMergesMissingUiSize(t *testing.T) {
	root := t.TempDir()
	payload := `{
		"settingsVersion":1,"storageMode":"local","theme":"midnight","locale":"en",
		"ai":{"apiBase":"","model":""},"aiConsent":null,
		"view":{"defaultMode":"card"},"lastCloudRevision":null,
		"shortcuts":{"spotlight":"CmdOrCtrl+K","newBookmark":"CmdOrCtrl+N","insights":"CmdOrCtrl+I",
			"settings":"CmdOrCtrl+,","viewCard":"CmdOrCtrl+1","viewList":"CmdOrCtrl+2",
			"viewMasonry":"CmdOrCtrl+3","toggleLeftSidebar":"CmdOrCtrl+/","toggleRightSidebar":"CmdOrCtrl+\\","toggleWindow":"CmdOrCtrl+L"}
	}`
	if err := os.WriteFile(filepath.Join(root, config.SettingsFileName), []byte(payload), 0o600); err != nil {
		t.Fatalf("write settings: %v", err)
	}
	service := NewService(root)
	result, err := service.ReadSettings()
	if err != nil {
		t.Fatalf("ReadSettings: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal([]byte(result.SettingsJSON), &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded["uiSize"] != config.UiSizeMedium {
		t.Fatalf("merged uiSize=%v, want %q", decoded["uiSize"], config.UiSizeMedium)
	}
}

// REQ-031-AC-004 / AC-005：冷启动按已存档位解析宽高，不读手动拖拽尺寸。
func TestLaunchWindowSizeFromSettings(t *testing.T) {
	root := t.TempDir()
	settings := DefaultAppSettings()
	settings.UiSize = config.UiSizeXLarge
	payload, err := encodeSettings(settings)
	if err != nil {
		t.Fatalf("encode: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, config.SettingsFileName), []byte(payload), 0o600); err != nil {
		t.Fatalf("write: %v", err)
	}
	service := NewService(root)
	width, height, err := service.LaunchWindowSize()
	if err != nil {
		t.Fatalf("LaunchWindowSize: %v", err)
	}
	if width != 1792 || height != 1120 {
		t.Fatalf("got %dx%d, want 1792x1120", width, height)
	}
}

func TestValidateAppSettingsRejectsInvalidUiSize(t *testing.T) {
	settings := DefaultAppSettings()
	settings.UiSize = "huge"
	if err := validateAppSettings(settings); err == nil {
		t.Fatal("expected invalid uiSize rejection")
	}
}
