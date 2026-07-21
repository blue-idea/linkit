//go:build windows

package hotkey

import designhk "golang.design/x/hotkey"

func platformMod() designhk.Modifier {
	return designhk.ModCtrl
}
