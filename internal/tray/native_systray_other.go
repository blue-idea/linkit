//go:build !darwin

package tray

func shouldStartNativeSystray() bool {
	return true
}
