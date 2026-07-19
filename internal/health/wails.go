package health

import (
	"context"
	"sync"

	"github.com/blue-idea/collection/config"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// WailsEmitter 将后端扫描事件桥接到当前桌面窗口。
type WailsEmitter struct {
	mu      sync.RWMutex
	context context.Context
}

func NewWailsEmitter() *WailsEmitter { return &WailsEmitter{} }

func (emitter *WailsEmitter) SetContext(ctx context.Context) {
	emitter.mu.Lock()
	emitter.context = ctx
	emitter.mu.Unlock()
}

func (emitter *WailsEmitter) Progress(event ProgressEvent) {
	emitter.emit(config.EventHealthScanProgress, event)
}
func (emitter *WailsEmitter) Finished(event FinishedEvent) {
	emitter.emit(config.EventHealthScanFinished, event)
}

func (emitter *WailsEmitter) emit(name string, payload any) {
	emitter.mu.RLock()
	ctx := emitter.context
	emitter.mu.RUnlock()
	if ctx != nil {
		runtime.EventsEmit(ctx, name, payload)
	}
}
