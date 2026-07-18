package platform

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
	"unicode/utf8"

	"github.com/blue-idea/collection/config"
)

const fixedTimeText = "2026-07-18T10:00:00Z"

var fixedTime = time.Date(2026, time.July, 18, 10, 0, 0, 0, time.UTC)

type codedError interface {
	error
	ErrorCode() string
	IsRetryable() bool
}

type scriptedDialogs struct {
	openPath   string
	openCancel bool
	openErr    error
	savePath   string
	saveCancel bool
	saveErr    error
}

func (dialogs *scriptedDialogs) OpenJSONFile() (string, bool, error) {
	return dialogs.openPath, dialogs.openCancel, dialogs.openErr
}

func (dialogs *scriptedDialogs) SaveJSONFile(string) (string, bool, error) {
	return dialogs.savePath, dialogs.saveCancel, dialogs.saveErr
}

func TestExportLibrarySavedEnvelope(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "backup.json")
	dialogs := &scriptedDialogs{savePath: target}
	service := NewService(WithDialogs(dialogs), WithClock(func() time.Time { return fixedTime }))

	// REQ-005-AC-001：导出必须生成包含完整 LibraryEnvelope 与导出元数据的有效 JSON。
	result, err := service.ExportLibrary(ExportRequest{
		SuggestedFileName: "linkit-export.json",
		DocumentJSON:      validLibraryDocumentJSON(),
	})
	if err != nil {
		t.Fatalf("ExportLibrary returned error: %v", err)
	}
	if result.State != "saved" || result.Path != target {
		t.Fatalf("Unexpected export result: %+v", result)
	}

	content, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("Unable to read export file: %v", err)
	}
	var envelope map[string]any
	if err := json.Unmarshal(content, &envelope); err != nil {
		t.Fatalf("Export file is not JSON: %v", err)
	}
	if envelope["format"] != "linkit-library" || envelope["exportedAt"] != fixedTimeText || envelope["appVersion"] != config.AppVersion {
		t.Fatalf("Unexpected export envelope: %+v", envelope)
	}
	if _, exists := envelope["data"]; !exists {
		t.Fatal("Export envelope must include library data")
	}
	if strings.Contains(string(content), "apiKey") || strings.Contains(string(content), "settingsVersion") {
		t.Fatal("Export must not include settings or API credentials")
	}
}

func TestExportLibraryCancelledAndRejectedSecrets(t *testing.T) {
	service := NewService(
		WithDialogs(&scriptedDialogs{saveCancel: true}),
		WithClock(func() time.Time { return fixedTime }),
	)

	// TASK-008：用户取消保存对话框时必须返回 cancelled，且不写文件。
	result, err := service.ExportLibrary(ExportRequest{
		SuggestedFileName: "linkit-export.json",
		DocumentJSON:      validLibraryDocumentJSON(),
	})
	if err != nil {
		t.Fatalf("ExportLibrary cancelled returned error: %v", err)
	}
	if result.State != "cancelled" || result.Path != "" {
		t.Fatalf("Unexpected cancelled result: %+v", result)
	}

	// REQ-025-AC-002：导出载荷不得包含 API 凭据。
	_, err = service.ExportLibrary(ExportRequest{
		SuggestedFileName: "linkit-export.json",
		DocumentJSON:      `{"format":"linkit-library","schemaVersion":1,"revision":1,"updatedAt":"2026-07-18T10:00:00Z","data":{"bookmarks":[],"categories":[],"collections":[],"tags":[]},"apiKey":"secret"}`,
	})
	assertCodedError(t, err, config.ErrorCodeExportInvalid, false)
}

func TestSelectImportFileHappyPathAndCancel(t *testing.T) {
	root := t.TempDir()
	source := filepath.Join(root, "import.json")
	payload := validLibraryDocumentJSON()
	if err := os.WriteFile(source, []byte(payload), 0o600); err != nil {
		t.Fatalf("Unable to seed import file: %v", err)
	}

	service := NewService(WithDialogs(&scriptedDialogs{openPath: source}))
	// REQ-005-AC-002：选择有效 JSON 后返回 selected 与文档内容，供后续确认覆盖。
	result, err := service.SelectImportFile()
	if err != nil {
		t.Fatalf("SelectImportFile returned error: %v", err)
	}
	if result.State != "selected" || result.FileName != "import.json" || result.ByteSize == nil || *result.ByteSize != int64(len(payload)) {
		t.Fatalf("Unexpected import result: %+v", result)
	}
	if result.DocumentJSON != payload {
		t.Fatalf("Unexpected document JSON: %s", result.DocumentJSON)
	}

	cancelledService := NewService(WithDialogs(&scriptedDialogs{openCancel: true}))
	cancelled, err := cancelledService.SelectImportFile()
	if err != nil {
		t.Fatalf("SelectImportFile cancel returned error: %v", err)
	}
	if cancelled.State != "cancelled" || cancelled.DocumentJSON != "" {
		t.Fatalf("Unexpected cancelled import: %+v", cancelled)
	}
}

func TestSelectImportFileRejectsInvalidFiles(t *testing.T) {
	root := t.TempDir()

	t.Run("损坏 JSON", func(t *testing.T) {
		path := filepath.Join(root, "broken.json")
		if err := os.WriteFile(path, []byte("{not-json"), 0o600); err != nil {
			t.Fatalf("Unable to write fixture: %v", err)
		}
		service := NewService(WithDialogs(&scriptedDialogs{openPath: path}))
		_, err := service.SelectImportFile()
		assertCodedError(t, err, config.ErrorCodeImportInvalid, false)
	})

	t.Run("非法 UTF-8", func(t *testing.T) {
		content := []byte{0xff, 0xfe, 0xfd}
		if utf8.Valid(content) {
			t.Fatal("fixture must be invalid UTF-8")
		}
		path := filepath.Join(root, "utf8.json")
		if err := os.WriteFile(path, content, 0o600); err != nil {
			t.Fatalf("Unable to write fixture: %v", err)
		}
		service := NewService(WithDialogs(&scriptedDialogs{openPath: path}))
		_, err := service.SelectImportFile()
		assertCodedError(t, err, config.ErrorCodeImportInvalid, false)
	})

	t.Run("超大文件", func(t *testing.T) {
		path := filepath.Join(root, "large.json")
		content := []byte(`{"format":"linkit-library"}`)
		if err := os.WriteFile(path, content, 0o600); err != nil {
			t.Fatalf("Unable to write fixture: %v", err)
		}
		// 使用极小上限验证大小门禁，避免在测试中真正写入 64MiB。
		service := NewService(WithDialogs(&scriptedDialogs{openPath: path}), WithMaxDocumentBytes(8))
		_, err := service.SelectImportFile()
		assertCodedError(t, err, config.ErrorCodeImportInvalid, false)
	})
}

func validLibraryDocumentJSON() string {
	return `{
  "format": "linkit-library",
  "schemaVersion": 1,
  "revision": 3,
  "updatedAt": "2026-07-18T09:30:00Z",
  "data": {
    "bookmarks": [],
    "categories": [],
    "collections": [],
    "tags": []
  }
}`
}

func sanitizeName(name string) string {
	return strings.NewReplacer(" ", "-", "/", "-").Replace(name)
}

func assertCodedError(t *testing.T, err error, code string, retryable bool) {
	t.Helper()
	if err == nil {
		t.Fatalf("Expected coded error %s", code)
	}
	coded, ok := err.(codedError)
	if !ok {
		t.Fatalf("Expected coded error, got %T: %v", err, err)
	}
	if coded.ErrorCode() != code || coded.IsRetryable() != retryable {
		t.Fatalf("Unexpected coded error: code=%s retryable=%v want code=%s retryable=%v", coded.ErrorCode(), coded.IsRetryable(), code, retryable)
	}
}
