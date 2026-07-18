package localstore

import (
	"errors"
	"io"
	"io/fs"
	"path/filepath"
	"testing"
)

type failingRenameOperations struct {
	fileOperations
	oldPath string
	newPath string
}

type failingStatOperations struct {
	fileOperations
	path string
}

func (operations failingStatOperations) Stat(path string) (fs.FileInfo, error) {
	if path == operations.path {
		return nil, errors.New("injected stat failure")
	}
	return operations.fileOperations.Stat(path)
}

type failingRemoveOperations struct {
	fileOperations
	path string
}

func (operations failingRemoveOperations) Remove(path string) error {
	if path == operations.path {
		return errors.New("injected remove failure")
	}
	return operations.fileOperations.Remove(path)
}

type atomicTestPaths struct {
	target    string
	temporary string
	backup    string
}

type fixedOpenFileOperations struct {
	fileOperations
	file    syncedFile
	openErr error
}

func (operations fixedOpenFileOperations) OpenFile(string, int, fs.FileMode) (syncedFile, error) {
	if operations.openErr != nil {
		return nil, operations.openErr
	}
	return operations.file, nil
}

type shortWriteFile struct{}

func (shortWriteFile) Write(content []byte) (int, error) {
	return len(content) - 1, nil
}

func (shortWriteFile) Sync() error {
	return nil
}

func (shortWriteFile) Close() error {
	return nil
}

type controlledFile struct {
	writeErr error
	syncErr  error
	closeErr error
}

func (file controlledFile) Write(content []byte) (int, error) {
	if file.writeErr != nil {
		return 0, file.writeErr
	}
	return len(content), nil
}

func (file controlledFile) Sync() error {
	return file.syncErr
}

func (file controlledFile) Close() error {
	return file.closeErr
}

func (operations failingRenameOperations) Rename(oldPath string, newPath string) error {
	if oldPath == operations.oldPath && newPath == operations.newPath {
		return errors.New("injected rename failure")
	}
	return operations.fileOperations.Rename(oldPath, newPath)
}

func TestAtomicReplaceFailurePreservesCurrentAndBackup(t *testing.T) {
	paths := prepareAtomicTestPaths(t)
	files := failingRenameOperations{
		fileOperations: systemFileOperations{},
		oldPath:        paths.temporary,
		newPath:        paths.target,
	}

	// REQ-027-AC-003：最终替换失败时必须同时保留原正式文件与原备份。
	err := atomicReplace(files, paths.target, paths.temporary, paths.backup, []byte("next"), true)

	assertError(t, err, "LOCAL_WRITE_FAILED", true)
	assertAtomicTestState(t, paths)
}

func TestWriteSyncedFileRejectsShortWrite(t *testing.T) {
	files := fixedOpenFileOperations{
		fileOperations: systemFileOperations{},
		file:           shortWriteFile{},
	}

	// REQ-027-AC-003：短写不得被误报为持久化成功。
	err := writeSyncedFile(files, filepath.Join(t.TempDir(), "library.json.tmp"), []byte("document"))

	if !errors.Is(err, io.ErrShortWrite) {
		t.Fatalf("Unexpected short write result: %v", err)
	}
}

func TestWriteSyncedFilePropagatesFileErrors(t *testing.T) {
	testError := errors.New("injected file failure")
	tests := []struct {
		name    string
		openErr error
		file    syncedFile
	}{
		{name: "打开失败", openErr: testError},
		{name: "写入失败", file: controlledFile{writeErr: testError}},
		{name: "同步失败", file: controlledFile{syncErr: testError}},
		{name: "关闭失败", file: controlledFile{closeErr: testError}},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			files := fixedOpenFileOperations{
				fileOperations: systemFileOperations{},
				file:           test.file,
				openErr:        test.openErr,
			}

			// REQ-027-AC-003：任一文件 I/O 失败都不得被误报为持久化成功。
			err := writeSyncedFile(files, filepath.Join(t.TempDir(), "library.json.tmp"), []byte("document"))
			if !errors.Is(err, testError) {
				t.Fatalf("Unexpected file error result: %v", err)
			}
		})
	}
}

func TestAtomicBackupFailureRollsBackEntireReplace(t *testing.T) {
	paths := prepareAtomicTestPaths(t)
	files := failingRenameOperations{
		fileOperations: systemFileOperations{},
		oldPath:        paths.target + ".previous",
		newPath:        paths.backup,
	}

	// REQ-027-AC-003：备份提交失败时不得留下部分成功的新正式文件。
	err := atomicReplace(files, paths.target, paths.temporary, paths.backup, []byte("next"), true)

	assertError(t, err, "LOCAL_WRITE_FAILED", true)
	assertAtomicTestState(t, paths)
}

func TestAtomicReplacePreparationFailuresPreserveState(t *testing.T) {
	tests := []struct {
		name  string
		files func(paths atomicTestPaths) fileOperations
	}{
		{
			name: "目标状态读取失败",
			files: func(paths atomicTestPaths) fileOperations {
				return failingStatOperations{fileOperations: systemFileOperations{}, path: paths.target}
			},
		},
		{
			name: "恢复路径清理失败",
			files: func(paths atomicTestPaths) fileOperations {
				return failingRemoveOperations{fileOperations: systemFileOperations{}, path: paths.target + ".previous"}
			},
		},
		{
			name: "正式文件暂存失败",
			files: func(paths atomicTestPaths) fileOperations {
				return failingRenameOperations{fileOperations: systemFileOperations{}, oldPath: paths.target, newPath: paths.target + ".previous"}
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			paths := prepareAtomicTestPaths(t)

			// REQ-027-AC-003：替换准备阶段失败时不得改变任何有效持久化状态。
			err := atomicReplace(test.files(paths), paths.target, paths.temporary, paths.backup, []byte("next"), true)

			assertError(t, err, "LOCAL_WRITE_FAILED", true)
			assertAtomicTestState(t, paths)
		})
	}
}

func TestAtomicReplaceRejectsNonDirectoryRoot(t *testing.T) {
	parent := t.TempDir()
	rootFile := filepath.Join(parent, "blocked-root")
	writeFile(t, rootFile, "root-content")
	target := filepath.Join(rootFile, "library.json")
	temporary := filepath.Join(rootFile, "library.json.tmp")

	// REQ-027-AC-003：无法创建存储目录时必须返回写入错误且保留根路径内容。
	err := atomicReplace(systemFileOperations{}, target, temporary, "", []byte("next"), false)

	assertError(t, err, "LOCAL_WRITE_FAILED", true)
	if actual := readFile(t, rootFile); actual != "root-content" {
		t.Fatalf("Root file changed after failed directory creation: got %q", actual)
	}
}

func TestAtomicBackupPreparationFailuresRollBackState(t *testing.T) {
	tests := []struct {
		name  string
		files func(paths atomicTestPaths) fileOperations
	}{
		{
			name: "旧备份暂存路径清理失败",
			files: func(paths atomicTestPaths) fileOperations {
				return failingRemoveOperations{fileOperations: systemFileOperations{}, path: paths.backup + ".previous"}
			},
		},
		{
			name: "旧备份状态读取失败",
			files: func(paths atomicTestPaths) fileOperations {
				return failingStatOperations{fileOperations: systemFileOperations{}, path: paths.backup}
			},
		},
		{
			name: "旧备份暂存失败",
			files: func(paths atomicTestPaths) fileOperations {
				return failingRenameOperations{fileOperations: systemFileOperations{}, oldPath: paths.backup, newPath: paths.backup + ".previous"}
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			paths := prepareAtomicTestPaths(t)

			// REQ-027-AC-003：备份准备失败时必须回滚新正式文件并恢复原状态。
			err := atomicReplace(test.files(paths), paths.target, paths.temporary, paths.backup, []byte("next"), true)

			assertError(t, err, "LOCAL_WRITE_FAILED", true)
			assertAtomicTestState(t, paths)
		})
	}
}

func prepareAtomicTestPaths(t *testing.T) atomicTestPaths {
	t.Helper()
	root := t.TempDir()
	paths := atomicTestPaths{
		target:    filepath.Join(root, "library.json"),
		temporary: filepath.Join(root, "library.json.tmp"),
		backup:    filepath.Join(root, "library.json.bak"),
	}
	writeFile(t, paths.target, "current")
	writeFile(t, paths.backup, "previous")
	return paths
}

func assertAtomicTestState(t *testing.T, paths atomicTestPaths) {
	t.Helper()
	if actual := readFile(t, paths.target); actual != "current" {
		t.Fatalf("Current document changed after failed replace: got %q", actual)
	}
	if actual := readFile(t, paths.backup); actual != "previous" {
		t.Fatalf("Backup document changed after failed replace: got %q", actual)
	}
	assertPathMissing(t, paths.temporary)
	assertPathMissing(t, paths.target+".previous")
}
