package netproxy

import (
	"net/http"
	"net/url"
	"testing"
)

func TestChainUsesPrimaryProxyWhenAvailable(t *testing.T) {
	request, err := http.NewRequest(http.MethodGet, "https://example.com", nil)
	if err != nil {
		t.Fatalf("NewRequest returned error: %v", err)
	}
	primaryURL, err := url.Parse("http://primary.proxy:8080")
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	fallbackURL, err := url.Parse("http://fallback.proxy:8080")
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}

	proxyFunc := Chain(
		func(*http.Request) (*url.URL, error) { return primaryURL, nil },
		func(*http.Request) (*url.URL, error) { return fallbackURL, nil },
	)

	got, err := proxyFunc(request)
	if err != nil {
		t.Fatalf("Proxy func returned error: %v", err)
	}
	if got == nil || got.String() != primaryURL.String() {
		t.Fatalf("Expected primary proxy %q, got %#v", primaryURL.String(), got)
	}
}

func TestChainFallsBackToSystemProxyWhenEnvironmentProxyIsAbsent(t *testing.T) {
	request, err := http.NewRequest(http.MethodGet, "https://example.com", nil)
	if err != nil {
		t.Fatalf("NewRequest returned error: %v", err)
	}
	fallbackURL, err := url.Parse("http://system.proxy:8080")
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}

	proxyFunc := Chain(
		func(*http.Request) (*url.URL, error) { return nil, nil },
		func(*http.Request) (*url.URL, error) { return fallbackURL, nil },
	)

	got, err := proxyFunc(request)
	if err != nil {
		t.Fatalf("Proxy func returned error: %v", err)
	}
	if got == nil || got.String() != fallbackURL.String() {
		t.Fatalf("Expected fallback proxy %q, got %#v", fallbackURL.String(), got)
	}
}

func TestChainStopsOnPrimaryError(t *testing.T) {
	request, err := http.NewRequest(http.MethodGet, "https://example.com", nil)
	if err != nil {
		t.Fatalf("NewRequest returned error: %v", err)
	}
	expected := &url.Error{Op: "parse", URL: "https_proxy", Err: url.InvalidHostError("bad proxy")}

	proxyFunc := Chain(
		func(*http.Request) (*url.URL, error) { return nil, expected },
		func(*http.Request) (*url.URL, error) {
			t.Fatal("Fallback proxy must not run after primary error")
			return nil, nil
		},
	)

	_, gotErr := proxyFunc(request)
	if gotErr == nil || gotErr.Error() != expected.Error() {
		t.Fatalf("Expected primary error %v, got %v", expected, gotErr)
	}
}
