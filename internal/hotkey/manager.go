package hotkey

import "sync"

// Backend 抽象系统级热键注册，便于单测注入。
type Backend interface {
	Register(accelerator string, onTrigger func()) error
	Unregister() error
}

// Manager 管理当前窗口显隐全局热键。
type Manager struct {
	mu        sync.Mutex
	backend   Backend
	onTrigger func()
}

func NewManager(backend Backend) *Manager {
	return &Manager{backend: backend}
}

func (m *Manager) SetOnTrigger(fn func()) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.onTrigger = fn
}

// SetAccelerator 解析并注册 accelerator；替换时先注销旧绑定。
func (m *Manager) SetAccelerator(accelerator string) error {
	if _, err := ParseAccelerator(accelerator); err != nil {
		return err
	}

	m.mu.Lock()
	backend := m.backend
	onTrigger := m.onTrigger
	m.mu.Unlock()

	if backend == nil {
		return ErrUnavailable
	}

	_ = backend.Unregister()
	return backend.Register(accelerator, func() {
		m.mu.Lock()
		fn := m.onTrigger
		if fn == nil {
			fn = onTrigger
		}
		m.mu.Unlock()
		if fn != nil {
			fn()
		}
	})
}

// Close 注销当前热键。
func (m *Manager) Close() error {
	m.mu.Lock()
	backend := m.backend
	m.mu.Unlock()
	if backend == nil {
		return nil
	}
	return backend.Unregister()
}
