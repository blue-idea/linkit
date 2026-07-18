package metadata

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/blue-idea/collection/config"
)

type codedError interface {
	error
	ErrorCode() string
	IsRetryable() bool
}

func TestFetchMetadataExtractsStaticHTML(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Header.Get("User-Agent") != config.HTTPUserAgent {
			t.Errorf("Unexpected User-Agent: %s", request.Header.Get("User-Agent"))
		}
		writer.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.WriteString(writer, `<!doctype html><html><head>
<title>Example Title</title>
<meta name="description" content="Example description">
<link rel="icon" href="/favicon.ico">
<script>window.secret = "should-not-appear"</script>
</head><body><h1>Hello</h1><p>Readable text</p><style>.x{color:red}</style></body></html>`)
	}))
	t.Cleanup(server.Close)

	service := NewService(WithHTTPClient(server.Client()))
	// REQ-006-AC-001/003：成功抓取时返回可编辑预览字段，且不执行脚本。
	result, err := service.FetchMetadata(MetadataRequest{URL: server.URL + "/page"})
	if err != nil {
		t.Fatalf("FetchMetadata returned error: %v", err)
	}
	if result.Title != "Example Title" || result.Description != "Example description" {
		t.Fatalf("Unexpected title/description: %+v", result)
	}
	if result.Domain == "" || result.FinalURL == "" || result.ContentFingerprint == "" {
		t.Fatalf("Missing normalized fields: %+v", result)
	}
	if result.FaviconURL == nil || !strings.HasSuffix(*result.FaviconURL, "/favicon.ico") {
		t.Fatalf("Unexpected favicon: %+v", result.FaviconURL)
	}
	if strings.Contains(result.ContentText, "should-not-appear") || strings.Contains(result.ContentText, ".x{") {
		t.Fatalf("Script/style content leaked into contentText: %q", result.ContentText)
	}
	if !strings.Contains(result.ContentText, "Readable text") {
		t.Fatalf("Expected readable text in contentText: %q", result.ContentText)
	}
}

func TestFetchMetadataRejectsUnsafeURLsAndRedirects(t *testing.T) {
	service := NewService()

	// REQ-025 / 设计约束：仅允许 HTTP(S)，拒绝危险协议。
	for _, raw := range []string{
		"javascript:alert(1)",
		"file:///etc/passwd",
		"data:text/html,hi",
		"ftp://example.test/a",
		"",
		"not-a-url",
	} {
		_, err := service.FetchMetadata(MetadataRequest{URL: raw})
		assertCodedError(t, err, config.ErrorCodeURLInvalid, false)
	}

	redirectServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		http.Redirect(writer, request, "javascript:alert(1)", http.StatusFound)
	}))
	t.Cleanup(redirectServer.Close)

	// 使用服务内建受限客户端，确保危险重定向被拒绝。
	redirectService := NewService(WithHTTPClient(newTestTransportClient(redirectServer)))
	_, err := redirectService.FetchMetadata(MetadataRequest{URL: redirectServer.URL})
	assertCodedError(t, err, config.ErrorCodeMetadataFetchFailed, true)
}

func TestFetchMetadataEnforcesSizeTimeoutAndFailure(t *testing.T) {
	oversized := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "text/html")
		_, _ = writer.Write([]byte("<html><body>" + strings.Repeat("A", 128) + "</body></html>"))
	}))
	t.Cleanup(oversized.Close)

	// 使用极小上限验证大小门禁。
	service := NewService(
		WithHTTPClient(oversized.Client()),
		WithMaxResponseBytes(32),
	)
	_, err := service.FetchMetadata(MetadataRequest{URL: oversized.URL})
	assertCodedError(t, err, config.ErrorCodeMetadataFetchFailed, true)

	slow := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		time.Sleep(200 * time.Millisecond)
		_, _ = io.WriteString(writer, "<html><title>slow</title></html>")
	}))
	t.Cleanup(slow.Close)
	timeoutClient := slow.Client()
	timeoutClient.Timeout = 50 * time.Millisecond
	timeoutService := NewService(WithHTTPClient(timeoutClient))
	_, err = timeoutService.FetchMetadata(MetadataRequest{URL: slow.URL})
	assertCodedError(t, err, config.ErrorCodeMetadataFetchFailed, true)

	failing := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		http.Error(writer, "gone", http.StatusGone)
	}))
	t.Cleanup(failing.Close)
	failService := NewService(WithHTTPClient(failing.Client()))
	_, err = failService.FetchMetadata(MetadataRequest{URL: failing.URL})
	assertCodedError(t, err, config.ErrorCodeMetadataFetchFailed, true)
}

func TestFetchMetadataFollowsSafeRedirect(t *testing.T) {
	var finalServer *httptest.Server
	finalServer = httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		_, _ = io.WriteString(writer, `<html><head><title>Final</title></head><body>ok</body></html>`)
	}))
	t.Cleanup(finalServer.Close)

	startServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		http.Redirect(writer, request, finalServer.URL+"/done", http.StatusFound)
	}))
	t.Cleanup(startServer.Close)

	service := NewService(WithHTTPClient(newTestTransportClient(startServer)))
	result, err := service.FetchMetadata(MetadataRequest{URL: startServer.URL})
	if err != nil {
		t.Fatalf("FetchMetadata returned error: %v", err)
	}
	if result.Title != "Final" || !strings.HasSuffix(result.FinalURL, "/done") {
		t.Fatalf("Unexpected redirect result: %+v", result)
	}
}

// newTestTransportClient 复用 httptest 证书/transport，并挂上与生产一致的重定向校验。
func newTestTransportClient(server *httptest.Server) *http.Client {
	client := NewBoundedHTTPClient()
	client.Transport = server.Client().Transport
	return client
}

func assertCodedError(t *testing.T, err error, code string, retryable bool) {
	t.Helper()
	if err == nil {
		t.Fatalf("Expected coded error %s", code)
	}
	coded, ok := err.(codedError)
	if !ok {
		t.Fatalf("Expected coded error, got %T: %v", err, err)
	}
	if coded.ErrorCode() != code || coded.IsRetryable() != retryable {
		t.Fatalf("Unexpected coded error: code=%s retryable=%v want code=%s retryable=%v", coded.ErrorCode(), coded.IsRetryable(), code, retryable)
	}
}
