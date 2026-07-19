package settingsstore

import (
	"errors"
	"os"
	"path/filepath"
	"time"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/localstore"
)

type SettingsReadResult struct {
	State        string `json:"state"`
	SettingsJSON string `json:"settingsJson"`
}

type SettingsWriteRequest struct {
	SettingsJSON string `json:"settingsJson"`
}

type AIConsentStatus struct {
	Granted   bool    `json:"granted"`
	GrantedAt *string `json:"grantedAt"`
}

type Option func(*Service)

type Service struct {
	rootDir  string
	maxBytes int64
	now      func() time.Time
	files    fileOperations
}

func DefaultRootDir() (string, error) {
	root, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, config.AppDataDirectoryName), nil
}

func NewDefaultService() (*Service, error) {
	bootstrapRoot, err := localstore.DefaultRootDir()
	if err != nil {
		return nil, err
	}
	dataRoot, err := localstore.ResolveEffectiveDataRoot(bootstrapRoot)
	if err != nil {
		return nil, err
	}
	return NewService(dataRoot), nil
}

func NewService(rootDir string, options ...Option) *Service {
	service := &Service{
		rootDir:  rootDir,
		maxBytes: config.MaxSettingsBytes,
		now:      time.Now,
		files:    systemFileOperations{},
	}
	for _, option := range options {
		option(service)
	}
	return service
}

// SetRootDir 在数据根迁移成功后同步有效设置目录。
func (service *Service) SetRootDir(dataRoot string) {
	service.rootDir = filepath.Clean(dataRoot)
}

func WithClock(now func() time.Time) Option {
	return func(service *Service) { service.now = now }
}

func (service *Service) ReadSettings() (SettingsReadResult, error) {
	primary, primaryErr := service.readSettingsFile(config.SettingsFileName)
	if primaryErr == nil {
		encoded, err := encodeSettings(primary)
		if err != nil {
			return SettingsReadResult{}, newServiceError(config.ErrorCodeLocalReadFailed, config.ErrorMessageLocalReadFailed, true, err)
		}
		return SettingsReadResult{State: "found", SettingsJSON: encoded}, nil
	}
	if !isInvalidSettings(primaryErr) && !errors.Is(primaryErr, os.ErrNotExist) {
		return SettingsReadResult{}, primaryErr
	}

	if !errors.Is(primaryErr, os.ErrNotExist) {
		backup, backupErr := service.readSettingsFile(config.SettingsBackupName)
		if backupErr == nil {
			encoded, err := encodeSettings(backup)
			if err != nil {
				return SettingsReadResult{}, newServiceError(config.ErrorCodeLocalReadFailed, config.ErrorMessageLocalReadFailed, true, err)
			}
			return SettingsReadResult{State: "found", SettingsJSON: encoded}, nil
		}
		if !isInvalidSettings(backupErr) && !errors.Is(backupErr, os.ErrNotExist) {
			return SettingsReadResult{}, backupErr
		}
	}

	defaults, err := defaultSettingsJSON()
	if err != nil {
		return SettingsReadResult{}, newServiceError(config.ErrorCodeLocalReadFailed, config.ErrorMessageLocalReadFailed, true, err)
	}
	return SettingsReadResult{State: "default", SettingsJSON: defaults}, nil
}

func (service *Service) WriteSettings(request SettingsWriteRequest) error {
	settings, err := decodeAndValidateSettings([]byte(request.SettingsJSON))
	if err != nil {
		return err
	}
	clearMismatchedConsent(&settings)
	encoded, err := encodeSettings(settings)
	if err != nil {
		return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
	}
	return atomicReplace(
		service.files,
		filepath.Join(service.rootDir, config.SettingsFileName),
		filepath.Join(service.rootDir, config.SettingsTemporaryName),
		filepath.Join(service.rootDir, config.SettingsBackupName),
		[]byte(encoded),
	)
}

func (service *Service) GetAIConsentStatus(apiBase string) (AIConsentStatus, error) {
	if err := validateAPIBase(apiBase, false); err != nil {
		return AIConsentStatus{}, err
	}
	settings, err := service.loadCurrentOrDefault()
	if err != nil {
		return AIConsentStatus{}, err
	}
	if !consentMatches(settings, apiBase) {
		return AIConsentStatus{Granted: false, GrantedAt: nil}, nil
	}
	grantedAt := settings.AIConsent.GrantedAt
	return AIConsentStatus{Granted: true, GrantedAt: &grantedAt}, nil
}

func (service *Service) GrantAIConsent(apiBase string) error {
	if err := validateAPIBase(apiBase, false); err != nil {
		return err
	}
	settings, err := service.loadCurrentOrDefault()
	if err != nil {
		return err
	}
	normalized := normalizeAPIBase(apiBase)
	if normalizeAPIBase(settings.AI.APIBase) != normalized {
		return invalidSettingsError(errors.New("consent apiBase must match configured AI apiBase"))
	}
	settings.AIConsent = &aiConsent{
		APIBase:   normalized,
		GrantedAt: service.now().UTC().Format(time.RFC3339),
	}
	encoded, err := encodeSettings(settings)
	if err != nil {
		return newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
	}
	return service.WriteSettings(SettingsWriteRequest{SettingsJSON: encoded})
}

func (service *Service) loadCurrentOrDefault() (appSettings, error) {
	result, err := service.ReadSettings()
	if err != nil {
		return appSettings{}, err
	}
	return decodeAndValidateSettings([]byte(result.SettingsJSON))
}

func (service *Service) readSettingsFile(name string) (appSettings, error) {
	path := filepath.Join(service.rootDir, name)
	content, err := service.files.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return appSettings{}, err
		}
		return appSettings{}, newServiceError(config.ErrorCodeLocalReadFailed, config.ErrorMessageLocalReadFailed, true, err)
	}
	return decodeAndValidateSettings(content)
}

func isInvalidSettings(err error) bool {
	var serviceError *ServiceError
	return errors.As(err, &serviceError) && serviceError.ErrorCode() == config.ErrorCodeSettingsInvalid
}
