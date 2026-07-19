//go:build !dev

package config

import "testing"

func TestReleaseIdentitySlot(t *testing.T) {
	t.Parallel()

	if AppIdentityProfile != "release" {
		t.Fatalf("AppIdentityProfile: got %q, want release", AppIdentityProfile)
	}
	if AppDataDirectoryName != "Linkit" {
		t.Fatalf("AppDataDirectoryName: got %q, want Linkit", AppDataDirectoryName)
	}
	if SecretServiceName != "Linkit" {
		t.Fatalf("SecretServiceName: got %q, want Linkit", SecretServiceName)
	}
	if AppTitle != "Linkit" {
		t.Fatalf("AppTitle: got %q, want Linkit", AppTitle)
	}
}
