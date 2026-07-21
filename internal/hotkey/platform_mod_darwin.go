//go:build darwin

package hotkey

import designhk "golang.design/x/hotkey"

func platformMod() designhk.Modifier {
	return designhk.ModCmd
}
