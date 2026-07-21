package tray

import "testing"

// REQ-030-AC-002：托盘菜单至少包含 Show 与 Quit。
func TestDefaultMenuItems(t *testing.T) {
	items := DefaultMenuItems()
	if len(items) != 2 {
		t.Fatalf("menu items = %d, want 2", len(items))
	}
	if items[0].ID != MenuShow || items[0].Label != "Show" {
		t.Fatalf("first item = %+v, want Show", items[0])
	}
	if items[1].ID != MenuQuit || items[1].Label != "Quit" {
		t.Fatalf("second item = %+v, want Quit", items[1])
	}
}

func TestHostDispatchesShowAndQuit(t *testing.T) {
	var showed, quit bool
	host := NewHost(Callbacks{
		OnShow: func() { showed = true },
		OnQuit: func() { quit = true },
	})

	host.HandleMenuClick(MenuShow)
	host.HandleMenuClick(MenuQuit)

	if !showed {
		t.Fatal("Show callback was not invoked")
	}
	if !quit {
		t.Fatal("Quit callback was not invoked")
	}
}
