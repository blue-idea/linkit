package tray

import (
	"log"
	"sync"

	"github.com/energye/systray"
)

// SystrayRunner 使用 energye/systray 显示托盘图标与 Show/Quit。
type SystrayRunner struct {
	mu       sync.Mutex
	host     *Host
	tooltip  string
	icon     []byte
	started  bool
	endLoop  func()
}

func NewSystrayRunner(host *Host, tooltip string, icon []byte) *SystrayRunner {
	return &SystrayRunner{host: host, tooltip: tooltip, icon: icon}
}

// Start 在独立循环中启动托盘（适合与 Wails 共存）。
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

func (r *SystrayRunner) onReady() {
	if len(r.icon) > 0 {
		systray.SetIcon(r.icon)
	}
	if r.tooltip != "" {
		systray.SetTooltip(r.tooltip)
	}
	for _, item := range DefaultMenuItems() {
		menuItem := systray.AddMenuItem(item.Label, item.Label)
		id := item.ID
		menuItem.Click(func() {
			if r.host != nil {
				r.host.HandleMenuClick(id)
			}
		})
	}
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

// SafeStart 启动托盘；失败时记录日志但不崩溃（Linux best-effort）。
func SafeStart(runner *SystrayRunner) {
	defer func() {
		if recovered := recover(); recovered != nil {
			log.Printf("tray: failed to start system tray: %v", recovered)
		}
	}()
	runner.Start()
}
