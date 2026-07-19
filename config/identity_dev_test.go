//go:build dev

package config

import "testing"

func TestDevIdentitySlot(t *testing.T) {
	t.Parallel()

	if AppIdentityProfile != "dev" {
		t.Fatalf("AppIdentityProfile: got %q, want dev", AppIdentityProfile)
	}
	if AppDataDirectoryName != "Linkit-Dev" {
		t.Fatalf("AppDataDirectoryName: got %q, want Linkit-Dev", AppDataDirectoryName)
	}
	if SecretServiceName != "Linkit-Dev" {
		t.Fatalf("SecretServiceName: got %q, want Linkit-Dev", SecretServiceName)
	}
	if AppTitle != "Linkit (Dev)" {
		t.Fatalf("AppTitle: got %q, want Linkit (Dev)", AppTitle)
	}
}
