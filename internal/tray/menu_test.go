package tray

import (
	"testing"
	"time"
)

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
	showed := make(chan struct{}, 1)
	quit := make(chan struct{}, 1)
	host := NewHost(Callbacks{
		OnShow: func() { showed <- struct{}{} },
		OnQuit: func() { quit <- struct{}{} },
	})

	host.HandleMenuClick(MenuShow)
	host.HandleMenuClick(MenuQuit)

	select {
	case <-showed:
	case <-time.After(time.Second):
		t.Fatal("Show callback was not invoked")
	}
	select {
	case <-quit:
	case <-time.After(time.Second):
		t.Fatal("Quit callback was not invoked")
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
