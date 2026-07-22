//go:build darwin

package tray

/*
#cgo darwin CFLAGS: -x objective-c -fobjc-arc
#cgo darwin LDFLAGS: -framework Cocoa

#import <Cocoa/Cocoa.h>
#include <stdbool.h>
#include <stdlib.h>

extern bool linkitCreateStatusTray(const char *settingsTitle, const char *quitTitle, const char *tooltip, const void *iconBytes, int iconLen);
extern void linkitDestroyStatusTray(void);
*/
import "C"

import (
	"sync"
	"unsafe"
)

const (
	darwinTraySettingsMenuID = 1
	darwinTrayQuitMenuID     = 2
)

var (
	darwinRunnerMu sync.Mutex
	darwinRunner   *SystrayRunner
)

func (r *SystrayRunner) Start() bool {
	r.mu.Lock()
	if r.started {
		r.mu.Unlock()
		return true
	}
	r.mu.Unlock()

	if !createDarwinStatusTray(r.tooltip, r.icon) {
		return false
	}

	r.mu.Lock()
	r.started = true
	r.mu.Unlock()

	darwinRunnerMu.Lock()
	darwinRunner = r
	darwinRunnerMu.Unlock()
	return true
}

func (r *SystrayRunner) Stop() {
	r.mu.Lock()
	if !r.started {
		r.mu.Unlock()
		return
	}
	r.started = false
	r.mu.Unlock()

	darwinRunnerMu.Lock()
	if darwinRunner == r {
		darwinRunner = nil
	}
	darwinRunnerMu.Unlock()

	C.linkitDestroyStatusTray()
}

func createDarwinStatusTray(tooltip string, icon []byte) bool {
	settingsTitle := C.CString("Settings")
	defer C.free(unsafe.Pointer(settingsTitle))
	quitTitle := C.CString("Quit")
	defer C.free(unsafe.Pointer(quitTitle))

	var tooltipText *C.char
	if tooltip != "" {
		tooltipText = C.CString(tooltip)
		defer C.free(unsafe.Pointer(tooltipText))
	}

	var iconPointer unsafe.Pointer
	if len(icon) > 0 {
		iconPointer = unsafe.Pointer(&icon[0])
	}

	return bool(C.linkitCreateStatusTray(settingsTitle, quitTitle, tooltipText, iconPointer, C.int(len(icon))))
}

//export linkitDarwinTrayMenuSelected
func linkitDarwinTrayMenuSelected(menuID C.int) {
	darwinRunnerMu.Lock()
	runner := darwinRunner
	darwinRunnerMu.Unlock()
	if runner == nil || runner.host == nil {
		return
	}

	switch int(menuID) {
	case darwinTraySettingsMenuID:
		runner.host.HandleMenuClick(MenuSettings)
	case darwinTrayQuitMenuID:
		runner.host.HandleMenuClick(MenuQuit)
	}
}
