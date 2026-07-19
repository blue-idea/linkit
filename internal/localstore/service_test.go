package localstore

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/blue-idea/collection/config"
)

const fixedTimeText = "2026-07-18T08:30:00Z"

var fixedTime = time.Date(2026, time.July, 18, 8, 30, 0, 0, time.UTC)

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
	resolved, err := ResolveEffectiveDataRoot(root)
	if err != nil {
		t.Fatalf("ResolveEffectiveDataRoot returned error: %v", err)
	}
	if service.rootDir != resolved {
		t.Fatalf("Unexpected default service root: got %q, want resolved %q", service.rootDir, resolved)
	}
	if service.bootstrapRoot != root {
		t.Fatalf("Unexpected bootstrap root: got %q, want %q", service.bootstrapRoot, root)
	}
}

func TestServiceLibraryLifecycle(t *testing.T) {
	root := t.TempDir()
	service := NewService(root, WithClock(func() time.Time { return fixedTime }))

	// REQ-002-AC-002：没有本机文件时必须返回显式 empty。
	t.Run("空目录返回 empty", func(t *testing.T) {
		result, err := service.ReadLibrary()
		if err != nil {
			t.Fatalf("ReadLibrary returned error: %v", err)
		}
		if result.State != "empty" {
			t.Fatalf("Unexpected state: got %q, want empty", result.State)
		}

		// REQ-002-AC-002：空资料库摘要必须按 API 契约返回 updatedAt: null。
		summary, err := service.DescribeLocalLibrary()
		if err != nil {
			t.Fatalf("DescribeLocalLibrary returned error: %v", err)
		}
		content, err := json.Marshal(summary)
		if err != nil {
			t.Fatalf("Unable to encode empty summary: %v", err)
		}
		var encoded map[string]any
		if err := json.Unmarshal(content, &encoded); err != nil {
			t.Fatalf("Unable to decode empty summary: %v", err)
		}
		updatedAt, exists := encoded["updatedAt"]
		if !exists || updatedAt != nil {
			t.Fatalf("Unexpected empty updatedAt: got %s, want null", content)
		}
	})

	// REQ-002-AC-002：首次保存必须写入新 revision、同步刷新并清理临时文件。
	t.Run("首次保存写入正式文件并返回 revision", func(t *testing.T) {
		result, err := service.WriteLibrary(LocalWriteRequest{
			DocumentJSON:     makeLibraryDocumentJSON(0, "First bookmark"),
			ExpectedRevision: 0,
		})
		if err != nil {
			t.Fatalf("WriteLibrary returned error: %v", err)
		}
		if result != (SaveResult{Revision: 1, UpdatedAt: fixedTimeText}) {
			t.Fatalf("Unexpected save result: got %+v", result)
		}

		assertDocumentHeader(t, filepath.Join(root, "library.json"), 1, fixedTimeText)
		assertPathMissing(t, filepath.Join(root, "library.json.tmp"))
		assertPathMissing(t, filepath.Join(root, "library.json.bak"))

		readResult, err := service.ReadLibrary()
		if err != nil {
			t.Fatalf("ReadLibrary returned error: %v", err)
		}
		if readResult.State != "found" || readResult.DocumentJSON == "" || readResult.FileUpdatedAt == "" {
			t.Fatalf("Unexpected read result: %+v", readResult)
		}

		summary, err := service.DescribeLocalLibrary()
		if err != nil {
			t.Fatalf("DescribeLocalLibrary returned error: %v", err)
		}
		if !summary.Exists || pointerValue(summary.Revision) != 1 || pointerValue(summary.BookmarkCount) != 1 || summary.ByteSize <= 0 {
			t.Fatalf("Unexpected summary: %+v", summary)
		}
	})

	// REQ-002-AC-002：连续保存必须把上一有效版本保留为 .bak。
	t.Run("连续保存保留上一版本备份", func(t *testing.T) {
		result, err := service.WriteLibrary(LocalWriteRequest{
			DocumentJSON:     makeLibraryDocumentJSON(1, "Second bookmark"),
			ExpectedRevision: 1,
		})
		if err != nil {
			t.Fatalf("WriteLibrary returned error: %v", err)
		}
		if result.Revision != 2 {
			t.Fatalf("Unexpected revision: got %d, want 2", result.Revision)
		}
		assertDocumentHeader(t, filepath.Join(root, "library.json"), 2, fixedTimeText)
		assertDocumentHeader(t, filepath.Join(root, "library.json.bak"), 1, fixedTimeText)
		assertDirectoryFiles(t, root, []string{"library.json", "library.json.bak"})
	})

	// REQ-027-AC-003：请求 revision 与文档不一致时不得写入或显示伪成功。
	t.Run("请求 revision 不一致时拒绝写入", func(t *testing.T) {
		before := readFile(t, filepath.Join(root, "library.json"))
		_, err := service.WriteLibrary(LocalWriteRequest{
			DocumentJSON:     makeLibraryDocumentJSON(1, "Stale bookmark"),
			ExpectedRevision: 2,
		})
		assertError(t, err, "INVALID_ARGUMENT", false)
		if after := readFile(t, filepath.Join(root, "library.json")); after != before {
			t.Fatal("Library changed after rejected revision")
		}
	})

	// REQ-027-AC-003：replace 未确认时禁止覆盖，确认后生成新版本。
	t.Run("replace 需要明确确认", func(t *testing.T) {
		_, err := service.ReplaceLibrary(LocalReplaceRequest{
			DocumentJSON: makeLibraryDocumentJSON(10, "Replacement"),
			Confirmed:    false,
		})
		assertError(t, err, "INVALID_ARGUMENT", false)

		result, err := service.ReplaceLibrary(LocalReplaceRequest{
			DocumentJSON: makeLibraryDocumentJSON(10, "Replacement"),
			Confirmed:    true,
		})
		if err != nil {
			t.Fatalf("ReplaceLibrary returned error: %v", err)
		}
		if result.Revision != 11 {
			t.Fatalf("Unexpected replace revision: got %d, want 11", result.Revision)
		}
		assertDocumentHeader(t, filepath.Join(root, "library.json"), 11, fixedTimeText)
		assertDocumentHeader(t, filepath.Join(root, "library.json.bak"), 2, fixedTimeText)
	})
}

func TestServiceRecoveryAndFailures(t *testing.T) {
	// REQ-027-AC-003：磁盘中的超限文件属于损坏持久化状态，而不是调用参数错误。
	t.Run("读取超限资料库返回 DOCUMENT_INVALID", func(t *testing.T) {
		root := t.TempDir()
		writeFile(t, filepath.Join(root, "library.json"), strings.Repeat("x", 257))
		service := NewService(root, WithMaxDocumentBytes(256))

		_, err := service.ReadLibrary()
		assertError(t, err, "DOCUMENT_INVALID", false)
	})

	// REQ-003-AC-004：超限云草稿同样必须进入损坏恢复路径。
	t.Run("读取超限云草稿返回 DOCUMENT_INVALID", func(t *testing.T) {
		root := t.TempDir()
		writeFile(t, filepath.Join(root, "cloud-draft.json"), strings.Repeat("x", 257))
		service := NewService(root, WithMaxDocumentBytes(256))

		_, err := service.ReadCloudDraft()
		assertError(t, err, "DOCUMENT_INVALID", false)
	})

	// REQ-002-AC-002：摘要依赖的 bookmarks 数组缺失时不得误报为空资料库。
	t.Run("摘要拒绝缺失 bookmarks 数组", func(t *testing.T) {
		root := t.TempDir()
		content := mutateDocumentJSON(t, makeLibraryDocumentJSON(0, "Bookmark"), func(document map[string]any) {
			data := document["data"].(map[string]any)
			delete(data, "bookmarks")
		})
		writeFile(t, filepath.Join(root, "library.json"), string(content))
		service := NewService(root)

		_, err := service.DescribeLocalLibrary()
		assertError(t, err, "DOCUMENT_INVALID", false)
	})

	// REQ-002-AC-002：正式文件损坏但备份有效时只报告 recovery_available，不静默恢复。
	t.Run("损坏正式文件时返回有效备份", func(t *testing.T) {
		root := t.TempDir()
		writeFile(t, filepath.Join(root, "library.json"), "{invalid")
		writeFile(t, filepath.Join(root, "library.json.bak"), makeLibraryDocumentJSON(4, "Backup bookmark"))
		service := NewService(root)

		result, err := service.ReadLibrary()
		if err != nil {
			t.Fatalf("ReadLibrary returned error: %v", err)
		}
		if result.State != "recovery_available" || result.DocumentJSON != "" || result.RecoveryJSON == "" {
			t.Fatalf("Unexpected recovery result: %+v", result)
		}
		if readFile(t, filepath.Join(root, "library.json")) != "{invalid" {
			t.Fatal("ReadLibrary silently replaced the corrupted document")
		}
	})

	// REQ-027-AC-003：正式文件与备份都无效时返回结构化错误。
	t.Run("正式文件与备份均损坏时返回 DOCUMENT_INVALID", func(t *testing.T) {
		root := t.TempDir()
		writeFile(t, filepath.Join(root, "library.json"), "{invalid")
		writeFile(t, filepath.Join(root, "library.json.bak"), "[]")
		service := NewService(root)

		_, err := service.ReadLibrary()
		assertError(t, err, "DOCUMENT_INVALID", false)
	})

	// REQ-027-AC-003：超过集中大小上限的输入不得改变现有文件。
	t.Run("超大文档写入失败时保留当前资料库", func(t *testing.T) {
		root := t.TempDir()
		service := NewService(root, WithClock(func() time.Time { return fixedTime }), WithMaxDocumentBytes(256))
		_, err := service.WriteLibrary(LocalWriteRequest{
			DocumentJSON:     makeLibraryDocumentJSON(0, "Small"),
			ExpectedRevision: 0,
		})
		if err != nil {
			t.Fatalf("Initial WriteLibrary returned error: %v", err)
		}
		before := readFile(t, filepath.Join(root, "library.json"))

		_, err = service.WriteLibrary(LocalWriteRequest{
			DocumentJSON:     makeLibraryDocumentJSON(1, string(make([]byte, 512))),
			ExpectedRevision: 1,
		})
		assertError(t, err, "INVALID_ARGUMENT", false)
		if after := readFile(t, filepath.Join(root, "library.json")); after != before {
			t.Fatal("Library changed after oversized write")
		}
		assertPathMissing(t, filepath.Join(root, "library.json.tmp"))
	})

	// REQ-027-AC-003：真实文件系统路径不可写时返回 LOCAL_WRITE_FAILED。
	t.Run("根路径为普通文件时返回 LOCAL_WRITE_FAILED", func(t *testing.T) {
		parent := t.TempDir()
		rootFile := filepath.Join(parent, "blocked-root")
		writeFile(t, rootFile, "not a directory")
		service := NewService(rootFile)

		_, err := service.WriteLibrary(LocalWriteRequest{
			DocumentJSON:     makeLibraryDocumentJSON(0, "Blocked"),
			ExpectedRevision: 0,
		})
		assertError(t, err, "LOCAL_WRITE_FAILED", true)
	})
}

func TestCloudDraftLifecycle(t *testing.T) {
	root := t.TempDir()
	service := NewService(root)

	// REQ-003-AC-004：无草稿时返回 empty。
	result, err := service.ReadCloudDraft()
	if err != nil {
		t.Fatalf("ReadCloudDraft returned error: %v", err)
	}
	if result.State != "empty" {
		t.Fatalf("Unexpected draft state: got %q", result.State)
	}

	// REQ-003-AC-004：dirty 草稿必须原子保存并在失败/退出后可读取。
	dirtyDraft := makeCloudDraftJSON(true, 3)
	if err := service.WriteCloudDraft(CloudDraftWriteRequest{DraftJSON: dirtyDraft}); err != nil {
		t.Fatalf("WriteCloudDraft returned error: %v", err)
	}
	assertPathMissing(t, filepath.Join(root, "cloud-draft.json.tmp"))
	result, err = service.ReadCloudDraft()
	if err != nil {
		t.Fatalf("ReadCloudDraft returned error: %v", err)
	}
	if result.State != "found" || result.DraftJSON == "" {
		t.Fatalf("Unexpected draft result: %+v", result)
	}

	// REQ-003-AC-004/005：dirty 草稿不得在未解决同步或冲突前清理。
	err = service.ClearCloudDraft()
	assertError(t, err, "INVALID_ARGUMENT", false)
	assertPathExists(t, filepath.Join(root, "cloud-draft.json"))

	// 云保存成功或冲突已处理后，调用方先写入 dirty=false，再允许清理。
	if err := service.WriteCloudDraft(CloudDraftWriteRequest{DraftJSON: makeCloudDraftJSON(false, 4)}); err != nil {
		t.Fatalf("WriteCloudDraft clean state returned error: %v", err)
	}
	if err := service.ClearCloudDraft(); err != nil {
		t.Fatalf("ClearCloudDraft returned error: %v", err)
	}
	assertPathMissing(t, filepath.Join(root, "cloud-draft.json"))

	// 非法草稿不得进入同步状态。
	writeFile(t, filepath.Join(root, "cloud-draft.json"), "{invalid")
	_, err = service.ReadCloudDraft()
	assertError(t, err, "DOCUMENT_INVALID", false)
}

func TestServiceAdditionalBoundaries(t *testing.T) {
	// REQ-027-AC-003：confirmed replace 在空目录中仍须生成新 revision。
	t.Run("空目录 confirmed replace 成功", func(t *testing.T) {
		service := NewService(t.TempDir(), WithClock(func() time.Time { return fixedTime }))
		result, err := service.ReplaceLibrary(LocalReplaceRequest{
			DocumentJSON: makeLibraryDocumentJSON(5, "Replacement"),
			Confirmed:    true,
		})
		if err != nil {
			t.Fatalf("ReplaceLibrary returned error: %v", err)
		}
		if result != (SaveResult{Revision: 6, UpdatedAt: fixedTimeText}) {
			t.Fatalf("Unexpected replace result: %+v", result)
		}
	})

	// REQ-027-AC-003：confirmed replace 仍不得接收损坏文档。
	t.Run("confirmed replace 拒绝损坏文档", func(t *testing.T) {
		service := NewService(t.TempDir())
		_, err := service.ReplaceLibrary(LocalReplaceRequest{DocumentJSON: "{invalid", Confirmed: true})
		assertError(t, err, "DOCUMENT_INVALID", false)
	})

	// REQ-002-AC-002：摘要中的 bookmarks 非数组时返回结构化错误。
	t.Run("摘要拒绝非数组 bookmarks", func(t *testing.T) {
		root := t.TempDir()
		content := mutateDocumentJSON(t, makeLibraryDocumentJSON(0, "Bookmark"), func(document map[string]any) {
			data := document["data"].(map[string]any)
			data["bookmarks"] = map[string]any{}
		})
		writeFile(t, filepath.Join(root, "library.json"), string(content))
		_, err := NewService(root).DescribeLocalLibrary()
		assertError(t, err, "DOCUMENT_INVALID", false)
	})

	// REQ-003-AC-004：云草稿读取的文件系统错误必须稳定映射。
	t.Run("云草稿读取失败返回 LOCAL_READ_FAILED", func(t *testing.T) {
		parent := t.TempDir()
		rootFile := filepath.Join(parent, "blocked-root")
		writeFile(t, rootFile, "not a directory")
		_, err := NewService(rootFile).ReadCloudDraft()
		assertError(t, err, "LOCAL_READ_FAILED", true)
	})

	// REQ-003-AC-004：损坏草稿不得写入，空草稿清理保持幂等。
	t.Run("云草稿写入校验与空清理", func(t *testing.T) {
		service := NewService(t.TempDir())
		err := service.WriteCloudDraft(CloudDraftWriteRequest{DraftJSON: "{invalid"})
		assertError(t, err, "DOCUMENT_INVALID", false)
		if err := service.ClearCloudDraft(); err != nil {
			t.Fatalf("ClearCloudDraft empty state returned error: %v", err)
		}
	})
}

func makeLibraryDocumentJSON(revision int, title string) string {
	document := map[string]any{
		"format":        "linkit-library",
		"schemaVersion": 1,
		"revision":      revision,
		"updatedAt":     "2026-07-16T12:00:00Z",
		"data": map[string]any{
			"bookmarks":   []map[string]any{{"id": "bookmark-1", "title": title}},
			"categories":  []any{},
			"collections": []any{},
			"tags":        []any{},
		},
	}
	content, _ := json.Marshal(document)
	return string(content)
}

func makeCloudDraftJSON(dirty bool, baseRevision int) string {
	document := map[string]any{
		"format":        "linkit-cloud-draft",
		"schemaVersion": 1,
		"baseRevision":  baseRevision,
		"dirty":         dirty,
		"updatedAt":     "2026-07-18T08:30:00Z",
		"data": map[string]any{
			"bookmarks":   []any{},
			"categories":  []any{},
			"collections": []any{},
			"tags":        []any{},
		},
	}
	content, _ := json.Marshal(document)
	return string(content)
}

func assertDocumentHeader(t *testing.T, path string, revision int, updatedAt string) {
	t.Helper()
	var header struct {
		Revision  int    `json:"revision"`
		UpdatedAt string `json:"updatedAt"`
	}
	if err := json.Unmarshal([]byte(readFile(t, path)), &header); err != nil {
		t.Fatalf("Unable to decode document %s: %v", path, err)
	}
	if header.Revision != revision || header.UpdatedAt != updatedAt {
		t.Fatalf("Unexpected header in %s: got %+v", path, header)
	}
}

func assertError(t *testing.T, err error, code string, retryable bool) {
	t.Helper()
	if err == nil {
		t.Fatalf("Expected error code %s", code)
	}
	var target codedError
	if !errors.As(err, &target) {
		t.Fatalf("Error does not expose a stable code: %v", err)
	}
	if target.ErrorCode() != code || target.IsRetryable() != retryable {
		t.Fatalf("Unexpected error: code=%s retryable=%v message=%s", target.ErrorCode(), target.IsRetryable(), target.Error())
	}
}

func assertDirectoryFiles(t *testing.T, root string, expected []string) {
	t.Helper()
	entries, err := os.ReadDir(root)
	if err != nil {
		t.Fatalf("Unable to read test directory: %v", err)
	}
	actual := make([]string, 0, len(entries))
	for _, entry := range entries {
		actual = append(actual, entry.Name())
	}
	sort.Strings(actual)
	sort.Strings(expected)
	if len(actual) != len(expected) {
		t.Fatalf("Unexpected directory files: got %v, want %v", actual, expected)
	}
	for index := range expected {
		if actual[index] != expected[index] {
			t.Fatalf("Unexpected directory files: got %v, want %v", actual, expected)
		}
	}
}

func pointerValue(value *int) int {
	if value == nil {
		return -1
	}
	return *value
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("Unable to read file %s: %v", path, err)
	}
	return string(content)
}

func writeFile(t *testing.T, path string, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("Unable to write file %s: %v", path, err)
	}
}

func assertPathExists(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("Expected path to exist %s: %v", path, err)
	}
}

func assertPathMissing(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("Expected path to be absent: %s", path)
	}
}
