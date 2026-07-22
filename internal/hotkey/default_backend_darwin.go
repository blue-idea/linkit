//go:build darwin

package hotkey

func NewDefaultBackend() Backend {
	return NewCarbonBackend()
}
