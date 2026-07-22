package main

import (
	"github.com/blue-idea/collection/config"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
)

type appMenuCallbacks struct {
	OnSettings func()
	OnQuit     func()
}

// buildApplicationMenu 优先使用 Wails 原生应用菜单修正 macOS 的 Settings/Quit 行为。
func buildApplicationMenu(platform string, callbacks appMenuCallbacks) *menu.Menu {
	if platform != "darwin" {
		return nil
	}

	result := menu.NewMenu()
	appRoot := result.AddSubmenu(config.AppTitle)
	appRoot.AddText("Settings", keys.CmdOrCtrl(","), func(_ *menu.CallbackData) {
		if callbacks.OnSettings != nil {
			callbacks.OnSettings()
		}
	})
	appRoot.AddSeparator()
	appRoot.AddText("Quit", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		if callbacks.OnQuit != nil {
			callbacks.OnQuit()
		}
	})

	result.Append(menu.EditMenu())
	result.Append(menu.WindowMenu())
	return result
}
