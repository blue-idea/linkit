package localstore

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"time"

	"github.com/blue-idea/collection/config"
)

type LocalReadResult struct {
	State             string `json:"state"`
	DocumentJSON      string `json:"documentJson,omitempty"`
	RecoveryJSON      string `json:"recoveryJson,omitempty"`
	FileUpdatedAt     string `json:"fileUpdatedAt,omitempty"`
	RecoveryUpdatedAt string `json:"recoveryUpdatedAt,omitempty"`
}

type LocalWriteRequest struct {
	DocumentJSON     string `json:"documentJson"`
	ExpectedRevision int    `json:"expectedRevision"`
}

type LocalReplaceRequest struct {
	DocumentJSON string `json:"documentJson"`
	Confirmed    bool   `json:"confirmed"`
}

type SaveResult struct {
	Revision  int    `json:"revision"`
	UpdatedAt string `json:"updatedAt"`
}

type StorageSummary struct {
	Exists        bool    `json:"exists"`
	Revision      *int    `json:"revision"`
	UpdatedAt     *string `json:"updatedAt"`
	BookmarkCount *int    `json:"bookmarkCount"`
	ByteSize      int64   `json:"byteSize"`
}

type CloudDraftReadResult struct {
	State     string `json:"state"`
	DraftJSON string `json:"draftJson,omitempty"`
}

type CloudDraftWriteRequest struct {
	DraftJSON string `json:"draftJson"`
}

type Option func(*Service)

type Service struct {
	bootstrapRoot string
	rootDir       string
	maxBytes      int64
	now           func() time.Time
	onRootChanged func(dataRoot string)
	ctx           context.Context
	dirDialog     directoryDialog
}

func DefaultRootDir() (string, error) {
	root, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, config.AppDataDirectoryName), nil
}

func NewDefaultService(options ...Option) (*Service, error) {
	bootstrapRoot, err := DefaultRootDir()
	if err != nil {
		return nil, err
	}
	dataRoot, err := ResolveEffectiveDataRoot(bootstrapRoot)
	if err != nil {
		return nil, err
	}
	combined := append([]Option{WithBootstrapRoot(bootstrapRoot)}, options...)
	return NewService(dataRoot, combined...), nil
}

func NewService(rootDir string, options ...Option) *Service {
	service := &Service{
		bootstrapRoot: rootDir,
		rootDir:       rootDir,
		maxBytes:      config.MaxDocumentBytes,
		now:           time.Now,
	}
	for _, option := range options {
		option(service)
	}
	return service
}

func WithClock(now func() time.Time) Option {
	return func(service *Service) { service.now = now }
}

func WithMaxDocumentBytes(maxBytes int64) Option {
	return func(service *Service) { service.maxBytes = maxBytes }
}

func (service *Service) ReadLibrary() (LocalReadResult, error) {
	primary, primaryUpdatedAt, primaryExists, primaryErr := service.readLibraryFile(config.LibraryFileName)
	if primaryErr == nil && primaryExists {
		return LocalReadResult{
			State:         "found",
			DocumentJSON:  string(primary),
			FileUpdatedAt: primaryUpdatedAt,
		}, nil
	}
	if primaryErr != nil && !hasErrorCode(primaryErr, config.ErrorCodeDocumentInvalid) {
		return LocalReadResult{}, primaryErr
	}

	recovery, recoveryUpdatedAt, recoveryExists, recoveryErr := service.readLibraryFile(config.LibraryBackupName)
	if recoveryErr == nil && recoveryExists {
		return LocalReadResult{
			State:             "recovery_available",
			RecoveryJSON:      string(recovery),
			FileUpdatedAt:     primaryUpdatedAt,
			RecoveryUpdatedAt: recoveryUpdatedAt,
		}, nil
	}
	if recoveryErr != nil && !hasErrorCode(recoveryErr, config.ErrorCodeDocumentInvalid) {
		return LocalReadResult{}, recoveryErr
	}
	if !primaryExists && !recoveryExists {
		return LocalReadResult{State: "empty"}, nil
	}
	return LocalReadResult{}, invalidDocumentError(nil)
}

func (service *Service) WriteLibrary(request LocalWriteRequest) (SaveResult, error) {
	updated, result, err := updateLibraryDocument([]byte(request.DocumentJSON), request.ExpectedRevision, service.now(), service.maxBytes)
	if err != nil {
		return SaveResult{}, err
	}
	currentPath := service.path(config.LibraryFileName)
	if current, _, exists, readErr := service.readLibraryFile(config.LibraryFileName); readErr != nil {
		return SaveResult{}, service.normalizeWriteReadError(readErr)
	} else if exists {
		document, decodeErr := decodeLibraryDocument(current, service.maxBytes)
		if decodeErr != nil {
			return SaveResult{}, decodeErr
		}
		if document.Revision != request.ExpectedRevision {
			return SaveResult{}, newServiceError(
				config.ErrorCodeInvalidArgument,
				config.ErrorMessageInvalidArgument,
				false,
				errors.New("stored revision does not match expected revision"),
			)
		}
	}
	if err := atomicReplace(
		systemFileOperations{},
		currentPath,
		service.path(config.LibraryTemporaryName),
		service.path(config.LibraryBackupName),
		updated,
		true,
	); err != nil {
		return SaveResult{}, err
	}
	return result, nil
}

func (service *Service) ReplaceLibrary(request LocalReplaceRequest) (SaveResult, error) {
	if !request.Confirmed {
		return SaveResult{}, newServiceError(
			config.ErrorCodeInvalidArgument,
			config.ErrorMessageInvalidArgument,
			false,
			errors.New("replacement was not confirmed"),
		)
	}
	document, err := decodeLibraryDocument([]byte(request.DocumentJSON), service.maxBytes)
	if err != nil {
		return SaveResult{}, err
	}
	updated, result, err := updateLibraryDocument([]byte(request.DocumentJSON), document.Revision, service.now(), service.maxBytes)
	if err != nil {
		return SaveResult{}, err
	}
	preserveCurrent := false
	if _, _, exists, readErr := service.readLibraryFile(config.LibraryFileName); readErr == nil && exists {
		preserveCurrent = true
	} else if readErr != nil && !hasErrorCode(readErr, config.ErrorCodeDocumentInvalid) {
		return SaveResult{}, service.normalizeWriteReadError(readErr)
	}
	if err := atomicReplace(
		systemFileOperations{},
		service.path(config.LibraryFileName),
		service.path(config.LibraryTemporaryName),
		service.path(config.LibraryBackupName),
		updated,
		preserveCurrent,
	); err != nil {
		return SaveResult{}, err
	}
	return result, nil
}

func (service *Service) DescribeLocalLibrary() (StorageSummary, error) {
	content, _, exists, err := service.readLibraryFile(config.LibraryFileName)
	if err != nil {
		return StorageSummary{}, err
	}
	if !exists {
		return StorageSummary{Exists: false, ByteSize: 0}, nil
	}
	document, err := decodeLibraryDocument(content, service.maxBytes)
	if err != nil {
		return StorageSummary{}, err
	}
	bookmarkCount, err := libraryBookmarkCount(document)
	if err != nil {
		return StorageSummary{}, err
	}
	revision := document.Revision
	updatedAt := document.UpdatedAt
	return StorageSummary{
		Exists:        true,
		Revision:      &revision,
		UpdatedAt:     &updatedAt,
		BookmarkCount: &bookmarkCount,
		ByteSize:      int64(len(content)),
	}, nil
}

func (service *Service) ReadCloudDraft() (CloudDraftReadResult, error) {
	content, exists, err := service.readFile(config.CloudDraftFileName)
	if err != nil {
		return CloudDraftReadResult{}, err
	}
	if !exists {
		return CloudDraftReadResult{State: "empty"}, nil
	}
	if _, err := decodeCloudDraft(content, service.maxBytes); err != nil {
		return CloudDraftReadResult{}, storedDocumentError(err)
	}
	return CloudDraftReadResult{State: "found", DraftJSON: string(content)}, nil
}

func (service *Service) WriteCloudDraft(request CloudDraftWriteRequest) error {
	content := []byte(request.DraftJSON)
	if _, err := decodeCloudDraft(content, service.maxBytes); err != nil {
		return err
	}
	return atomicReplace(
		systemFileOperations{},
		service.path(config.CloudDraftFileName),
		service.path(config.CloudDraftTemporaryName),
		"",
		content,
		false,
	)
}

func (service *Service) ClearCloudDraft() error {
	content, exists, err := service.readFile(config.CloudDraftFileName)
	if err != nil || !exists {
		return err
	}
	document, err := decodeCloudDraft(content, service.maxBytes)
	if err != nil {
		return err
	}
	if *document.Dirty {
		return newServiceError(
			config.ErrorCodeInvalidArgument,
			config.ErrorMessageCloudDraftDirty,
			false,
			errors.New("dirty draft must be resolved before clearing"),
		)
	}
	if err := os.Remove(service.path(config.CloudDraftFileName)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
	}
	return nil
}

func (service *Service) path(name string) string {
	return filepath.Join(service.rootDir, name)
}

func (service *Service) readFile(name string) ([]byte, bool, error) {
	path := service.path(name)
	content, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		rootInfo, rootErr := os.Stat(service.rootDir)
		if rootErr == nil && !rootInfo.IsDir() {
			return nil, false, newServiceError(config.ErrorCodeLocalReadFailed, config.ErrorMessageLocalReadFailed, true, err)
		}
		if rootErr != nil && !errors.Is(rootErr, os.ErrNotExist) {
			return nil, false, newServiceError(config.ErrorCodeLocalReadFailed, config.ErrorMessageLocalReadFailed, true, rootErr)
		}
		return nil, false, nil
	}
	if err != nil {
		return nil, false, newServiceError(config.ErrorCodeLocalReadFailed, config.ErrorMessageLocalReadFailed, true, err)
	}
	return content, true, nil
}

func (service *Service) readLibraryFile(name string) ([]byte, string, bool, error) {
	content, exists, err := service.readFile(name)
	if err != nil || !exists {
		return nil, "", exists, err
	}
	if _, err := decodeLibraryDocument(content, service.maxBytes); err != nil {
		return nil, fileUpdatedAt(service.path(name)), true, storedDocumentError(err)
	}
	return content, fileUpdatedAt(service.path(name)), true, nil
}

func fileUpdatedAt(path string) string {
	info, err := os.Stat(path)
	if err != nil {
		return ""
	}
	return info.ModTime().UTC().Format(time.RFC3339Nano)
}

func hasErrorCode(err error, code string) bool {
	var serviceError *ServiceError
	return errors.As(err, &serviceError) && serviceError.ErrorCode() == code
}

func storedDocumentError(err error) error {
	if hasErrorCode(err, config.ErrorCodeInvalidArgument) {
		return invalidDocumentError(err)
	}
	return err
}

func (service *Service) normalizeWriteReadError(err error) error {
	if !hasErrorCode(err, config.ErrorCodeLocalReadFailed) {
		return err
	}
	rootInfo, statErr := os.Stat(service.rootDir)
	if statErr == nil && !rootInfo.IsDir() {
		return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
	}
	return err
}
