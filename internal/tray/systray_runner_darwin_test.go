//go:build darwin

package tray

import "testing"

func TestNativeSystrayDisabledOnDarwin(t *testing.T) {
	if !shouldStartNativeSystray() {
		t.Fatal("native systray must be enabled on Darwin via native status bar integration")
	}
}
