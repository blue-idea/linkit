package platform

import (
	"errors"
	"runtime"
	"sync/atomic"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/hotkey"
)

// WindowRuntime 抽象 Wails 窗口显隐与退出。
type WindowRuntime interface {
	Show() error
	Hide() error
	Quit() error
	IsVisible() bool
}

// HotkeyManager 抽象全局热键管理。
type HotkeyManager interface {
	SetAccelerator(accelerator string) error
	SetOnTrigger(fn func())
}

type SetToggleWindowHotkeyRequest struct {
	Accelerator string `json:"accelerator"`
}

type DesktopCapability struct {
	TrayAvailable         bool   `json:"trayAvailable"`
	GlobalHotkeyAvailable bool   `json:"globalHotkeyAvailable"`
	Platform              string `json:"platform"`
}

func WithWindowRuntime(window WindowRuntime) Option {
	return func(service *Service) { service.window = window }
}

func WithHotkeyManager(manager HotkeyManager) Option {
	return func(service *Service) { service.hotkeys = manager }
}

func WithDesktopCapability(capability DesktopCapability) Option {
	return func(service *Service) {
		service.capability = &capability
	}
}

// ShouldPreventClose 在 allowQuit=false 时拦截退出，配合 HideWindowOnClose 实现关闭隐藏。
// REQ-030-AC-001
func (service *Service) ShouldPreventClose() bool {
	return !service.allowQuit.Load()
}

// ShowMainWindow 显示并聚焦主窗口。
// REQ-030-AC-003
func (service *Service) ShowMainWindow() error {
	if service.window == nil {
		return newServiceError(config.ErrorCodeInvalidArgument, "Window runtime is not configured", false, nil)
	}
	return service.window.Show()
}

// HideMainWindow 隐藏主窗口且不退出。
func (service *Service) HideMainWindow() error {
	if service.window == nil {
		return newServiceError(config.ErrorCodeInvalidArgument, "Window runtime is not configured", false, nil)
	}
	return service.window.Hide()
}

// ToggleMainWindow 切换主窗口显隐。
// REQ-030-AC-005
func (service *Service) ToggleMainWindow() error {
	if service.window == nil {
		return newServiceError(config.ErrorCodeInvalidArgument, "Window runtime is not configured", false, nil)
	}
	if service.window.IsVisible() {
		return service.window.Hide()
	}
	return service.window.Show()
}

// QuitApplication 允许进程退出并调用运行时 Quit。
// REQ-030-AC-004
func (service *Service) QuitApplication() error {
	service.allowQuit.Store(true)
	if service.window == nil {
		return nil
	}
	return service.window.Quit()
}

// SetToggleWindowHotkey 注册/替换窗口显隐全局热键。
// REQ-030-AC-007
func (service *Service) SetToggleWindowHotkey(request SetToggleWindowHotkeyRequest) error {
	if service.hotkeys == nil {
		return newServiceError(config.ErrorCodeHotkeyUnavailable, config.ErrorMessageHotkeyUnavailable, true, nil)
	}
	err := service.hotkeys.SetAccelerator(request.Accelerator)
	if err == nil {
		return nil
	}
	if errors.Is(err, hotkey.ErrInvalidAccelerator) {
		return newServiceError(config.ErrorCodeHotkeyInvalid, config.ErrorMessageHotkeyInvalid, false, err)
	}
	if errors.Is(err, hotkey.ErrUnavailable) {
		return newServiceError(config.ErrorCodeHotkeyUnavailable, config.ErrorMessageHotkeyUnavailable, true, err)
	}
	return newServiceError(config.ErrorCodeHotkeyUnavailable, config.ErrorMessageHotkeyUnavailable, true, err)
}

// WireHotkeyToggle 将全局热键触发接到 ToggleMainWindow。
func (service *Service) WireHotkeyToggle() error {
	if service.hotkeys == nil {
		return newServiceError(config.ErrorCodeHotkeyUnavailable, config.ErrorMessageHotkeyUnavailable, true, nil)
	}
	service.hotkeys.SetOnTrigger(func() {
		_ = service.ToggleMainWindow()
	})
	return nil
}

// GetDesktopCapability 返回托盘与全局热键能力探测结果。
// REQ-030-AC-010
func (service *Service) GetDesktopCapability() DesktopCapability {
	if service.capability != nil {
		return *service.capability
	}
	return defaultDesktopCapability()
}

func defaultDesktopCapability() DesktopCapability {
	switch runtime.GOOS {
	case "windows":
		return DesktopCapability{TrayAvailable: true, GlobalHotkeyAvailable: true, Platform: "windows"}
	case "darwin":
		return DesktopCapability{TrayAvailable: true, GlobalHotkeyAvailable: true, Platform: "darwin"}
	case "linux":
		// Linux 为 best-effort：默认标记可用，运行时失败时由调用方降级。
		return DesktopCapability{TrayAvailable: true, GlobalHotkeyAvailable: true, Platform: "linux"}
	default:
		return DesktopCapability{TrayAvailable: false, GlobalHotkeyAvailable: false, Platform: "unknown"}
	}
}

// 供测试与装配读取退出意图。
func (service *Service) AllowQuit() *atomic.Bool {
	return &service.allowQuit
}
