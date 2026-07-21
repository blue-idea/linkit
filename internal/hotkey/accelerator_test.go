package hotkey

import "testing"

// REQ-030-AC-005：默认窗口显隐热键为 CmdOrCtrl+L。
func TestDefaultToggleAccelerator(t *testing.T) {
	if got := DefaultToggleAccelerator(); got != "CmdOrCtrl+L" {
		t.Fatalf("DefaultToggleAccelerator() = %q, want CmdOrCtrl+L", got)
	}
}

func TestParseAcceleratorAcceptsCmdOrCtrlPlusLetter(t *testing.T) {
	binding, err := ParseAccelerator("CmdOrCtrl+L")
	if err != nil {
		t.Fatalf("ParseAccelerator returned error: %v", err)
	}
	if !binding.ModCtrlOrCmd {
		t.Fatal("expected ModCtrlOrCmd")
	}
	if binding.Key != "L" {
		t.Fatalf("Key = %q, want L", binding.Key)
	}
}

func TestParseAcceleratorRejectsEmptyAndInvalid(t *testing.T) {
	for _, raw := range []string{"", "  ", "L", "Ctrl+", "CmdOrCtrl+", "CmdOrCtrl+Shift+L+M"} {
		if _, err := ParseAccelerator(raw); err == nil {
			t.Fatalf("ParseAccelerator(%q) should fail", raw)
		}
	}
}

func TestParseAcceleratorNormalizesCase(t *testing.T) {
	binding, err := ParseAccelerator("cmdorctrl+l")
	if err != nil {
		t.Fatalf("ParseAccelerator returned error: %v", err)
	}
	if binding.Key != "L" {
		t.Fatalf("Key = %q, want L", binding.Key)
	}
}
