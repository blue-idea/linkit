package secretstore

import (
	"errors"

	"github.com/zalando/go-keyring"
)

// KeyringBackend 适配 Windows Credential Manager / macOS Keychain。
type KeyringBackend struct{}

func NewKeyringBackend() *KeyringBackend {
	return &KeyringBackend{}
}

func (backend *KeyringBackend) Set(service, key, value string) error {
	return keyring.Set(service, key, value)
}

func (backend *KeyringBackend) Get(service, key string) (string, error) {
	value, err := keyring.Get(service, key)
	if errors.Is(err, keyring.ErrNotFound) {
		return "", errSecretNotFound
	}
	return value, err
}

func (backend *KeyringBackend) Delete(service, key string) error {
	err := keyring.Delete(service, key)
	if errors.Is(err, keyring.ErrNotFound) {
		return errSecretNotFound
	}
	return err
}
