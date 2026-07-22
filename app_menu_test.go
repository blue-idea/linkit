package main

import (
	"testing"

	"github.com/blue-idea/collection/config"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
)

func TestBuildApplicationMenuReturnsNilOutsideDarwin(t *testing.T) {
	menu := buildApplicationMenu("windows", appMenuCallbacks{})
	if menu != nil {
		t.Fatal("non-darwin menu must be nil")
	}
}

func TestBuildApplicationMenuForDarwinBindsQuitAndSettings(t *testing.T) {
	var settingsCalled bool
	var quitCalled bool

	appMenu := buildApplicationMenu("darwin", appMenuCallbacks{
		OnSettings: func() { settingsCalled = true },
		OnQuit:     func() { quitCalled = true },
	})
	if appMenu == nil {
		t.Fatal("darwin menu must not be nil")
	}
	if len(appMenu.Items) != 3 {
		t.Fatalf("top-level items = %d, want 3", len(appMenu.Items))
	}

	rootMenu := appMenu.Items[0]
	if rootMenu.Label != config.AppTitle {
		t.Fatalf("root menu label = %q, want %q", rootMenu.Label, config.AppTitle)
	}
	if rootMenu.SubMenu == nil {
		t.Fatal("root menu must have submenu")
	}
	if len(rootMenu.SubMenu.Items) != 3 {
		t.Fatalf("root submenu items = %d, want 3", len(rootMenu.SubMenu.Items))
	}

	settingsItem := rootMenu.SubMenu.Items[0]
	if settingsItem.Label != "Settings" {
		t.Fatalf("settings label = %q, want Settings", settingsItem.Label)
	}
	if settingsItem.Accelerator == nil || settingsItem.Accelerator.Key != "," {
		t.Fatalf("settings accelerator = %#v, want Cmd+,", settingsItem.Accelerator)
	}
	if len(settingsItem.Accelerator.Modifiers) != 1 || settingsItem.Accelerator.Modifiers[0] != keys.CmdOrCtrlKey {
		t.Fatalf("settings modifiers = %#v, want CmdOrCtrl", settingsItem.Accelerator.Modifiers)
	}

	quitItem := rootMenu.SubMenu.Items[2]
	if quitItem.Label != "Quit" {
		t.Fatalf("quit label = %q, want Quit", quitItem.Label)
	}
	if quitItem.Accelerator == nil || quitItem.Accelerator.Key != "q" {
		t.Fatalf("quit accelerator = %#v, want Cmd+Q", quitItem.Accelerator)
	}
	if len(quitItem.Accelerator.Modifiers) != 1 || quitItem.Accelerator.Modifiers[0] != keys.CmdOrCtrlKey {
		t.Fatalf("quit modifiers = %#v, want CmdOrCtrl", quitItem.Accelerator.Modifiers)
	}

	settingsItem.Click(&menu.CallbackData{MenuItem: settingsItem})
	quitItem.Click(&menu.CallbackData{MenuItem: quitItem})
	if !settingsCalled {
		t.Fatal("settings callback must be invoked")
	}
	if !quitCalled {
		t.Fatal("quit callback must be invoked")
	}
}

func TestSelectTrayIcon(t *testing.T) {
	icon := selectTrayIcon()
	if len(icon) == 0 {
		t.Fatal("selectTrayIcon must return non-empty icon bytes")
	}
}
