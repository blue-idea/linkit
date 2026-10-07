package tray

const (
	MenuSettings     = "settings"
	MenuAbout        = "about"
	MenuCheckUpdates = "check-updates"
	MenuQuit         = "quit"
)

// MenuItem 描述托盘菜单项。
type MenuItem struct {
	ID    string
	Label string
}

// Callbacks 托盘动作回调。
type Callbacks struct {
	OnSettings     func()
	OnAbout        func()
	OnCheckUpdates func()
	OnQuit         func()

	OnDoubleClick func()
}

// Host 处理托盘菜单点击分发。
type Host struct {
	callbacks Callbacks
}

func NewHost(callbacks Callbacks) *Host {
	return &Host{callbacks: callbacks}
}

// DefaultMenuItems 返回托盘右键菜单项。
// REQ-030-AC-002
func DefaultMenuItems() []MenuItem {
	return []MenuItem{
		{ID: MenuAbout, Label: "About"},
		{ID: MenuCheckUpdates, Label: "Check for Updates"},
		{ID: MenuSettings, Label: "Settings"},
		{ID: MenuQuit, Label: "Quit"},
	}
}

func (h *Host) HandleMenuClick(id string) {
	var callback func()
	switch id {
	case MenuSettings:
		callback = h.callbacks.OnSettings
	case MenuAbout:
		callback = h.callbacks.OnAbout
	case MenuCheckUpdates:
		callback = h.callbacks.OnCheckUpdates
	case MenuQuit:
		callback = h.callbacks.OnQuit
	}
	if callback != nil {
		// 第三方托盘会在原生消息回调中同步调用此方法。
		// 异步派发可避免 Wails 窗口操作重入 Win32/AppKit 消息循环。
		go callback()
	}
}

func (h *Host) HandleDoubleClick() {
	if h.callbacks.OnDoubleClick != nil {
		go h.callbacks.OnDoubleClick()
	}
}
