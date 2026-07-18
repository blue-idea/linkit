package ai

import (
	"testing"

	"github.com/blue-idea/collection/internal/secretstore"
	"github.com/blue-idea/collection/internal/settingsstore"
)

func TestAdaptersWireSecretAndConsent(t *testing.T) {
	secrets := secretstore.NewService(secretstore.NewMemoryBackend())
	if err := secrets.SetAIKey(secretstore.SetSecretRequest{Value: "sk-adapter-key"}); err != nil {
		t.Fatalf("SetAIKey failed: %v", err)
	}
	loader := SecretKeyLoader{Secrets: secrets}
	key, err := loader.LoadAIKey()
	if err != nil || key != "sk-adapter-key" {
		t.Fatalf("SecretKeyLoader failed: key=%q err=%v", key, err)
	}

	root := t.TempDir()
	settings := settingsstore.NewService(root)
	payload := `{"settingsVersion":1,"storageMode":"local","theme":"midnight","locale":"en","ai":{"apiBase":"https://api.example.test/v1","model":"m"},"aiConsent":null,"view":{"defaultMode":"card"},"lastCloudRevision":null}`
	if err := settings.WriteSettings(settingsstore.SettingsWriteRequest{SettingsJSON: payload}); err != nil {
		t.Fatalf("WriteSettings failed: %v", err)
	}
	checker := SettingsConsentChecker{Settings: settings}
	granted, err := checker.HasConsent("https://api.example.test/v1")
	if err != nil {
		t.Fatalf("HasConsent failed: %v", err)
	}
	if granted {
		t.Fatal("Consent must be false before GrantAIConsent")
	}
	if err := settings.GrantAIConsent("https://api.example.test/v1"); err != nil {
		t.Fatalf("GrantAIConsent failed: %v", err)
	}
	granted, err = checker.HasConsent("https://api.example.test/v1/")
	if err != nil || !granted {
		t.Fatalf("Consent must be true after grant: granted=%v err=%v", granted, err)
	}
}
