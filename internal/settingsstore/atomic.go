package settingsstore

import (
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/blue-idea/collection/config"
)

type syncedFile interface {
	Write(content []byte) (int, error)
	Sync() error
	Close() error
}

type fileOperations interface {
	MkdirAll(path string, permission fs.FileMode) error
	OpenFile(path string, flag int, permission fs.FileMode) (syncedFile, error)
	Stat(path string) (fs.FileInfo, error)
	Remove(path string) error
	Rename(oldPath string, newPath string) error
	ReadFile(path string) ([]byte, error)
}

type systemFileOperations struct{}

func (systemFileOperations) MkdirAll(path string, permission fs.FileMode) error {
	return os.MkdirAll(path, permission)
}

func (systemFileOperations) OpenFile(path string, flag int, permission fs.FileMode) (syncedFile, error) {
	return os.OpenFile(path, flag, permission)
}

func (systemFileOperations) Stat(path string) (fs.FileInfo, error) {
	return os.Stat(path)
}

func (systemFileOperations) Remove(path string) error {
	return os.Remove(path)
}

func (systemFileOperations) Rename(oldPath string, newPath string) error {
	return os.Rename(oldPath, newPath)
}

func (systemFileOperations) ReadFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}

func ensureDirectory(files fileOperations, path string) error {
	if err := files.MkdirAll(path, 0o700); err != nil {
		return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
	}
	return nil
}

func writeSyncedFile(files fileOperations, path string, content []byte) (resultErr error) {
	file, err := files.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := file.Close(); resultErr == nil && closeErr != nil {
			resultErr = closeErr
		}
	}()
	written, err := file.Write(content)
	if err != nil {
		return err
	}
	if written != len(content) {
		return io.ErrShortWrite
	}
	return file.Sync()
}

// atomicReplace 先写临时文件，再将旧正式文件转为备份，最后替换正式文件。
func atomicReplace(files fileOperations, target string, temporary string, backup string, content []byte) (resultErr error) {
	if err := ensureDirectory(files, filepath.Dir(target)); err != nil {
		return err
	}
	defer func() {
		if removeErr := files.Remove(temporary); resultErr == nil && removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			resultErr = newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, removeErr)
		}
	}()
	if err := writeSyncedFile(files, temporary, content); err != nil {
		return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
	}

	_, targetErr := files.Stat(target)
	targetExists := targetErr == nil
	if targetErr != nil && !errors.Is(targetErr, os.ErrNotExist) {
		return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, targetErr)
	}

	recoveryPath := target + ".previous"
	if targetExists {
		if err := files.Remove(recoveryPath); err != nil && !errors.Is(err, os.ErrNotExist) {
			return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
		}
		if err := files.Rename(target, recoveryPath); err != nil {
			return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
		}
	}

	if err := files.Rename(temporary, target); err != nil {
		if targetExists {
			_ = files.Rename(recoveryPath, target)
		}
		return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
	}

	if targetExists {
		if err := commitRecoveryAsBackup(files, recoveryPath, backup); err != nil {
			_ = files.Rename(target, temporary)
			_ = files.Rename(recoveryPath, target)
			return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
		}
	}
	return nil
}

func commitRecoveryAsBackup(files fileOperations, recoveryPath string, backupPath string) error {
	stagingPath := backupPath + ".previous"
	if err := files.Remove(stagingPath); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	_, statErr := files.Stat(backupPath)
	backupExists := statErr == nil
	if statErr != nil && !errors.Is(statErr, os.ErrNotExist) {
		return statErr
	}
	if backupExists {
		if err := files.Rename(backupPath, stagingPath); err != nil {
			return err
		}
	}
	if err := files.Rename(recoveryPath, backupPath); err != nil {
		if backupExists {
			_ = files.Rename(stagingPath, backupPath)
		}
		return err
	}
	if backupExists {
		_ = files.Remove(stagingPath)
	}
	return nil
}
