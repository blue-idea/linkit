package tray

import (
	"testing"
	"time"
)

// REQ-030-AC-002：托盘菜单包含 About、Settings 与 Quit。
func TestDefaultMenuItems(t *testing.T) {
	items := DefaultMenuItems()
	if len(items) != 3 {
		t.Fatalf("menu items = %d, want 3", len(items))
	}
	if items[0].ID != MenuAbout || items[0].Label != "About" {
		t.Fatalf("first item = %+v, want About", items[0])
	}
	if items[1].ID != MenuSettings || items[1].Label != "Settings" {
		t.Fatalf("second item = %+v, want Settings", items[1])
	}
	if items[2].ID != MenuQuit || items[2].Label != "Quit" {
		t.Fatalf("third item = %+v, want Quit", items[2])
	}
}

func TestHostDispatchesSettingsAboutAndQuit(t *testing.T) {
	settingsOpened := make(chan struct{}, 1)
	aboutOpened := make(chan struct{}, 1)
	quit := make(chan struct{}, 1)
	doubleClick := make(chan struct{}, 1)
	host := NewHost(Callbacks{
		OnSettings:    func() { settingsOpened <- struct{}{} },
		OnAbout:       func() { aboutOpened <- struct{}{} },
		OnQuit:        func() { quit <- struct{}{} },
		OnDoubleClick: func() { doubleClick <- struct{}{} },
	})

	host.HandleMenuClick(MenuSettings)
	host.HandleMenuClick(MenuAbout)
	host.HandleMenuClick(MenuQuit)
	host.HandleDoubleClick()

	select {
	case <-settingsOpened:
	case <-time.After(time.Second):
		t.Fatal("Settings callback was not invoked")
	}
	select {
	case <-aboutOpened:
	case <-time.After(time.Second):
		t.Fatal("About callback was not invoked")
	}
	select {
	case <-quit:
	case <-time.After(time.Second):
		t.Fatal("Quit callback was not invoked")
	}
	select {
	case <-doubleClick:
	case <-time.After(time.Second):
		t.Fatal("Double-click callback was not invoked")
	}
}

// REQ-030-AC-004：托盘原生消息线程不得等待退出回调完成。
// Windows 的菜单回调运行在 WndProc 中；同步执行 Quit 会造成 GUI 消息循环重入。
func TestHostHandleMenuClickReturnsBeforeQuitCallbackCompletes(t *testing.T) {
	callbackStarted := make(chan struct{})
	releaseCallback := make(chan struct{})
	handlerReturned := make(chan struct{})

	host := NewHost(Callbacks{
		OnQuit: func() {
			close(callbackStarted)
			<-releaseCallback
		},
	})

	go func() {
		host.HandleMenuClick(MenuQuit)
		close(handlerReturned)
	}()

	<-callbackStarted
	select {
	case <-handlerReturned:
		close(releaseCallback)
	case <-time.After(250 * time.Millisecond):
		close(releaseCallback)
		t.Fatal("HandleMenuClick blocked on the Quit callback")
	}
}
