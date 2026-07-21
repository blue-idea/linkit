package platform

import (
	"context"
	"sync/atomic"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
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
	wailsruntime.WindowShow(r.ctx)
	wailsruntime.WindowUnminimise(r.ctx)
	wailsruntime.Show(r.ctx)
	r.visible.Store(true)
	return nil
}

func (r *WailsWindowRuntime) Hide() error {
	if r.ctx == nil {
		return nil
	}
	wailsruntime.WindowHide(r.ctx)
	r.visible.Store(false)
	return nil
}

func (r *WailsWindowRuntime) Quit() error {
	if r.ctx == nil {
		return nil
	}
	wailsruntime.Quit(r.ctx)
	return nil
}

func (r *WailsWindowRuntime) IsVisible() bool {
	return r.visible.Load()
}

// MarkHidden 在 HideWindowOnClose 触发后同步可见性状态。
func (r *WailsWindowRuntime) MarkHidden() {
	r.visible.Store(false)
}
