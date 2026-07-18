package settingsstore

import (
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"testing"

	"github.com/blue-idea/collection/config"
)

type failingRenameOperations struct {
	fileOperations
	oldPath string
	newPath string
}

func (operations failingRenameOperations) Rename(oldPath string, newPath string) error {
	if oldPath == operations.oldPath && newPath == operations.newPath {
		return errors.New("injected rename failure")
	}
	return operations.fileOperations.Rename(oldPath, newPath)
}

type failingMkdirOperations struct {
	fileOperations
}

func (failingMkdirOperations) MkdirAll(string, fs.FileMode) error {
	return errors.New("injected mkdir failure")
}

type shortWriteFile struct{}

func (shortWriteFile) Write(content []byte) (int, error) {
	return len(content) - 1, nil
}

func (shortWriteFile) Sync() error { return nil }

func (shortWriteFile) Close() error { return nil }

type fixedOpenFileOperations struct {
	fileOperations
	file syncedFile
}

func (operations fixedOpenFileOperations) OpenFile(string, int, fs.FileMode) (syncedFile, error) {
	return operations.file, nil
}

func TestAtomicReplaceFailurePreservesExistingSettings(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, config.SettingsFileName)
	temporary := filepath.Join(root, config.SettingsTemporaryName)
	backup := filepath.Join(root, config.SettingsBackupName)
	if err := os.WriteFile(target, []byte(`{"ok":true}`), 0o600); err != nil {
		t.Fatalf("Unable to seed settings: %v", err)
	}

	files := failingRenameOperations{
		fileOperations: systemFileOperations{},
		oldPath:        temporary,
		newPath:        target,
	}
	err := atomicReplace(files, target, temporary, backup, []byte(`{"next":true}`))
	assertCodedError(t, err, config.ErrorCodeLocalWriteFailed, true)

	content, readErr := os.ReadFile(target)
	if readErr != nil || string(content) != `{"ok":true}` {
		t.Fatalf("Original settings must remain after failed replace: %s (%v)", content, readErr)
	}
	if _, err := os.Stat(temporary); !os.IsNotExist(err) {
		t.Fatalf("Temporary file should be cleaned up")
	}
}

func TestAtomicReplaceRejectsDirectoryCreationFailure(t *testing.T) {
	err := atomicReplace(
		failingMkdirOperations{fileOperations: systemFileOperations{}},
		filepath.Join(t.TempDir(), "nested", config.SettingsFileName),
		filepath.Join(t.TempDir(), config.SettingsTemporaryName),
		filepath.Join(t.TempDir(), config.SettingsBackupName),
		[]byte(`{}`),
	)
	assertCodedError(t, err, config.ErrorCodeLocalWriteFailed, true)
}

func TestWriteSyncedFileRejectsShortWrite(t *testing.T) {
	files := fixedOpenFileOperations{
		fileOperations: systemFileOperations{},
		file:           shortWriteFile{},
	}
	err := writeSyncedFile(files, filepath.Join(t.TempDir(), "settings.tmp"), []byte("abcdef"))
	if !errors.Is(err, io.ErrShortWrite) {
		t.Fatalf("Expected io.ErrShortWrite, got %v", err)
	}
}

type failingBackupRenameOperations struct {
	fileOperations
	backupPath string
}

func (operations failingBackupRenameOperations) Rename(oldPath string, newPath string) error {
	if newPath == operations.backupPath {
		return errors.New("injected backup rename failure")
	}
	return operations.fileOperations.Rename(oldPath, newPath)
}

func TestAtomicReplaceRollsBackWhenBackupCommitFails(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, config.SettingsFileName)
	temporary := filepath.Join(root, config.SettingsTemporaryName)
	backup := filepath.Join(root, config.SettingsBackupName)
	if err := os.WriteFile(target, []byte(`{"theme":"midnight"}`), 0o600); err != nil {
		t.Fatalf("Unable to seed settings: %v", err)
	}

	files := failingBackupRenameOperations{
		fileOperations: systemFileOperations{},
		backupPath:     backup,
	}
	err := atomicReplace(files, target, temporary, backup, []byte(`{"theme":"ocean"}`))
	assertCodedError(t, err, config.ErrorCodeLocalWriteFailed, true)

	content, readErr := os.ReadFile(target)
	if readErr != nil || string(content) != `{"theme":"midnight"}` {
		t.Fatalf("Failed backup commit must restore original settings: %s (%v)", content, readErr)
	}
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

func TestAtomicReplaceRejectsTargetStatFailure(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, config.SettingsFileName)
	temporary := filepath.Join(root, config.SettingsTemporaryName)
	backup := filepath.Join(root, config.SettingsBackupName)
	files := failingStatOperations{
		fileOperations: systemFileOperations{},
		path:           target,
	}
	err := atomicReplace(files, target, temporary, backup, []byte(`{"theme":"ocean"}`))
	assertCodedError(t, err, config.ErrorCodeLocalWriteFailed, true)
}
