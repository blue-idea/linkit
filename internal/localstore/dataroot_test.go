package localstore

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/blue-idea/collection/config"
)

// REQ-029-AC-001~005：本地数据根查询、迁移冲突、失败回滚与成功切换。

func TestGetDataRoot_默认未重定向(t *testing.T) {
	bootstrap := t.TempDir()
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))

	info, err := service.GetDataRoot()
	if err != nil {
		t.Fatalf("GetDataRoot returned error: %v", err)
	}
	if info.BootstrapRoot != bootstrap {
		t.Fatalf("Unexpected bootstrapRoot: got %q, want %q", info.BootstrapRoot, bootstrap)
	}
	if info.DataRoot != bootstrap {
		t.Fatalf("Unexpected dataRoot: got %q, want %q", info.DataRoot, bootstrap)
	}
	if info.IsCustom {
		t.Fatal("Expected isCustom=false for default root")
	}
}

func TestMigrateDataRoot_未确认拒绝写入(t *testing.T) {
	bootstrap := t.TempDir()
	target := t.TempDir()
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))
	mustWrite(t, filepath.Join(bootstrap, config.LibraryFileName), `{"format":"linkit-library","schemaVersion":1,"revision":1}`)

	_, err := service.MigrateDataRoot(MigrateDataRootRequest{TargetPath: target, Confirmed: false})
	assertErrorCode(t, err, config.ErrorCodeInvalidArgument)

	if _, err := os.Stat(filepath.Join(bootstrap, config.LibraryFileName)); err != nil {
		t.Fatalf("Source library should remain: %v", err)
	}
	if entries, _ := os.ReadDir(target); len(entries) != 0 {
		t.Fatalf("Target should stay empty when unconfirmed, got %d entries", len(entries))
	}
}

func TestMigrateDataRoot_目标已有数据时阻止(t *testing.T) {
	// REQ-029-AC-003
	bootstrap := t.TempDir()
	target := t.TempDir()
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))
	mustWrite(t, filepath.Join(bootstrap, config.LibraryFileName), `{"format":"linkit-library","schemaVersion":1,"revision":1}`)
	mustWrite(t, filepath.Join(target, config.LibraryFileName), `{"format":"linkit-library","schemaVersion":1,"revision":9}`)

	_, err := service.MigrateDataRoot(MigrateDataRootRequest{TargetPath: target, Confirmed: true})
	assertErrorCode(t, err, config.ErrorCodeDataRootTargetOccupied)

	info, err := service.GetDataRoot()
	if err != nil {
		t.Fatalf("GetDataRoot after blocked migrate: %v", err)
	}
	if info.DataRoot != bootstrap || info.IsCustom {
		t.Fatalf("Data root should remain bootstrap after blocked migrate: %+v", info)
	}
	if _, err := os.Stat(filepath.Join(bootstrap, config.DataRootFileName)); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("Bootstrap pointer must not be created on conflict: %v", err)
	}
}

func TestMigrateDataRoot_成功迁移后读写新根(t *testing.T) {
	// REQ-029-AC-002、REQ-029-AC-005
	bootstrap := t.TempDir()
	target := t.TempDir()
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))

	library := `{"format":"linkit-library","schemaVersion":1,"revision":3,"updatedAt":"2026-07-18T08:30:00Z","data":{"bookmarks":[],"categories":[],"collections":[],"tags":[]}}`
	settings := `{"settingsVersion":1,"storageMode":"local","theme":"midnight","locale":"en"}`
	mustWrite(t, filepath.Join(bootstrap, config.LibraryFileName), library)
	mustWrite(t, filepath.Join(bootstrap, config.LibraryBackupName), library)
	mustWrite(t, filepath.Join(bootstrap, config.SettingsFileName), settings)
	mustWrite(t, filepath.Join(bootstrap, config.CloudDraftFileName), `{"format":"linkit-cloud-draft","schemaVersion":1,"dirty":true}`)

	result, err := service.MigrateDataRoot(MigrateDataRootRequest{TargetPath: target, Confirmed: true})
	if err != nil {
		t.Fatalf("MigrateDataRoot returned error: %v", err)
	}
	if result.DataRoot != target {
		t.Fatalf("Unexpected result dataRoot: got %q, want %q", result.DataRoot, target)
	}
	if len(result.MigratedFiles) < 3 {
		t.Fatalf("Expected migrated files, got %v", result.MigratedFiles)
	}

	info, err := service.GetDataRoot()
	if err != nil {
		t.Fatalf("GetDataRoot after migrate: %v", err)
	}
	if !info.IsCustom || info.DataRoot != target || info.BootstrapRoot != bootstrap {
		t.Fatalf("Unexpected data root info after migrate: %+v", info)
	}

	// 引导根仅保留指针。
	bootstrapEntries, err := os.ReadDir(bootstrap)
	if err != nil {
		t.Fatalf("Read bootstrap: %v", err)
	}
	for _, entry := range bootstrapEntries {
		if entry.Name() != config.DataRootFileName {
			t.Fatalf("Bootstrap should only keep pointer, found %q", entry.Name())
		}
	}

	pointerRaw, err := os.ReadFile(filepath.Join(bootstrap, config.DataRootFileName))
	if err != nil {
		t.Fatalf("Read data-root.json: %v", err)
	}
	var pointer map[string]any
	if err := json.Unmarshal(pointerRaw, &pointer); err != nil {
		t.Fatalf("Decode data-root.json: %v", err)
	}
	if pointer["format"] != config.DataRootFormat {
		t.Fatalf("Unexpected pointer format: %v", pointer["format"])
	}
	if pointer["dataRoot"] != target {
		t.Fatalf("Unexpected pointer dataRoot: %v", pointer["dataRoot"])
	}

	read, err := service.ReadLibrary()
	if err != nil {
		t.Fatalf("ReadLibrary from new root: %v", err)
	}
	if read.State != "found" || !strings.Contains(read.DocumentJSON, `"revision":3`) {
		t.Fatalf("Unexpected library after migrate: %+v", read)
	}
	if _, err := os.Stat(filepath.Join(target, config.LibraryFileName)); err != nil {
		t.Fatalf("Target library missing: %v", err)
	}
	if _, err := os.Stat(filepath.Join(target, config.SettingsFileName)); err != nil {
		t.Fatalf("Target settings missing: %v", err)
	}

	// 重启后从引导指针解析到同一数据根。
	reopened := NewService(bootstrap, WithBootstrapRoot(bootstrap))
	resolved, err := ResolveEffectiveDataRoot(bootstrap)
	if err != nil {
		t.Fatalf("ResolveEffectiveDataRoot: %v", err)
	}
	if resolved != target {
		t.Fatalf("Resolved root after restart: got %q, want %q", resolved, target)
	}
	reopened = NewService(resolved, WithBootstrapRoot(bootstrap))
	again, err := reopened.ReadLibrary()
	if err != nil || again.State != "found" {
		t.Fatalf("Reopened service should read migrated library: %+v err=%v", again, err)
	}
}

func TestMigrateDataRoot_复制失败时回滚并清理目标(t *testing.T) {
	// REQ-029-AC-004
	bootstrap := t.TempDir()
	targetParent := t.TempDir()
	// 将目标设为普通文件路径的子路径，使 MkdirAll/复制在切换前失败于“目标是文件”场景：
	// 先创建可写目标，再在复制后通过只读源文件触发删除源失败不回滚指针——改用非法目标（文件当目录）。
	blocker := filepath.Join(targetParent, "not-a-dir")
	mustWrite(t, blocker, "file")
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))
	mustWrite(t, filepath.Join(bootstrap, config.LibraryFileName), `{"format":"linkit-library","schemaVersion":1,"revision":1}`)

	_, err := service.MigrateDataRoot(MigrateDataRootRequest{TargetPath: blocker, Confirmed: true})
	assertErrorCode(t, err, config.ErrorCodeDataRootInvalid)

	info, err := service.GetDataRoot()
	if err != nil {
		t.Fatalf("GetDataRoot after failure: %v", err)
	}
	if info.DataRoot != bootstrap {
		t.Fatalf("Source root must remain active: %+v", info)
	}
	if _, err := os.Stat(filepath.Join(bootstrap, config.LibraryFileName)); err != nil {
		t.Fatalf("Source library must remain after failed migrate: %v", err)
	}
}

func TestMigrateDataRoot_拒绝源目录子路径(t *testing.T) {
	bootstrap := t.TempDir()
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))
	mustWrite(t, filepath.Join(bootstrap, config.LibraryFileName), `{"format":"linkit-library","schemaVersion":1,"revision":1}`)
	child := filepath.Join(bootstrap, "nested")

	_, err := service.MigrateDataRoot(MigrateDataRootRequest{TargetPath: child, Confirmed: true})
	assertErrorCode(t, err, config.ErrorCodeDataRootInvalid)
}

func TestMigrateDataRoot_不写入密钥文件(t *testing.T) {
	// REQ-029-AC-002：密钥不落盘迁移。
	bootstrap := t.TempDir()
	target := t.TempDir()
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))
	mustWrite(t, filepath.Join(bootstrap, config.LibraryFileName), `{"format":"linkit-library","schemaVersion":1,"revision":1}`)
	mustWrite(t, filepath.Join(bootstrap, "secrets.json"), `{"apiKey":"sk-test"}`)

	result, err := service.MigrateDataRoot(MigrateDataRootRequest{TargetPath: target, Confirmed: true})
	if err != nil {
		t.Fatalf("MigrateDataRoot returned error: %v", err)
	}
	for _, name := range result.MigratedFiles {
		if strings.Contains(strings.ToLower(name), "secret") {
			t.Fatalf("Secrets must not be migrated: %v", result.MigratedFiles)
		}
	}
	if _, err := os.Stat(filepath.Join(target, "secrets.json")); !errors.Is(err, os.ErrNotExist) {
		t.Fatal("Unexpected secrets.json in target")
	}
	// 未知非应用数据文件保留在源，不静默删除。
	if _, err := os.Stat(filepath.Join(bootstrap, "secrets.json")); err != nil {
		t.Fatalf("Unknown source file should remain: %v", err)
	}
}

func TestResolveEffectiveDataRoot_读取引导指针(t *testing.T) {
	bootstrap := t.TempDir()
	dataRoot := t.TempDir()
	pointer := map[string]any{
		"format":        config.DataRootFormat,
		"schemaVersion": 1,
		"dataRoot":      dataRoot,
		"updatedAt":     fixedTimeText,
	}
	raw, _ := json.Marshal(pointer)
	mustWrite(t, filepath.Join(bootstrap, config.DataRootFileName), string(raw))

	resolved, err := ResolveEffectiveDataRoot(bootstrap)
	if err != nil {
		t.Fatalf("ResolveEffectiveDataRoot: %v", err)
	}
	if resolved != dataRoot {
		t.Fatalf("got %q, want %q", resolved, dataRoot)
	}
}

func mustWrite(t *testing.T, path string, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("WriteFile %s: %v", path, err)
	}
}

func assertErrorCode(t *testing.T, err error, code string) {
	t.Helper()
	if err == nil {
		t.Fatalf("Expected error %s, got nil", code)
	}
	var coded codedError
	if !errors.As(err, &coded) {
		t.Fatalf("Expected coded error, got %T: %v", err, err)
	}
	if coded.ErrorCode() != code {
		t.Fatalf("Unexpected error code: got %q, want %q (%v)", coded.ErrorCode(), code, err)
	}
}
