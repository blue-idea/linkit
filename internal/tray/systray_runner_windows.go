//go:build windows

package tray

import (
	"runtime"

	"github.com/energye/systray"
)

// Start 在专用 Windows 消息线程中启动托盘。
// HWND 的创建、GetMessage 循环与销毁必须位于同一 OS 线程。
func (r *SystrayRunner) Start() {
	r.mu.Lock()
	if r.started {
		r.mu.Unlock()
		return
	}
	r.started = true
	r.mu.Unlock()

	go func() {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()
		systray.Run(r.onReady, func() {
			r.mu.Lock()
			r.started = false
			r.mu.Unlock()
		})
	}()
}

// Stop 请求 Windows 托盘消息循环销毁隐藏窗口并结束。
func (r *SystrayRunner) Stop() {
	r.mu.Lock()
	if !r.started {
		r.mu.Unlock()
		return
	}
	r.started = false
	r.mu.Unlock()
	systray.Quit()
}
