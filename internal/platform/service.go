package platform

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"time"

	"github.com/blue-idea/collection/config"
)

type ExportRequest struct {
	SuggestedFileName string `json:"suggestedFileName"`
	DocumentJSON      string `json:"documentJson"`
}

type ExportResult struct {
	State string `json:"state"`
	Path  string `json:"path,omitempty"`
}

type ImportFileResult struct {
	State        string `json:"state"`
	FileName     string `json:"fileName,omitempty"`
	ByteSize     *int64 `json:"byteSize,omitempty"`
	DocumentJSON string `json:"documentJson,omitempty"`
}

type Option func(*Service)

type urlOpener func(rawURL string) error

type Service struct {
	ctx          context.Context
	dialogs      fileDialogs
	maxBytes     int64
	now          func() time.Time
	readFile     func(path string) ([]byte, error)
	writeFile    func(path string, content []byte, permission os.FileMode) error
	openURL      urlOpener
	window       WindowRuntime
	hotkeys      HotkeyManager
	capability   *DesktopCapability
	allowQuit    atomic.Bool
	onBeforeQuit func() // 在 window.Quit 之前执行，用于停止 systray 等资源
}

func NewService(options ...Option) *Service {
	service := &Service{
		maxBytes:  config.MaxDocumentBytes,
		now:       time.Now,
		readFile:  os.ReadFile,
		writeFile: os.WriteFile,
		openURL:   defaultOpenURL,
	}
	for _, option := range options {
		option(service)
	}
	if service.dialogs == nil {
		service.dialogs = wailsDialogs{ctx: service.ctx}
	}
	return service
}

func WithDialogs(dialogs fileDialogs) Option {
	return func(service *Service) { service.dialogs = dialogs }
}

func WithClock(now func() time.Time) Option {
	return func(service *Service) { service.now = now }
}

func WithMaxDocumentBytes(maxBytes int64) Option {
	return func(service *Service) { service.maxBytes = maxBytes }
}

func WithURLOpener(openURL urlOpener) Option {
	return func(service *Service) { service.openURL = openURL }
}

// SetContext 在 Wails OnStartup 时注入运行时上下文，供原生对话框使用。
func (service *Service) SetContext(ctx context.Context) {
	service.ctx = ctx
	if _, ok := service.dialogs.(wailsDialogs); ok || service.dialogs == nil {
		service.dialogs = wailsDialogs{ctx: ctx}
	}
}

func (service *Service) ExportLibrary(request ExportRequest) (ExportResult, error) {
	content, err := buildExportDocument(request.DocumentJSON, service.now())
	if err != nil {
		return ExportResult{}, err
	}

	suggested := request.SuggestedFileName
	if suggested == "" {
		suggested = "linkit-export.json"
	}
	path, cancelled, err := service.dialogs.SaveJSONFile(suggested)
	if err != nil {
		return ExportResult{}, newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
	}
	if cancelled {
		return ExportResult{State: "cancelled"}, nil
	}
	if err := service.writeFile(path, content, 0o600); err != nil {
		return ExportResult{}, newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
	}
	return ExportResult{State: "saved", Path: path}, nil
}

func (service *Service) SelectImportFile() (ImportFileResult, error) {
	path, cancelled, err := service.dialogs.OpenJSONFile()
	if err != nil {
		return ImportFileResult{}, newServiceError(config.ErrorCodeLocalReadFailed, config.ErrorMessageLocalReadFailed, true, err)
	}
	if cancelled {
		return ImportFileResult{State: "cancelled"}, nil
	}

	content, err := service.readFile(path)
	if err != nil {
		return ImportFileResult{}, newServiceError(config.ErrorCodeLocalReadFailed, config.ErrorMessageLocalReadFailed, true, err)
	}
	if err := validateImportContent(content, service.maxBytes); err != nil {
		return ImportFileResult{}, err
	}
	if err := rejectSensitivePayload(content); err != nil {
		// 导入同样拒绝凭据，避免把密钥写入资料库链路。
		return ImportFileResult{}, importInvalidError(err)
	}

	size := int64(len(content))
	return ImportFileResult{
		State:        "selected",
		FileName:     filepath.Base(path),
		ByteSize:     &size,
		DocumentJSON: string(content),
	}, nil
}

// OpenExternalURL 使用系统浏览器打开 HTTP(S) URL；失败时返回错误，前端不得增加访问计数。
func (service *Service) OpenExternalURL(rawURL string) error {
	if err := validateExternalURL(rawURL); err != nil {
		return err
	}
	if err := service.openURL(strings.TrimSpace(rawURL)); err != nil {
		return newServiceError(config.ErrorCodeExternalOpenFailed, config.ErrorMessageExternalOpenFailed, true, err)
	}
	return nil
}
