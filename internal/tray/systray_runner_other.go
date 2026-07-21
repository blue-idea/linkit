//go:build !windows

package tray

import "github.com/energye/systray"

// Start 使用第三方包的外部循环与 Wails 共存。
func (r *SystrayRunner) Start() {
	r.mu.Lock()
	if r.started {
		r.mu.Unlock()
		return
	}
	r.started = true
	r.mu.Unlock()

	start, end := systray.RunWithExternalLoop(r.onReady, func() {})
	r.mu.Lock()
	r.endLoop = end
	r.mu.Unlock()
	go start()
}

// Stop 结束托盘循环。
func (r *SystrayRunner) Stop() {
	r.mu.Lock()
	end := r.endLoop
	r.endLoop = nil
	r.started = false
	r.mu.Unlock()
	if end != nil {
		end()
		return
	}
	systray.Quit()
}
