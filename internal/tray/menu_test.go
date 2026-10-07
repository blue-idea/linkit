package tray

import (
	"testing"
	"time"
)

// REQ-030-AC-002：托盘菜单包含 About、Check for Updates、Settings 与 Quit。
func TestDefaultMenuItems(t *testing.T) {
	items := DefaultMenuItems()
	if len(items) != 4 {
		t.Fatalf("menu items = %d, want 4", len(items))
	}
	if items[0].ID != MenuAbout || items[0].Label != "About" {
		t.Fatalf("first item = %+v, want About", items[0])
	}
	if items[1].ID != MenuCheckUpdates || items[1].Label != "Check for Updates" {
		t.Fatalf("second item = %+v, want Check for Updates", items[1])
	}
	if items[2].ID != MenuSettings || items[2].Label != "Settings" {
		t.Fatalf("third item = %+v, want Settings", items[2])
	}
	if items[3].ID != MenuQuit || items[3].Label != "Quit" {
		t.Fatalf("fourth item = %+v, want Quit", items[3])
	}
}

func TestHostDispatchesSettingsAboutCheckUpdatesAndQuit(t *testing.T) {
	settingsOpened := make(chan struct{}, 1)
	aboutOpened := make(chan struct{}, 1)
	updatesChecked := make(chan struct{}, 1)
	quit := make(chan struct{}, 1)
	doubleClick := make(chan struct{}, 1)
	host := NewHost(Callbacks{
		OnSettings:     func() { settingsOpened <- struct{}{} },
		OnAbout:        func() { aboutOpened <- struct{}{} },
		OnCheckUpdates: func() { updatesChecked <- struct{}{} },
		OnQuit:         func() { quit <- struct{}{} },
		OnDoubleClick:  func() { doubleClick <- struct{}{} },
	})

	host.HandleMenuClick(MenuSettings)
	host.HandleMenuClick(MenuAbout)
	host.HandleMenuClick(MenuCheckUpdates)
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
	case <-updatesChecked:
	case <-time.After(time.Second):
		t.Fatal("Check for Updates callback was not invoked")
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
