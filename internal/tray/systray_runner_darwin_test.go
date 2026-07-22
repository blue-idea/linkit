//go:build darwin

package tray

import "testing"

func TestNativeSystrayDisabledOnDarwin(t *testing.T) {
	if shouldStartNativeSystray() {
		t.Fatal("native systray must stay disabled on Darwin because Wails OnStartup is not the AppKit main thread")
	}
}
