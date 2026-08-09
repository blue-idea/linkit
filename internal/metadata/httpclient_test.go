package metadata

import (
	"net/http"
	"net/url"
	"testing"

	"github.com/blue-idea/collection/internal/netproxy"
)

func TestNewBoundedHTTPClientUsesSharedProxyResolver(t *testing.T) {
	original := resolveProxyFunc
	t.Cleanup(func() {
		resolveProxyFunc = original
	})

	expected, err := url.Parse("http://system.proxy:8080")
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	resolveProxyFunc = func() netproxy.ProxyFunc {
		return func(*http.Request) (*url.URL, error) {
			return expected, nil
		}
	}

	client := NewBoundedHTTPClient()
	transport, ok := client.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("Unexpected transport type: %T", client.Transport)
	}
	request, err := http.NewRequest(http.MethodGet, "https://example.com", nil)
	if err != nil {
		t.Fatalf("NewRequest returned error: %v", err)
	}
	got, err := transport.Proxy(request)
	if err != nil {
		t.Fatalf("Proxy returned error: %v", err)
	}
	if got == nil || got.String() != expected.String() {
		t.Fatalf("Expected shared proxy resolver %q, got %#v", expected.String(), got)
	}
}
