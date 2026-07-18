package secretstore

import "errors"

var errSecretNotFound = errors.New("secret not found")

func isNotFound(err error) bool {
	return errors.Is(err, errSecretNotFound)
}

// MemoryBackend 用于单元测试，不触达真实 Keychain。
type MemoryBackend struct {
	values map[string]string
}

func NewMemoryBackend() *MemoryBackend {
	return &MemoryBackend{values: map[string]string{}}
}

func memorySlot(service, key string) string {
	return service + "\x00" + key
}

func (backend *MemoryBackend) Set(service, key, value string) error {
	backend.values[memorySlot(service, key)] = value
	return nil
}

func (backend *MemoryBackend) Get(service, key string) (string, error) {
	value, ok := backend.values[memorySlot(service, key)]
	if !ok {
		return "", errSecretNotFound
	}
	return value, nil
}

func (backend *MemoryBackend) Delete(service, key string) error {
	slot := memorySlot(service, key)
	if _, ok := backend.values[slot]; !ok {
		return errSecretNotFound
	}
	delete(backend.values, slot)
	return nil
}
