package main

import "github.com/blue-idea/collection/internal/tray"

// buildTrayCallbacks 将托盘入口统一到同一套窗口显示流程，
// 避免菜单与双击分别维护导致行为漂移。
func buildTrayCallbacks(
	showWindow func(),
	openSettings func(),
	openAbout func(),
	checkUpdates func(),
	quitApplication func(),
) tray.Callbacks {
	return tray.Callbacks{
		OnSettings: func() {
			if showWindow != nil {
				showWindow()
			}
			if openSettings != nil {
				openSettings()
			}
		},
		OnAbout: func() {
			if showWindow != nil {
				showWindow()
			}
			if openAbout != nil {
				openAbout()
			}
		},
		OnCheckUpdates: func() {
			if showWindow != nil {
				showWindow()
			}
			if checkUpdates != nil {
				checkUpdates()
			}
		},
		OnQuit: quitApplication,
		OnDoubleClick: func() {
			if showWindow != nil {
				showWindow()
			}
		},
	}
}
