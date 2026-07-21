package hotkey

import (
	"fmt"
	"sync"

	designhk "golang.design/x/hotkey"
)

// DesignBackend 使用 golang.design/x/hotkey 注册系统级全局热键。
type DesignBackend struct {
	mu        sync.Mutex
	current   *designhk.Hotkey
	stopListen chan struct{}
}

func NewDesignBackend() *DesignBackend {
	return &DesignBackend{}
}

func (b *DesignBackend) Register(accelerator string, onTrigger func()) error {
	binding, err := ParseAccelerator(accelerator)
	if err != nil {
		return err
	}
	key, err := mapKey(binding.Key)
	if err != nil {
		return err
	}

	mods := []designhk.Modifier{platformMod()}
	hk := designhk.New(mods, key)
	if err := hk.Register(); err != nil {
		return fmt.Errorf("%w: %v", ErrUnavailable, err)
	}

	b.mu.Lock()
	b.stopListen = make(chan struct{})
	stop := b.stopListen
	b.current = hk
	b.mu.Unlock()

	go func() {
		for {
			select {
			case <-hk.Keydown():
				if onTrigger != nil {
					onTrigger()
				}
			case <-stop:
				return
			}
		}
	}()
	return nil
}

func (b *DesignBackend) Unregister() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.stopListen != nil {
		close(b.stopListen)
		b.stopListen = nil
	}
	if b.current == nil {
		return nil
	}
	err := b.current.Unregister()
	b.current = nil
	return err
}

func mapKey(key string) (designhk.Key, error) {
	switch key {
	case "A":
		return designhk.KeyA, nil
	case "B":
		return designhk.KeyB, nil
	case "C":
		return designhk.KeyC, nil
	case "D":
		return designhk.KeyD, nil
	case "E":
		return designhk.KeyE, nil
	case "F":
		return designhk.KeyF, nil
	case "G":
		return designhk.KeyG, nil
	case "H":
		return designhk.KeyH, nil
	case "I":
		return designhk.KeyI, nil
	case "J":
		return designhk.KeyJ, nil
	case "K":
		return designhk.KeyK, nil
	case "L":
		return designhk.KeyL, nil
	case "M":
		return designhk.KeyM, nil
	case "N":
		return designhk.KeyN, nil
	case "O":
		return designhk.KeyO, nil
	case "P":
		return designhk.KeyP, nil
	case "Q":
		return designhk.KeyQ, nil
	case "R":
		return designhk.KeyR, nil
	case "S":
		return designhk.KeyS, nil
	case "T":
		return designhk.KeyT, nil
	case "U":
		return designhk.KeyU, nil
	case "V":
		return designhk.KeyV, nil
	case "W":
		return designhk.KeyW, nil
	case "X":
		return designhk.KeyX, nil
	case "Y":
		return designhk.KeyY, nil
	case "Z":
		return designhk.KeyZ, nil
	case "0":
		return designhk.Key0, nil
	case "1":
		return designhk.Key1, nil
	case "2":
		return designhk.Key2, nil
	case "3":
		return designhk.Key3, nil
	case "4":
		return designhk.Key4, nil
	case "5":
		return designhk.Key5, nil
	case "6":
		return designhk.Key6, nil
	case "7":
		return designhk.Key7, nil
	case "8":
		return designhk.Key8, nil
	case "9":
		return designhk.Key9, nil
	default:
		return 0, ErrInvalidAccelerator
	}
}
