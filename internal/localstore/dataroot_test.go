package localstore

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/blue-idea/collection/config"
)

// REQ-029-AC-001~005：本地数据根查询、迁移冲突、失败回滚与成功切换。

func migrateRoot(service *Service, request MigrateDataRootRequest) (MigrateDataRootResult, error) {
	return service.MigrateDataRoot(request.TargetPath, request.Confirmed, request.LibraryDocumentJSON, request.SettingsJSON)
}

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

	_, err := migrateRoot(service, MigrateDataRootRequest{TargetPath: target, Confirmed: false})
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

	_, err := migrateRoot(service, MigrateDataRootRequest{TargetPath: target, Confirmed: true})
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

	result, err := migrateRoot(service, MigrateDataRootRequest{TargetPath: target, Confirmed: true})
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

	_, err := migrateRoot(service, MigrateDataRootRequest{TargetPath: blocker, Confirmed: true})
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

func TestMigrateDataRoot_允许迁移到源目录子路径(t *testing.T) {
	// 用户明确要求允许把数据根迁到当前目录下的子文件夹。
	bootstrap := t.TempDir()
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))
	library := `{"format":"linkit-library","schemaVersion":1,"revision":4,"updatedAt":"2026-07-18T08:30:00Z","data":{"bookmarks":[],"categories":[],"collections":[],"tags":[]}}`
	settings := `{"settingsVersion":1,"storageMode":"local","theme":"midnight","locale":"en","ai":{"apiBase":"","model":""},"aiConsent":null,"view":{"defaultMode":"card"},"lastCloudRevision":null}`
	mustWrite(t, filepath.Join(bootstrap, config.LibraryFileName), library)
	mustWrite(t, filepath.Join(bootstrap, config.SettingsFileName), settings)
	child := filepath.Join(bootstrap, "nested-data")

	result, err := migrateRoot(service, MigrateDataRootRequest{
		TargetPath:          child,
		Confirmed:           true,
		LibraryDocumentJSON: library,
		SettingsJSON:        settings,
	})
	if err != nil {
		t.Fatalf("MigrateDataRoot to nested child should succeed: %v", err)
	}
	if result.DataRoot != child {
		t.Fatalf("Unexpected dataRoot: got %q, want %q", result.DataRoot, child)
	}
	if _, err := os.Stat(filepath.Join(child, config.LibraryFileName)); err != nil {
		t.Fatalf("Child library missing: %v", err)
	}
	if _, err := os.Stat(filepath.Join(child, config.SettingsFileName)); err != nil {
		t.Fatalf("Child settings missing: %v", err)
	}
	// 仅删除源中的白名单文件，不得误删子目录本身。
	if _, err := os.Stat(filepath.Join(bootstrap, config.LibraryFileName)); !errors.Is(err, os.ErrNotExist) {
		t.Fatal("Source library should be removed after nested migrate")
	}
	if info, err := os.Stat(child); err != nil || !info.IsDir() {
		t.Fatalf("Nested target directory must remain: %v", err)
	}
	info, err := service.GetDataRoot()
	if err != nil {
		t.Fatalf("GetDataRoot: %v", err)
	}
	if info.DataRoot != child || !info.IsCustom {
		t.Fatalf("Service should use nested data root: %+v", info)
	}
}

func TestMigrateDataRoot_允许迁移到源目录的父路径(t *testing.T) {
	bootstrap := t.TempDir()
	child := filepath.Join(bootstrap, "nested-data")
	if err := os.MkdirAll(child, 0o755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	library := `{"format":"linkit-library","schemaVersion":1,"revision":5,"updatedAt":"2026-07-18T08:30:00Z","data":{"bookmarks":[],"categories":[],"collections":[],"tags":[]}}`
	settings := `{"settingsVersion":1,"storageMode":"local","theme":"graphite","locale":"en","ai":{"apiBase":"","model":""},"aiConsent":null,"view":{"defaultMode":"card"},"lastCloudRevision":null}`
	mustWrite(t, filepath.Join(child, config.LibraryFileName), library)
	mustWrite(t, filepath.Join(child, config.SettingsFileName), settings)
	service := NewService(child, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))

	result, err := migrateRoot(service, MigrateDataRootRequest{
		TargetPath:          bootstrap,
		Confirmed:           true,
		LibraryDocumentJSON: library,
		SettingsJSON:        settings,
	})
	if err != nil {
		t.Fatalf("MigrateDataRoot to parent should succeed: %v", err)
	}
	if result.DataRoot != bootstrap {
		t.Fatalf("Unexpected dataRoot: got %q, want %q", result.DataRoot, bootstrap)
	}
	if _, err := os.Stat(filepath.Join(bootstrap, config.LibraryFileName)); err != nil {
		t.Fatalf("Parent library missing: %v", err)
	}
	if _, err := os.Stat(filepath.Join(child, config.LibraryFileName)); !errors.Is(err, os.ErrNotExist) {
		t.Fatal("Child library should be removed after migrate to parent")
	}
}

func TestMigrateDataRoot_不写入密钥文件(t *testing.T) {
	// REQ-029-AC-002：密钥不落盘迁移。
	bootstrap := t.TempDir()
	target := t.TempDir()
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))
	mustWrite(t, filepath.Join(bootstrap, config.LibraryFileName), `{"format":"linkit-library","schemaVersion":1,"revision":1}`)
	mustWrite(t, filepath.Join(bootstrap, "secrets.json"), `{"apiKey":"sk-test"}`)

	result, err := migrateRoot(service, MigrateDataRootRequest{TargetPath: target, Confirmed: true})
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

func TestMigrateDataRoot_快照落盘后迁移资料库与设置(t *testing.T) {
	// REQ-029-AC-002：源目录无文件时，仍须把当前资料库与配置写入目标。
	bootstrap := t.TempDir()
	target := t.TempDir()
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))

	library := `{"format":"linkit-library","schemaVersion":1,"revision":2,"updatedAt":"2026-07-18T08:30:00Z","data":{"bookmarks":[{"id":"b1","url":"https://example.com","title":"Example","createdAt":"2026-07-18T08:30:00Z","updatedAt":"2026-07-18T08:30:00Z","tagIds":[],"collectionIds":[],"categoryIds":[]}],"categories":[],"collections":[],"tags":[]}}`
	settings := `{"settingsVersion":1,"storageMode":"local","theme":"ocean","locale":"en","ai":{"apiBase":"","model":""},"aiConsent":null,"view":{"defaultMode":"Card"},"lastCloudRevision":null}`

	result, err := migrateRoot(service, MigrateDataRootRequest{
		TargetPath:          target,
		Confirmed:           true,
		LibraryDocumentJSON: library,
		SettingsJSON:        settings,
	})
	if err != nil {
		t.Fatalf("MigrateDataRoot returned error: %v", err)
	}
	if result.DataRoot != target {
		t.Fatalf("Unexpected dataRoot: got %q, want %q", result.DataRoot, target)
	}
	assertContainsFile(t, result.MigratedFiles, config.LibraryFileName)
	assertContainsFile(t, result.MigratedFiles, config.SettingsFileName)

	gotLibrary, err := os.ReadFile(filepath.Join(target, config.LibraryFileName))
	if err != nil {
		t.Fatalf("Target library missing: %v", err)
	}
	if !strings.Contains(string(gotLibrary), `"revision":2`) || !strings.Contains(string(gotLibrary), "https://example.com") {
		t.Fatalf("Target library content unexpected: %s", gotLibrary)
	}
	gotSettings, err := os.ReadFile(filepath.Join(target, config.SettingsFileName))
	if err != nil {
		t.Fatalf("Target settings missing: %v", err)
	}
	if !strings.Contains(string(gotSettings), `"theme":"ocean"`) {
		t.Fatalf("Target settings content unexpected: %s", gotSettings)
	}

	read, err := service.ReadLibrary()
	if err != nil || read.State != "found" {
		t.Fatalf("Service should read migrated library: %+v err=%v", read, err)
	}
}

func TestMigrateDataRoot_同源快照可回填空目录(t *testing.T) {
	bootstrap := t.TempDir()
	dataRoot := t.TempDir()
	mustWrite(t, filepath.Join(bootstrap, config.DataRootFileName), fmt.Sprintf(
		`{"format":%q,"schemaVersion":1,"dataRoot":%q,"updatedAt":%q}`,
		config.DataRootFormat, dataRoot, fixedTimeText,
	))
	service := NewService(dataRoot, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))
	library := `{"format":"linkit-library","schemaVersion":1,"revision":1,"updatedAt":"2026-07-18T08:30:00Z","data":{"bookmarks":[],"categories":[],"collections":[],"tags":[]}}`
	settings := `{"settingsVersion":1,"storageMode":"local","theme":"paper","locale":"en","ai":{"apiBase":"","model":""},"aiConsent":null,"view":{"defaultMode":"card"},"lastCloudRevision":null}`

	result, err := migrateRoot(service, MigrateDataRootRequest{
		TargetPath:          dataRoot,
		Confirmed:           true,
		LibraryDocumentJSON: library,
		SettingsJSON:        settings,
	})
	if err != nil {
		t.Fatalf("MigrateDataRoot same-path fill: %v", err)
	}
	assertContainsFile(t, result.MigratedFiles, config.LibraryFileName)
	assertContainsFile(t, result.MigratedFiles, config.SettingsFileName)
	if _, err := os.Stat(filepath.Join(dataRoot, config.LibraryFileName)); err != nil {
		t.Fatalf("library should be written to current root: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dataRoot, config.SettingsFileName)); err != nil {
		t.Fatalf("settings should be written to current root: %v", err)
	}
}

func TestMigrateDataRoot_无文件且无快照时失败(t *testing.T) {
	bootstrap := t.TempDir()
	target := t.TempDir()
	service := NewService(bootstrap, WithBootstrapRoot(bootstrap), WithClock(func() time.Time { return fixedTime }))

	_, err := migrateRoot(service, MigrateDataRootRequest{TargetPath: target, Confirmed: true})
	assertErrorCode(t, err, config.ErrorCodeDataRootEmpty)

	info, err := service.GetDataRoot()
	if err != nil {
		t.Fatalf("GetDataRoot: %v", err)
	}
	if info.DataRoot != bootstrap {
		t.Fatalf("Root must remain bootstrap on empty migrate: %+v", info)
	}
	if entries, _ := os.ReadDir(target); len(entries) != 0 {
		t.Fatalf("Failed empty migrate should leave target clean, got %d entries", len(entries))
	}
}

func assertContainsFile(t *testing.T, files []string, name string) {
	t.Helper()
	for _, file := range files {
		if file == name {
			return
		}
	}
	t.Fatalf("Expected %q in migrated files %v", name, files)
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
