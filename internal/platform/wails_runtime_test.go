package platform

import (
	"context"
	"testing"
)

func TestWailsWindowRuntimeHideUsesApplicationHideOnDarwin(t *testing.T) {
	originalPlatform := runtimePlatform
	originalHideWindow := windowHide
	originalHideApp := appHide
	t.Cleanup(func() {
		runtimePlatform = originalPlatform
		windowHide = originalHideWindow
		appHide = originalHideApp
	})

	runtimePlatform = "darwin"
	windowHidden := false
	appHidden := false
	windowHide = func(context.Context) {
		windowHidden = true
	}
	appHide = func(context.Context) {
		appHidden = true
	}

	runtime := NewWailsWindowRuntime(context.Background())
	if err := runtime.Hide(); err != nil {
		t.Fatalf("Hide: %v", err)
	}
	if windowHidden {
		t.Fatal("darwin hide must not call WindowHide")
	}
	if !appHidden {
		t.Fatal("darwin hide must call application Hide")
	}
	if runtime.IsVisible() {
		t.Fatal("runtime must be marked hidden after Hide")
	}
}

func TestWailsWindowRuntimeHideUsesWindowHideOutsideDarwin(t *testing.T) {
	originalPlatform := runtimePlatform
	originalHideWindow := windowHide
	originalHideApp := appHide
	t.Cleanup(func() {
		runtimePlatform = originalPlatform
		windowHide = originalHideWindow
		appHide = originalHideApp
	})

	runtimePlatform = "windows"
	windowHidden := false
	appHidden := false
	windowHide = func(context.Context) {
		windowHidden = true
	}
	appHide = func(context.Context) {
		appHidden = true
	}

	runtime := NewWailsWindowRuntime(context.Background())
	if err := runtime.Hide(); err != nil {
		t.Fatalf("Hide: %v", err)
	}
	if !windowHidden {
		t.Fatal("non-darwin hide must call WindowHide")
	}
	if appHidden {
		t.Fatal("non-darwin hide must not call application Hide")
	}
}
