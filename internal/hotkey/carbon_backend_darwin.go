//go:build darwin

package hotkey

/*
#cgo darwin CFLAGS: -x objective-c
#cgo darwin LDFLAGS: -framework Carbon
#include <Carbon/Carbon.h>

extern void linkitCarbonHotkeyPressed(UInt32 id);

static EventHandlerRef linkitHotkeyHandlerRef;
static const UInt32 linkitHotkeySignature = 'Lkit';

static OSStatus linkitHotkeyHandler(EventHandlerCallRef nextHandler, EventRef event, void *userData) {
	EventHotKeyID hotkeyID;
	OSStatus status = GetEventParameter(
		event,
		kEventParamDirectObject,
		typeEventHotKeyID,
		NULL,
		sizeof(hotkeyID),
		NULL,
		&hotkeyID
	);
	if (status == noErr && hotkeyID.signature == linkitHotkeySignature) {
		linkitCarbonHotkeyPressed(hotkeyID.id);
	}
	return noErr;
}

static OSStatus linkitInstallHotkeyHandler(void) {
	if (linkitHotkeyHandlerRef != NULL) {
		return noErr;
	}
	EventTypeSpec eventType;
	eventType.eventClass = kEventClassKeyboard;
	eventType.eventKind = kEventHotKeyPressed;
	return InstallApplicationEventHandler(
		&linkitHotkeyHandler,
		1,
		&eventType,
		NULL,
		&linkitHotkeyHandlerRef
	);
}

static OSStatus linkitRegisterHotkey(UInt32 keyCode, UInt32 modifiers, UInt32 id, EventHotKeyRef *outRef) {
	OSStatus status = linkitInstallHotkeyHandler();
	if (status != noErr) {
		return status;
	}
	EventHotKeyID hotkeyID;
	hotkeyID.signature = linkitHotkeySignature;
	hotkeyID.id = id;
	return RegisterEventHotKey(
		keyCode,
		modifiers,
		hotkeyID,
		GetApplicationEventTarget(),
		0,
		outRef
	);
}

static OSStatus linkitUnregisterHotkey(EventHotKeyRef ref) {
	if (ref == NULL) {
		return noErr;
	}
	return UnregisterEventHotKey(ref);
}
*/
import "C"

import (
	"fmt"
	"sync"
	"sync/atomic"
)

const carbonCommandModifier uint32 = 1 << 8

var (
	carbonHotkeyID        atomic.Uint32
	carbonHotkeyCallbacks sync.Map
)

type carbonBinding struct {
	keyCode   uint32
	modifiers uint32
}

type CarbonBackend struct {
	mu      sync.Mutex
	current C.EventHotKeyRef
	id      uint32
}

func NewCarbonBackend() *CarbonBackend {
	return &CarbonBackend{}
}

func (b *CarbonBackend) Register(accelerator string, onTrigger func()) error {
	binding, err := parseCarbonBinding(accelerator)
	if err != nil {
		return err
	}

	b.mu.Lock()
	defer b.mu.Unlock()
	if b.current != nil {
		_ = b.unregisterLocked()
	}

	id := carbonHotkeyID.Add(1)
	var ref C.EventHotKeyRef
	status := C.linkitRegisterHotkey(C.UInt32(binding.keyCode), C.UInt32(binding.modifiers), C.UInt32(id), &ref)
	if status != C.noErr {
		return fmt.Errorf("%w: Carbon RegisterEventHotKey returned OSStatus %d", ErrUnavailable, int(status))
	}
	b.current = ref
	b.id = id
	carbonHotkeyCallbacks.Store(id, onTrigger)
	return nil
}

func (b *CarbonBackend) Unregister() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.unregisterLocked()
}

func (b *CarbonBackend) unregisterLocked() error {
	if b.current == nil {
		return nil
	}
	status := C.linkitUnregisterHotkey(b.current)
	carbonHotkeyCallbacks.Delete(b.id)
	b.current = nil
	b.id = 0
	if status != C.noErr {
		return fmt.Errorf("%w: Carbon UnregisterEventHotKey returned OSStatus %d", ErrUnavailable, int(status))
	}
	return nil
}

func parseCarbonBinding(accelerator string) (carbonBinding, error) {
	binding, err := ParseAccelerator(accelerator)
	if err != nil {
		return carbonBinding{}, err
	}
	key, err := mapKey(binding.Key)
	if err != nil {
		return carbonBinding{}, err
	}
	return carbonBinding{keyCode: uint32(key), modifiers: carbonCommandModifier}, nil
}

//export linkitCarbonHotkeyPressed
func linkitCarbonHotkeyPressed(id C.UInt32) {
	callback, ok := carbonHotkeyCallbacks.Load(uint32(id))
	if !ok || callback == nil {
		return
	}
	if fn, ok := callback.(func()); ok && fn != nil {
		fn()
	}
}
