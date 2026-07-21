package hotkey

import (
	"errors"
	"sync/atomic"
	"testing"
)

type stubBackend struct {
	registerCalls []string
	unregisterN   int
	registerErr   error
	onTrigger     func()
}

func (s *stubBackend) Register(accelerator string, onTrigger func()) error {
	s.registerCalls = append(s.registerCalls, accelerator)
	s.onTrigger = onTrigger
	return s.registerErr
}

func (s *stubBackend) Unregister() error {
	s.unregisterN++
	s.onTrigger = nil
	return nil
}

// REQ-030-AC-007：保存显隐绑定后须重新注册系统级全局热键。
func TestManagerRegisterAndReplace(t *testing.T) {
	backend := &stubBackend{}
	manager := NewManager(backend)

	if err := manager.SetAccelerator("CmdOrCtrl+L"); err != nil {
		t.Fatalf("SetAccelerator: %v", err)
	}
	if err := manager.SetAccelerator("CmdOrCtrl+H"); err != nil {
		t.Fatalf("replace SetAccelerator: %v", err)
	}
	if len(backend.registerCalls) != 2 {
		t.Fatalf("registerCalls = %d, want 2", len(backend.registerCalls))
	}
	if backend.registerCalls[1] != "CmdOrCtrl+H" {
		t.Fatalf("second register = %q", backend.registerCalls[1])
	}
	if backend.unregisterN < 1 {
		t.Fatal("replace must unregister previous binding")
	}
}

func TestManagerRejectsInvalidAccelerator(t *testing.T) {
	backend := &stubBackend{}
	manager := NewManager(backend)
	err := manager.SetAccelerator("")
	if !errors.Is(err, ErrInvalidAccelerator) {
		t.Fatalf("error = %v, want ErrInvalidAccelerator", err)
	}
	if len(backend.registerCalls) != 0 {
		t.Fatal("invalid accelerator must not reach backend")
	}
}

func TestManagerTriggerCallback(t *testing.T) {
	backend := &stubBackend{}
	manager := NewManager(backend)
	var hits atomic.Int32
	manager.SetOnTrigger(func() { hits.Add(1) })
	if err := manager.SetAccelerator("CmdOrCtrl+L"); err != nil {
		t.Fatalf("SetAccelerator: %v", err)
	}
	if backend.onTrigger == nil {
		t.Fatal("backend should receive onTrigger")
	}
	backend.onTrigger()
	if hits.Load() != 1 {
		t.Fatalf("hits = %d, want 1", hits.Load())
	}
}
