package tray

import (
	"log"
	"sync"

	"github.com/energye/systray"
)

// SystrayRunner 使用 energye/systray 显示托盘图标与 Settings/Quit。
type SystrayRunner struct {
	mu      sync.Mutex
	host    *Host
	tooltip string
	icon    []byte
	started bool
	endLoop func()
}

func NewSystrayRunner(host *Host, tooltip string, icon []byte) *SystrayRunner {
	return &SystrayRunner{host: host, tooltip: tooltip, icon: icon}
}

// SetHost 在 Runner 创建后设置 Host（解决 trayRunner 与 nativeFileService 的循环依赖）。
func (r *SystrayRunner) SetHost(host *Host) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.host = host
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

// SafeStart 启动托盘；失败时记录日志但不崩溃（Linux best-effort）。
func SafeStart(runner *SystrayRunner) {
	defer func() {
		if recovered := recover(); recovered != nil {
			log.Printf("tray: failed to start system tray: %v", recovered)
		}
	}()
	runner.Start()
}
