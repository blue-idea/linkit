package platform

import (
	"errors"
	"testing"

	"github.com/blue-idea/collection/config"
)

func TestOpenExternalURLSuccessAndFailure(t *testing.T) {
	var opened string
	service := NewService(WithURLOpener(func(rawURL string) error {
		opened = rawURL
		return nil
	}))

	// REQ-008-AC-002：仅在打开成功时返回 nil，供前端增加 visitCount。
	if err := service.OpenExternalURL("https://example.test/article"); err != nil {
		t.Fatalf("OpenExternalURL returned error: %v", err)
	}
	if opened != "https://example.test/article" {
		t.Fatalf("Unexpected opened URL: %q", opened)
	}

	failing := NewService(WithURLOpener(func(string) error {
		return errors.New("browser unavailable")
	}))
	err := failing.OpenExternalURL("https://example.test/article")
	assertCodedError(t, err, config.ErrorCodeExternalOpenFailed, true)
}

func TestOpenExternalURLRejectsUnsafeSchemes(t *testing.T) {
	called := false
	service := NewService(WithURLOpener(func(string) error {
		called = true
		return nil
	}))

	for _, raw := range []string{"javascript:alert(1)", "file:///tmp/x", "data:text/html,hi", ""} {
		err := service.OpenExternalURL(raw)
		assertCodedError(t, err, config.ErrorCodeURLInvalid, false)
	}
	if called {
		t.Fatal("Unsafe URL must not invoke system browser")
	}
}
