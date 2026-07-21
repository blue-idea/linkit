package tray

const (
	MenuShow = "show"
	MenuQuit = "quit"
)

// MenuItem 描述托盘菜单项。
type MenuItem struct {
	ID    string
	Label string
}

// Callbacks 托盘动作回调。
type Callbacks struct {
	OnShow func()
	OnQuit func()
}

// Host 处理托盘菜单点击分发。
type Host struct {
	callbacks Callbacks
}

func NewHost(callbacks Callbacks) *Host {
	return &Host{callbacks: callbacks}
}

// DefaultMenuItems 返回 Show / Quit。
// REQ-030-AC-002
func DefaultMenuItems() []MenuItem {
	return []MenuItem{
		{ID: MenuShow, Label: "Show"},
		{ID: MenuQuit, Label: "Quit"},
	}
}

func (h *Host) HandleMenuClick(id string) {
	switch id {
	case MenuShow:
		if h.callbacks.OnShow != nil {
			h.callbacks.OnShow()
		}
	case MenuQuit:
		if h.callbacks.OnQuit != nil {
			h.callbacks.OnQuit()
		}
	}
}
