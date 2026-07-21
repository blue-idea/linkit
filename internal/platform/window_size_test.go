package platform

import (
	"errors"
	"testing"

	"github.com/blue-idea/collection/config"
)

// REQ-031-AC-003：保存档位后立即调用原生 SetSize。
func TestSetMainWindowSizeAppliesPreset(t *testing.T) {
	runtime := &stubWindowRuntime{visible: true}
	service := NewService(WithWindowRuntime(runtime))

	if err := service.SetMainWindowSize(SetMainWindowSizeRequest{UiSize: config.UiSizeLarge}); err != nil {
		t.Fatalf("SetMainWindowSize: %v", err)
	}
	if runtime.setSizeN != 1 || runtime.lastW != 1536 || runtime.lastH != 960 {
		t.Fatalf("expected SetSize(1536,960), got n=%d w=%d h=%d", runtime.setSizeN, runtime.lastW, runtime.lastH)
	}
}

func TestSetMainWindowSizeRejectsInvalid(t *testing.T) {
	runtime := &stubWindowRuntime{visible: true}
	service := NewService(WithWindowRuntime(runtime))

	err := service.SetMainWindowSize(SetMainWindowSizeRequest{UiSize: "huge"})
	if err == nil {
		t.Fatal("expected WINDOW_SIZE_INVALID")
	}
	var appErr *ServiceError
	if !errors.As(err, &appErr) || appErr.ErrorCode() != config.ErrorCodeWindowSizeInvalid {
		t.Fatalf("got %v, want %s", err, config.ErrorCodeWindowSizeInvalid)
	}
	if runtime.setSizeN != 0 {
		t.Fatal("invalid size must not call SetSize")
	}
}

func TestSetMainWindowSizeRequiresRuntime(t *testing.T) {
	service := NewService()
	err := service.SetMainWindowSize(SetMainWindowSizeRequest{UiSize: config.UiSizeMedium})
	if err == nil {
		t.Fatal("expected invalid argument when window runtime missing")
	}
}
