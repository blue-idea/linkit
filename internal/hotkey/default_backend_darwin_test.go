//go:build darwin

package hotkey

import "testing"

func TestNewDefaultBackendUsesCarbonBackendOnDarwin(t *testing.T) {
	if _, ok := NewDefaultBackend().(*CarbonBackend); !ok {
		t.Fatalf("NewDefaultBackend() = %T, want *CarbonBackend", NewDefaultBackend())
	}
}

func TestCarbonBindingMapsCmdOrCtrlToCommandOnDarwin(t *testing.T) {
	binding, err := parseCarbonBinding("CmdOrCtrl+L")
	if err != nil {
		t.Fatalf("parseCarbonBinding: %v", err)
	}
	if binding.keyCode != 37 {
		t.Fatalf("keyCode = %d, want 37 for L", binding.keyCode)
	}
	if binding.modifiers != carbonCommandModifier {
		t.Fatalf("modifiers = %d, want command modifier %d", binding.modifiers, carbonCommandModifier)
	}
}
