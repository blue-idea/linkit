package platform

import (
	"strings"

	"github.com/blue-idea/collection/internal/httpurl"
	"github.com/pkg/browser"
)

func validateExternalURL(rawURL string) error {
	return httpurl.Validate(rawURL)
}

func defaultOpenURL(rawURL string) error {
	return browser.OpenURL(strings.TrimSpace(rawURL))
}
