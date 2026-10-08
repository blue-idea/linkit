package updater

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/blue-idea/collection/config"
)

func TestCompareVersionsUsesSemanticOrdering(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		latest  string
		current string
		want    bool
	}{
		{name: "补丁版本更高", latest: "v0.3.10", current: "0.3.9", want: true},
		{name: "字符串顺序陷阱", latest: "v0.10.0", current: "0.9.9", want: true},
		{name: "相同版本不提示", latest: "v1.2.3", current: "1.2.3", want: false},
		{name: "低版本不提示", latest: "v1.2.2", current: "1.2.3", want: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got := IsNewerVersion(tc.latest, tc.current)
			if got != tc.want {
				t.Fatalf("IsNewerVersion(%q, %q) = %v, want %v", tc.latest, tc.current, got, tc.want)
			}
		})
	}
}

func TestSelectAssetForPlatform(t *testing.T) {
	t.Parallel()

	assets := []ReleaseAsset{
		{Name: "Linkit-0.4.0-windows-amd64.exe", BrowserDownloadURL: "https://example.test/linkit.exe"},
		{Name: "Linkit-0.4.0-linux-amd64.AppImage", BrowserDownloadURL: "https://example.test/linkit.AppImage"},
		{Name: "Linkit-0.4.0-linux-arm64.deb", BrowserDownloadURL: "https://example.test/linkit-arm64.deb"},
		{Name: "Linkit.dmg", BrowserDownloadURL: "https://example.test/Linkit.dmg"},
	}

	cases := []struct {
		name string
		goos string
		arch string
		want string
	}{
		{name: "macOS 使用 DMG", goos: "darwin", arch: "arm64", want: "https://example.test/Linkit.dmg"},
		{name: "Windows 使用安装包", goos: "windows", arch: "amd64", want: "https://example.test/linkit.exe"},
		{name: "Linux amd64 优先 AppImage", goos: "linux", arch: "amd64", want: "https://example.test/linkit.AppImage"},
		{name: "Linux arm64 使用匹配架构包", goos: "linux", arch: "arm64", want: "https://example.test/linkit-arm64.deb"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, ok := SelectAssetForPlatform(assets, tc.goos, tc.arch)
			if !ok {
				t.Fatalf("SelectAssetForPlatform(%s, %s) ok = false", tc.goos, tc.arch)
			}
			if got.BrowserDownloadURL != tc.want {
				t.Fatalf("asset URL = %q, want %q", got.BrowserDownloadURL, tc.want)
			}
		})
	}
}

func TestCheckForUpdatesUsesLinkitReleaseRepository(t *testing.T) {
	t.Parallel()

	var requestPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestPath = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ReleaseInfo{
			TagName: "v0.4.0",
			HTMLURL: "https://github.com/blue-idea/linkit/releases/tag/v0.4.0",
			Assets: []ReleaseAsset{
				{Name: "Linkit.dmg", BrowserDownloadURL: "https://github.com/blue-idea/linkit/releases/download/v0.4.0/Linkit.dmg"},
			},
		})
	}))
	defer server.Close()

	service := NewService(Config{
		CurrentVersion:    "0.3.9",
		ReleaseAPIBaseURL: server.URL,
		ReleaseRepository: config.ReleaseRepository,
		GOOS:              "darwin",
		GOARCH:            "arm64",
	})

	result, err := service.CheckForUpdates(context.Background())
	if err != nil {
		t.Fatalf("CheckForUpdates: %v", err)
	}
	if !result.Available {
		t.Fatal("expected update to be available")
	}
	if result.Version != "0.4.0" {
		t.Fatalf("version = %q, want 0.4.0", result.Version)
	}
	if result.DownloadURL != "https://github.com/blue-idea/linkit/releases/download/v0.4.0/Linkit.dmg" {
		t.Fatalf("download URL = %q", result.DownloadURL)
	}
	if requestPath != "/repos/blue-idea/linkit/releases/latest" {
		t.Fatalf("request path = %q, want /repos/blue-idea/linkit/releases/latest", requestPath)
	}
}

func TestCheckAndNotifyEmitsUpdateAvailable(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ReleaseInfo{
			TagName: "v0.4.0",
			HTMLURL: "https://github.com/blue-idea/linkit/releases/tag/v0.4.0",
			Assets: []ReleaseAsset{
				{Name: "Linkit-0.4.0-windows-amd64.exe", BrowserDownloadURL: "https://github.com/blue-idea/linkit/releases/download/v0.4.0/Linkit.exe"},
			},
		})
	}))
	defer server.Close()

	var eventName string
	var payload UpdateCheckResult
	service := NewService(Config{
		CurrentVersion:    "0.3.9",
		ReleaseAPIBaseURL: server.URL,
		ReleaseRepository: config.ReleaseRepository,
		GOOS:              "windows",
		GOARCH:            "amd64",
		Emitter: func(_ context.Context, name string, result UpdateCheckResult) {
			eventName = name
			payload = result
		},
	})

	result, err := service.CheckAndNotify(context.Background())
	if err != nil {
		t.Fatalf("CheckAndNotify: %v", err)
	}
	if !result.Available {
		t.Fatal("expected update to be available")
	}
	if eventName != config.EventUpdateAvailable {
		t.Fatalf("event name = %q, want %q", eventName, config.EventUpdateAvailable)
	}
	if payload.DownloadURL != "https://github.com/blue-idea/linkit/releases/download/v0.4.0/Linkit.exe" {
		t.Fatalf("payload download URL = %q", payload.DownloadURL)
	}
}

func TestCheckAndNotifyManualEmitsStartedAndFinishedWhenCurrent(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ReleaseInfo{
			TagName: "v0.4.0",
			HTMLURL: "https://github.com/blue-idea/linkit/releases/tag/v0.4.0",
		})
	}))
	defer server.Close()

	var eventNames []string
	var finishedPayload UpdateCheckResult
	service := NewService(Config{
		CurrentVersion:    "0.4.0",
		ReleaseAPIBaseURL: server.URL,
		ReleaseRepository: config.ReleaseRepository,
		Emitter: func(_ context.Context, name string, result UpdateCheckResult) {
			eventNames = append(eventNames, name)
			if name == config.EventUpdateCheckFinished {
				finishedPayload = result
			}
		},
	})

	result, err := service.CheckAndNotifyManual(context.Background())
	if err != nil {
		t.Fatalf("CheckAndNotifyManual: %v", err)
	}
	if result.Available {
		t.Fatal("expected current version to be up to date")
	}
	if len(eventNames) != 2 ||
		eventNames[0] != config.EventUpdateCheckStarted ||
		eventNames[1] != config.EventUpdateCheckFinished {
		t.Fatalf("event names = %v, want started then finished", eventNames)
	}
	if finishedPayload.Available || finishedPayload.Error != "" {
		t.Fatalf("finished payload = %+v, want current without error", finishedPayload)
	}
}

func TestCheckAndNotifyManualEmitsFinishedOnFailure(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "release lookup failed", http.StatusInternalServerError)
	}))
	defer server.Close()

	var eventNames []string
	var finishedPayload UpdateCheckResult
	service := NewService(Config{
		CurrentVersion:    "0.4.0",
		ReleaseAPIBaseURL: server.URL,
		ReleaseRepository: config.ReleaseRepository,
		Emitter: func(_ context.Context, name string, result UpdateCheckResult) {
			eventNames = append(eventNames, name)
			if name == config.EventUpdateCheckFinished {
				finishedPayload = result
			}
		},
	})

	_, err := service.CheckAndNotifyManual(context.Background())
	if err == nil {
		t.Fatal("expected release lookup error")
	}
	if len(eventNames) != 2 ||
		eventNames[0] != config.EventUpdateCheckStarted ||
		eventNames[1] != config.EventUpdateCheckFinished {
		t.Fatalf("event names = %v, want started then finished", eventNames)
	}
	if finishedPayload.Error == "" {
		t.Fatalf("finished payload = %+v, want error text", finishedPayload)
	}
}

func TestCheckForUpdatesNowUsesBackgroundContextForWailsBinding(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ReleaseInfo{
			TagName: "v0.4.0",
			HTMLURL: "https://github.com/blue-idea/linkit/releases/tag/v0.4.0",
		})
	}))
	defer server.Close()

	service := NewService(Config{
		CurrentVersion:    "0.3.9",
		ReleaseAPIBaseURL: server.URL,
		ReleaseRepository: config.ReleaseRepository,
	})

	result, err := service.CheckForUpdatesNow()
	if err != nil {
		t.Fatalf("CheckForUpdatesNow: %v", err)
	}
	if !result.Available || result.Version != "0.4.0" {
		t.Fatalf("unexpected update result: %+v", result)
	}
}

func TestNewServiceUsesBoundedDefaultHTTPTimeout(t *testing.T) {
	t.Parallel()

	service := NewService()

	if service.config.HTTPClient == nil {
		t.Fatal("default HTTP client must be configured")
	}
	if service.config.HTTPClient.Timeout != config.HTTPTotalTimeout {
		t.Fatalf("HTTP timeout = %s, want %s", service.config.HTTPClient.Timeout, config.HTTPTotalTimeout)
	}
}
