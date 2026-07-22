package platform

import (
	"context"
	"runtime"
	"sync/atomic"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

var (
	runtimePlatform  = runtime.GOOS
	windowShow       = wailsruntime.WindowShow
	windowHide       = wailsruntime.WindowHide
	windowUnminimise = wailsruntime.WindowUnminimise
	appShow          = wailsruntime.Show
	appHide          = wailsruntime.Hide
	quitApplication  = wailsruntime.Quit
	windowSetSize    = wailsruntime.WindowSetSize
)

// WailsWindowRuntime 封装 Wails runtime 窗口操作。
type WailsWindowRuntime struct {
	ctx     context.Context
	visible atomic.Bool
}

func NewWailsWindowRuntime(ctx context.Context) *WailsWindowRuntime {
	runtime := &WailsWindowRuntime{ctx: ctx}
	runtime.visible.Store(true)
	return runtime
}

func (r *WailsWindowRuntime) SetContext(ctx context.Context) {
	r.ctx = ctx
}

func (r *WailsWindowRuntime) Show() error {
	if r.ctx == nil {
		return nil
	}
	windowShow(r.ctx)
	windowUnminimise(r.ctx)
	appShow(r.ctx)
	r.visible.Store(true)
	return nil
}

func (r *WailsWindowRuntime) Hide() error {
	if r.ctx == nil {
		return nil
	}
	if runtimePlatform == "darwin" {
		appHide(r.ctx)
	} else {
		windowHide(r.ctx)
	}
	r.visible.Store(false)
	return nil
}

func (r *WailsWindowRuntime) Quit() error {
	if r.ctx == nil {
		return nil
	}
	quitApplication(r.ctx)
	return nil
}

func (r *WailsWindowRuntime) IsVisible() bool {
	return r.visible.Load()
}

// SetSize 调整原生主窗口宽高。REQ-031-AC-003
func (r *WailsWindowRuntime) SetSize(width, height int) error {
	if r.ctx == nil {
		return nil
	}
	windowSetSize(r.ctx, width, height)
	return nil
}

// MarkHidden 在 HideWindowOnClose 触发后同步可见性状态。
func (r *WailsWindowRuntime) MarkHidden() {
	r.visible.Store(false)
}
