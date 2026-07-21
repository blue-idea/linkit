package platform

import (
	"errors"
	"runtime"
	"sync/atomic"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/hotkey"
)

// WindowRuntime 抽象 Wails 窗口显隐、尺寸与退出。
type WindowRuntime interface {
	Show() error
	Hide() error
	Quit() error
	IsVisible() bool
	SetSize(width, height int) error
}

// HotkeyManager 抽象全局热键管理。
type HotkeyManager interface {
	SetAccelerator(accelerator string) error
	SetOnTrigger(fn func())
}

type SetToggleWindowHotkeyRequest struct {
	Accelerator string `json:"accelerator"`
}

type SetMainWindowSizeRequest struct {
	UiSize string `json:"uiSize"`
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

func WithOnBeforeQuit(fn func()) Option {
	return func(service *Service) { service.onBeforeQuit = fn }
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
// 在调用 window.Quit() 之前先执行 onBeforeQuit 钩子（若已配置），
// 确保 systray 等依赖原生消息循环的资源在 Wails 退出流程开始前完成停止。
// REQ-030-AC-004
func (service *Service) QuitApplication() error {
	service.allowQuit.Store(true)
	// Windows 的 systray 通过 WM_CLOSE 清理托盘窗口；必须先投递清理消息，
	// 再让 Wails 投递 WM_QUIT，避免退出后留下无法处理的托盘消息。
	if service.onBeforeQuit != nil {
		service.onBeforeQuit()
	}
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

// SetMainWindowSize 按 uiSize 预设调整主窗口宽高。
// REQ-031-AC-003
func (service *Service) SetMainWindowSize(request SetMainWindowSizeRequest) error {
	if service.window == nil {
		return newServiceError(config.ErrorCodeInvalidArgument, "Window runtime is not configured", false, nil)
	}
	width, height, ok := config.ResolveWindowSize(request.UiSize)
	if !ok {
		return newServiceError(config.ErrorCodeWindowSizeInvalid, config.ErrorMessageWindowSizeInvalid, false, nil)
	}
	return service.window.SetSize(width, height)
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
