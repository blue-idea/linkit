package platform

import (
	"testing"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/hotkey"
)

type stubWindowRuntime struct {
	visible   bool
	showN     int
	hideN     int
	quitN     int
	showErr   error
	hideErr   error
	quitErr   error
}

func (s *stubWindowRuntime) Show() error {
	s.showN++
	if s.showErr != nil {
		return s.showErr
	}
	s.visible = true
	return nil
}

func (s *stubWindowRuntime) Hide() error {
	s.hideN++
	if s.hideErr != nil {
		return s.hideErr
	}
	s.visible = false
	return nil
}

func (s *stubWindowRuntime) Quit() error {
	s.quitN++
	return s.quitErr
}

func (s *stubWindowRuntime) IsVisible() bool {
	return s.visible
}

type stubHotkeyManager struct {
	accelerator string
	setErr      error
	setCalls    int
}

func (s *stubHotkeyManager) SetAccelerator(accelerator string) error {
	s.setCalls++
	if s.setErr != nil {
		return s.setErr
	}
	s.accelerator = accelerator
	return nil
}

func (s *stubHotkeyManager) SetOnTrigger(fn func()) {}

// REQ-030-AC-001：OS 关闭时默认阻止退出（隐藏由 HideWindowOnClose 处理）。
func TestShouldPreventCloseRespectsAllowQuit(t *testing.T) {
	service := NewService()
	if !service.ShouldPreventClose() {
		t.Fatal("default close must be prevented so the window can hide")
	}
	service.allowQuit.Store(true)
	if service.ShouldPreventClose() {
		t.Fatal("allowQuit=true must permit process exit")
	}
}

// REQ-030-AC-003 / AC-005：显隐切换。
func TestToggleMainWindow(t *testing.T) {
	runtime := &stubWindowRuntime{visible: true}
	service := NewService(WithWindowRuntime(runtime))

	if err := service.ToggleMainWindow(); err != nil {
		t.Fatalf("ToggleMainWindow hide: %v", err)
	}
	if runtime.hideN != 1 || runtime.visible {
		t.Fatalf("expected hide, got showN=%d hideN=%d visible=%v", runtime.showN, runtime.hideN, runtime.visible)
	}

	if err := service.ToggleMainWindow(); err != nil {
		t.Fatalf("ToggleMainWindow show: %v", err)
	}
	if runtime.showN != 1 || !runtime.visible {
		t.Fatalf("expected show, got showN=%d hideN=%d visible=%v", runtime.showN, runtime.hideN, runtime.visible)
	}
}

// REQ-030-AC-004：Quit 允许退出并调用运行时 Quit。
func TestQuitApplicationAllowsExit(t *testing.T) {
	runtime := &stubWindowRuntime{visible: true}
	service := NewService(WithWindowRuntime(runtime))

	if err := service.QuitApplication(); err != nil {
		t.Fatalf("QuitApplication: %v", err)
	}
	if !service.allowQuit.Load() {
		t.Fatal("QuitApplication must set allowQuit")
	}
	if runtime.quitN != 1 {
		t.Fatalf("quitN = %d, want 1", runtime.quitN)
	}
}

func TestShowAndHideMainWindow(t *testing.T) {
	runtime := &stubWindowRuntime{}
	service := NewService(WithWindowRuntime(runtime))

	if err := service.ShowMainWindow(); err != nil {
		t.Fatalf("ShowMainWindow: %v", err)
	}
	if err := service.HideMainWindow(); err != nil {
		t.Fatalf("HideMainWindow: %v", err)
	}
	if runtime.showN != 1 || runtime.hideN != 1 {
		t.Fatalf("showN=%d hideN=%d", runtime.showN, runtime.hideN)
	}
}

// REQ-030-AC-007 / AC-008：非法 accelerator 映射为 HOTKEY_INVALID。
func TestSetToggleWindowHotkeyInvalid(t *testing.T) {
	manager := &stubHotkeyManager{setErr: hotkey.ErrInvalidAccelerator}
	service := NewService(WithHotkeyManager(manager))

	err := service.SetToggleWindowHotkey(SetToggleWindowHotkeyRequest{Accelerator: ""})
	assertCodedError(t, err, config.ErrorCodeHotkeyInvalid, false)
	if manager.setCalls != 1 {
		t.Fatalf("setCalls = %d, want 1", manager.setCalls)
	}
}

func TestSetToggleWindowHotkeyUnavailable(t *testing.T) {
	manager := &stubHotkeyManager{setErr: hotkey.ErrUnavailable}
	service := NewService(WithHotkeyManager(manager))

	err := service.SetToggleWindowHotkey(SetToggleWindowHotkeyRequest{Accelerator: "CmdOrCtrl+L"})
	assertCodedError(t, err, config.ErrorCodeHotkeyUnavailable, true)
}

func TestSetToggleWindowHotkeySuccess(t *testing.T) {
	manager := &stubHotkeyManager{}
	service := NewService(WithHotkeyManager(manager))

	if err := service.SetToggleWindowHotkey(SetToggleWindowHotkeyRequest{Accelerator: "CmdOrCtrl+H"}); err != nil {
		t.Fatalf("SetToggleWindowHotkey: %v", err)
	}
	if manager.accelerator != "CmdOrCtrl+H" {
		t.Fatalf("accelerator = %q", manager.accelerator)
	}
}

// REQ-030-AC-010：能力探测返回稳定平台字段。
func TestGetDesktopCapability(t *testing.T) {
	service := NewService()
	cap := service.GetDesktopCapability()
	if cap.Platform == "" || cap.Platform == "unknown" && false {
		t.Fatalf("unexpected capability: %+v", cap)
	}
	if cap.Platform != "windows" && cap.Platform != "darwin" && cap.Platform != "linux" && cap.Platform != "unknown" {
		t.Fatalf("platform = %q", cap.Platform)
	}
}

func TestWireHotkeyToggleInvokesToggle(t *testing.T) {
	runtime := &stubWindowRuntime{visible: true}
	backend := &recordingBackend{}
	manager := hotkey.NewManager(backend)
	service := NewService(WithWindowRuntime(runtime), WithHotkeyManager(manager))

	if err := service.WireHotkeyToggle(); err != nil {
		t.Fatalf("WireHotkeyToggle: %v", err)
	}
	if err := manager.SetAccelerator("CmdOrCtrl+L"); err != nil {
		t.Fatalf("SetAccelerator: %v", err)
	}
	if backend.onTrigger == nil {
		t.Fatal("expected backend trigger")
	}
	backend.onTrigger()
	if runtime.hideN != 1 {
		t.Fatalf("hideN = %d, want 1", runtime.hideN)
	}
}

type recordingBackend struct {
	onTrigger func()
}

func (r *recordingBackend) Register(_ string, onTrigger func()) error {
	r.onTrigger = onTrigger
	return nil
}

func (r *recordingBackend) Unregister() error {
	r.onTrigger = nil
	return nil
}
