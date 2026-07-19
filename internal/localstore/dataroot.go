package localstore

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/blue-idea/collection/config"
)

// DataRootInfo 描述引导根与当前有效数据根。
type DataRootInfo struct {
	BootstrapRoot string `json:"bootstrapRoot"`
	DataRoot      string `json:"dataRoot"`
	IsCustom      bool   `json:"isCustom"`
}

// MigrateDataRootRequest 触发目录迁移；confirmed 必须为 true。
// LibraryDocumentJSON / SettingsJSON 用于在迁移前把当前内存快照落到磁盘，
// 避免仅 localStorage/内存态存在时复制空目录导致“成功但目标无数据”。
type MigrateDataRootRequest struct {
	TargetPath          string `json:"targetPath"`
	Confirmed           bool   `json:"confirmed"`
	LibraryDocumentJSON string `json:"libraryDocumentJson,omitempty"`
	SettingsJSON        string `json:"settingsJson,omitempty"`
}

// MigrateDataRootResult 返回迁移后的有效数据根与已迁移文件名。
type MigrateDataRootResult struct {
	DataRoot       string   `json:"dataRoot"`
	MigratedFiles  []string `json:"migratedFiles"`
}

type dataRootPointer struct {
	Format        string `json:"format"`
	SchemaVersion int    `json:"schemaVersion"`
	DataRoot      string `json:"dataRoot"`
	UpdatedAt     string `json:"updatedAt"`
}

// WithBootstrapRoot 设置引导根；有效数据根仍为 NewService 的 rootDir。
func WithBootstrapRoot(bootstrapRoot string) Option {
	return func(service *Service) {
		service.bootstrapRoot = bootstrapRoot
	}
}

// WithRootChanged 在迁移成功切换 root 后通知依赖方（如 settingsstore）。
func WithRootChanged(callback func(dataRoot string)) Option {
	return func(service *Service) {
		service.onRootChanged = callback
	}
}

// WithDirectoryDialog 注入目录选择对话框，便于单测。
func WithDirectoryDialog(dialog directoryDialog) Option {
	return func(service *Service) {
		service.dirDialog = dialog
	}
}

// SetContext 注入 Wails 运行时上下文，供原生目录对话框使用。
func (service *Service) SetContext(ctx context.Context) {
	service.ctx = ctx
	if service.dirDialog == nil {
		service.dirDialog = wailsDirectoryDialog{ctx: ctx}
	} else if updater, ok := service.dirDialog.(contextAwareDialog); ok {
		updater.SetContext(ctx)
	}
}

// SelectDirectoryResult 描述原生文件夹选择结果。
type SelectDirectoryResult struct {
	State string `json:"state"`
	Path  string `json:"path,omitempty"`
}

// SelectDataRootDirectory 打开原生文件夹选择对话框。
func (service *Service) SelectDataRootDirectory() (SelectDirectoryResult, error) {
	dialog := service.dirDialog
	if dialog == nil {
		dialog = wailsDirectoryDialog{ctx: service.ctx}
	}
	path, cancelled, err := dialog.SelectDirectory()
	if err != nil {
		return SelectDirectoryResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageInvalidArgument, false, err)
	}
	if cancelled {
		return SelectDirectoryResult{State: "cancelled"}, nil
	}
	return SelectDirectoryResult{State: "selected", Path: path}, nil
}

// ResolveEffectiveDataRoot 从引导根的 data-root.json 解析有效数据根。
func ResolveEffectiveDataRoot(bootstrapRoot string) (string, error) {
	pointerPath := filepath.Join(bootstrapRoot, config.DataRootFileName)
	raw, err := os.ReadFile(pointerPath)
	if errors.Is(err, os.ErrNotExist) {
		return filepath.Clean(bootstrapRoot), nil
	}
	if err != nil {
		return "", newServiceError(config.ErrorCodeLocalReadFailed, config.ErrorMessageLocalReadFailed, true, err)
	}

	var pointer dataRootPointer
	if err := json.Unmarshal(raw, &pointer); err != nil {
		return "", newServiceError(config.ErrorCodeDocumentInvalid, config.ErrorMessageDocumentInvalid, false, err)
	}
	if pointer.Format != config.DataRootFormat || pointer.SchemaVersion < 1 || strings.TrimSpace(pointer.DataRoot) == "" {
		return "", newServiceError(config.ErrorCodeDocumentInvalid, config.ErrorMessageDocumentInvalid, false, nil)
	}

	resolved := filepath.Clean(pointer.DataRoot)
	if !filepath.IsAbs(resolved) {
		return "", newServiceError(config.ErrorCodeDataRootInvalid, config.ErrorMessageDataRootInvalid, false, nil)
	}
	return resolved, nil
}

// GetDataRoot 返回引导根与当前有效数据根。
func (service *Service) GetDataRoot() (DataRootInfo, error) {
	bootstrap := service.resolvedBootstrapRoot()
	dataRoot := filepath.Clean(service.rootDir)
	return DataRootInfo{
		BootstrapRoot: bootstrap,
		DataRoot:      dataRoot,
		IsCustom:      !samePath(bootstrap, dataRoot),
	}, nil
}

// SetRootDir 在共享装配场景下同步有效数据根。
func (service *Service) SetRootDir(dataRoot string) {
	service.rootDir = filepath.Clean(dataRoot)
}

// MigrateDataRoot 将白名单应用数据文件迁移到目标目录并更新引导指针。
// 使用扁平参数，避免 Wails 结构体绑定丢失 library/settings 快照字段。
func (service *Service) MigrateDataRoot(targetPath string, confirmed bool, libraryDocumentJson string, settingsJson string) (MigrateDataRootResult, error) {
	return service.migrateDataRoot(MigrateDataRootRequest{
		TargetPath:          targetPath,
		Confirmed:           confirmed,
		LibraryDocumentJSON: libraryDocumentJson,
		SettingsJSON:        settingsJson,
	})
}

func (service *Service) migrateDataRoot(request MigrateDataRootRequest) (MigrateDataRootResult, error) {
	if !request.Confirmed {
		return MigrateDataRootResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageInvalidArgument, false, nil)
	}

	bootstrap := service.resolvedBootstrapRoot()
	source := filepath.Clean(service.rootDir)
	target, err := normalizeTargetPath(request.TargetPath)
	if err != nil {
		return MigrateDataRootResult{}, err
	}

	if samePath(source, target) {
		// 同源：直接把快照写入当前有效根，修复“指针已切换但目录为空”。
		if err := stageMigrationSnapshots(target, request.LibraryDocumentJSON, request.SettingsJSON); err != nil {
			return MigrateDataRootResult{}, err
		}
		staged := listExistingMigratableFiles(target)
		if len(staged) == 0 {
			return MigrateDataRootResult{}, newServiceError(config.ErrorCodeDataRootEmpty, config.ErrorMessageDataRootEmpty, false, nil)
		}
		return MigrateDataRootResult{DataRoot: target, MigratedFiles: staged}, nil
	}

	// 允许目标为源目录的子路径或父路径：清理仅删除白名单文件名，不会递归删除子目录。

	targetInfo, err := os.Stat(target)
	if err == nil && !targetInfo.IsDir() {
		return MigrateDataRootResult{}, newServiceError(config.ErrorCodeDataRootInvalid, config.ErrorMessageDataRootInvalid, false, nil)
	}
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return MigrateDataRootResult{}, newServiceError(config.ErrorCodeDataRootInvalid, config.ErrorMessageDataRootInvalid, false, err)
	}

	occupied, err := containsLinkitData(target)
	if err != nil {
		return MigrateDataRootResult{}, migrateFailed(err)
	}
	if occupied {
		return MigrateDataRootResult{}, newServiceError(config.ErrorCodeDataRootTargetOccupied, config.ErrorMessageDataRootTargetOccupied, false, nil)
	}

	if err := os.MkdirAll(target, 0o755); err != nil {
		return MigrateDataRootResult{}, newServiceError(config.ErrorCodeDataRootInvalid, config.ErrorMessageDataRootInvalid, false, err)
	}

	// 快照优先直接写入目标目录，避免依赖源目录可写（如同步盘锁文件）。
	if err := stageMigrationSnapshots(target, request.LibraryDocumentJSON, request.SettingsJSON); err != nil {
		_ = cleanupDirectoryArtifacts(target)
		return MigrateDataRootResult{}, err
	}

	copied, copyErr := copyMissingMigratableFiles(source, target)
	if copyErr != nil {
		_ = cleanupDirectoryArtifacts(target)
		return MigrateDataRootResult{}, migrateFailed(copyErr)
	}
	_ = copied

	migrated := listExistingMigratableFiles(target)
	if len(migrated) == 0 {
		_ = cleanupDirectoryArtifacts(target)
		return MigrateDataRootResult{}, newServiceError(config.ErrorCodeDataRootEmpty, config.ErrorMessageDataRootEmpty, false, nil)
	}

	if err := writeDataRootPointer(bootstrap, target, service.now().UTC()); err != nil {
		_ = cleanupDirectoryArtifacts(target)
		return MigrateDataRootResult{}, migrateFailed(err)
	}

	// 清理源中已成功出现在目标里的白名单文件。
	_ = removeMigratableFiles(source, migrated)
	service.rootDir = target
	if service.onRootChanged != nil {
		service.onRootChanged(target)
	}

	return MigrateDataRootResult{DataRoot: target, MigratedFiles: migrated}, nil
}

func migrateFailed(cause error) error {
	message := config.ErrorMessageDataRootMigrateFailed
	if cause != nil && strings.TrimSpace(cause.Error()) != "" {
		message = config.ErrorMessageDataRootMigrateFailed + ": " + cause.Error()
	}
	return newServiceError(config.ErrorCodeDataRootMigrateFailed, message, true, cause)
}

func (service *Service) resolvedBootstrapRoot() string {
	if strings.TrimSpace(service.bootstrapRoot) != "" {
		return filepath.Clean(service.bootstrapRoot)
	}
	return filepath.Clean(service.rootDir)
}

func normalizeTargetPath(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", newServiceError(config.ErrorCodeDataRootInvalid, config.ErrorMessageDataRootInvalid, false, nil)
	}
	cleaned := filepath.Clean(trimmed)
	if !filepath.IsAbs(cleaned) {
		return "", newServiceError(config.ErrorCodeDataRootInvalid, config.ErrorMessageDataRootInvalid, false, nil)
	}
	return cleaned, nil
}

func containsLinkitData(dir string) (bool, error) {
	entries, err := os.ReadDir(dir)
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	known := map[string]struct{}{
		config.DataRootFileName: {},
	}
	for _, name := range config.MigratableDataFileNames {
		known[name] = struct{}{}
	}
	for _, entry := range entries {
		if _, ok := known[entry.Name()]; ok {
			return true, nil
		}
	}
	return false, nil
}

// stageMigrationSnapshots 将前端传来的当前资料库/设置写入指定目录。
func stageMigrationSnapshots(dir string, libraryJSON string, settingsJSON string) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return migrateFailed(err)
	}
	if trimmed := strings.TrimSpace(libraryJSON); trimmed != "" {
		if !json.Valid([]byte(trimmed)) {
			return newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageInvalidArgument, false, errors.New("libraryDocumentJson is not valid JSON"))
		}
		if int64(len(trimmed)) > config.MaxDocumentBytes {
			return newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageInvalidArgument, false, errors.New("libraryDocumentJson exceeds size limit"))
		}
		path := filepath.Join(dir, config.LibraryFileName)
		if err := os.WriteFile(path, []byte(trimmed), 0o600); err != nil {
			return migrateFailed(err)
		}
	}
	if trimmed := strings.TrimSpace(settingsJSON); trimmed != "" {
		if !json.Valid([]byte(trimmed)) {
			return newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageInvalidArgument, false, errors.New("settingsJson is not valid JSON"))
		}
		if int64(len(trimmed)) > config.MaxSettingsBytes {
			return newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageInvalidArgument, false, errors.New("settingsJson exceeds size limit"))
		}
		path := filepath.Join(dir, config.SettingsFileName)
		if err := os.WriteFile(path, []byte(trimmed), 0o600); err != nil {
			return migrateFailed(err)
		}
	}
	return nil
}

func listExistingMigratableFiles(dir string) []string {
	found := make([]string, 0, len(config.MigratableDataFileNames))
	for _, name := range config.MigratableDataFileNames {
		info, err := os.Stat(filepath.Join(dir, name))
		if err != nil || info.IsDir() {
			continue
		}
		found = append(found, name)
	}
	return found
}

// copyMissingMigratableFiles 仅复制目标尚不存在的白名单文件。
func copyMissingMigratableFiles(source string, target string) ([]string, error) {
	copied := make([]string, 0, len(config.MigratableDataFileNames))
	for _, name := range config.MigratableDataFileNames {
		to := filepath.Join(target, name)
		if _, err := os.Stat(to); err == nil {
			continue
		}
		from := filepath.Join(source, name)
		info, err := os.Stat(from)
		if errors.Is(err, os.ErrNotExist) {
			continue
		}
		if err != nil {
			return copied, err
		}
		if info.IsDir() {
			continue
		}
		if err := copyFile(from, to); err != nil {
			return copied, err
		}
		copied = append(copied, name)
	}
	return copied, nil
}

func copyMigratableFiles(source string, target string) ([]string, error) {
	migrated := make([]string, 0, len(config.MigratableDataFileNames))
	for _, name := range config.MigratableDataFileNames {
		from := filepath.Join(source, name)
		info, err := os.Stat(from)
		if errors.Is(err, os.ErrNotExist) {
			continue
		}
		if err != nil {
			return migrated, err
		}
		if info.IsDir() {
			continue
		}
		to := filepath.Join(target, name)
		if err := copyFile(from, to); err != nil {
			return migrated, err
		}
		migrated = append(migrated, name)
	}
	return migrated, nil
}

func cleanupDirectoryArtifacts(target string) error {
	return removeMigratableFiles(target, config.MigratableDataFileNames)
}

func copyFile(from string, to string) error {
	input, err := os.Open(from)
	if err != nil {
		return err
	}
	defer input.Close()

	output, err := os.OpenFile(to, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer output.Close()

	if _, err := io.Copy(output, input); err != nil {
		return err
	}
	return output.Sync()
}

func cleanupMigratedFiles(target string, names []string) error {
	return removeMigratableFiles(target, names)
}

func removeMigratableFiles(dir string, names []string) error {
	var first error
	for _, name := range names {
		if err := os.Remove(filepath.Join(dir, name)); err != nil && !errors.Is(err, os.ErrNotExist) && first == nil {
			first = err
		}
	}
	return first
}

func writeDataRootPointer(bootstrap string, dataRoot string, now time.Time) error {
	if err := os.MkdirAll(bootstrap, 0o755); err != nil {
		return err
	}
	pointer := dataRootPointer{
		Format:        config.DataRootFormat,
		SchemaVersion: 1,
		DataRoot:      dataRoot,
		UpdatedAt:     now.Format(time.RFC3339),
	}
	raw, err := json.MarshalIndent(pointer, "", "  ")
	if err != nil {
		return err
	}
	tmp := filepath.Join(bootstrap, config.DataRootFileName+".tmp")
	if err := os.WriteFile(tmp, raw, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, filepath.Join(bootstrap, config.DataRootFileName))
}

func samePath(left string, right string) bool {
	return filepath.Clean(left) == filepath.Clean(right)
}
