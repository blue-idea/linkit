package health

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

type timeoutError struct{}

func (timeoutError) Error() string   { return "timeout" }
func (timeoutError) Timeout() bool   { return true }
func (timeoutError) Temporary() bool { return true }

type recordingEmitter struct {
	mu       sync.Mutex
	progress []ProgressEvent
	finished []FinishedEvent
	done     chan struct{}
}

func newRecordingEmitter() *recordingEmitter {
	return &recordingEmitter{done: make(chan struct{})}
}

func (emitter *recordingEmitter) Progress(event ProgressEvent) {
	emitter.mu.Lock()
	defer emitter.mu.Unlock()
	emitter.progress = append(emitter.progress, event)
}

func (emitter *recordingEmitter) Finished(event FinishedEvent) {
	emitter.mu.Lock()
	emitter.finished = append(emitter.finished, event)
	emitter.mu.Unlock()
	select {
	case <-emitter.done:
	default:
		close(emitter.done)
	}
}

func (emitter *recordingEmitter) wait(t *testing.T) FinishedEvent {
	t.Helper()
	select {
	case <-emitter.done:
	case <-time.After(2 * time.Second):
		t.Fatal("Timed out waiting for health scan")
	}
	emitter.mu.Lock()
	defer emitter.mu.Unlock()
	return emitter.finished[len(emitter.finished)-1]
}

// REQ-022-AC-002：成功响应按指纹变化归类，失效状态归类为 broken。
func TestStartScanClassifiesResultsAndEmitsProgress(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/same":
			_, _ = writer.Write([]byte("stable content"))
		case "/changed":
			_, _ = writer.Write([]byte("new content"))
		default:
			http.NotFound(writer, request)
		}
	}))
	defer server.Close()

	emitter := newRecordingEmitter()
	service := NewService(WithEmitter(emitter), WithHTTPClient(server.Client()))
	stable := Fingerprint([]byte("stable content"))
	if err := service.StartScan(StartScanRequest{ScanID: "scan-results", Targets: []Target{
		{BookmarkID: "same", URL: server.URL + "/same", PreviousFingerprint: &stable},
		{BookmarkID: "changed", URL: server.URL + "/changed", PreviousFingerprint: &stable},
		{BookmarkID: "broken", URL: server.URL + "/missing"},
	}}); err != nil {
		t.Fatalf("StartScan returned error: %v", err)
	}
	finished := emitter.wait(t)
	if finished.Status != StatusCompleted || finished.Completed != 3 || finished.Total != 3 {
		t.Fatalf("Unexpected final event: %#v", finished)
	}

	emitter.mu.Lock()
	defer emitter.mu.Unlock()
	results := make(map[string]Result)
	for _, event := range emitter.progress {
		if event.Result != nil {
			results[event.Result.BookmarkID] = *event.Result
		}
	}
	if results["same"].Health != HealthOK {
		t.Fatalf("Expected same fingerprint to be ok, got %#v", results["same"])
	}
	if results["changed"].Health != HealthChanged {
		t.Fatalf("Expected changed fingerprint, got %#v", results["changed"])
	}
	if results["broken"].Health != HealthBroken || results["broken"].HTTPStatus == nil || *results["broken"].HTTPStatus != 404 {
		t.Fatalf("Expected HTTP 404 to be broken, got %#v", results["broken"])
	}
}

// REQ-022-AC-002：扫描同时进行的请求不得超过配置的并发上限。
func TestStartScanHonoursConcurrencyLimit(t *testing.T) {
	var active atomic.Int32
	var maximum atomic.Int32
	release := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		current := active.Add(1)
		defer active.Add(-1)
		for current > maximum.Load() && !maximum.CompareAndSwap(maximum.Load(), current) {
		}
		<-release
		_, _ = writer.Write([]byte("ok"))
	}))
	defer server.Close()

	emitter := newRecordingEmitter()
	service := NewService(WithEmitter(emitter), WithHTTPClient(server.Client()), WithConcurrency(2))
	targets := make([]Target, 6)
	for index := range targets {
		targets[index] = Target{BookmarkID: string(rune('a' + index)), URL: server.URL}
	}
	if err := service.StartScan(StartScanRequest{ScanID: "scan-limit", Targets: targets}); err != nil {
		t.Fatalf("StartScan returned error: %v", err)
	}
	time.Sleep(50 * time.Millisecond)
	close(release)
	emitter.wait(t)
	if maximum.Load() > 2 {
		t.Fatalf("Concurrency exceeded limit: got %d", maximum.Load())
	}
}

// REQ-022-AC-002：取消后只保留已完成结果，未完成目标不得伪造。
func TestCancelScanEmitsCancelledFinalEvent(t *testing.T) {
	started := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		select {
		case <-started:
		default:
			close(started)
		}
		<-request.Context().Done()
	}))
	defer server.Close()

	emitter := newRecordingEmitter()
	client := server.Client()
	client.Timeout = time.Second
	service := NewService(WithEmitter(emitter), WithHTTPClient(client), WithConcurrency(1))
	if err := service.StartScan(StartScanRequest{ScanID: "scan-cancel", Targets: []Target{
		{BookmarkID: "one", URL: server.URL}, {BookmarkID: "two", URL: server.URL},
	}}); err != nil {
		t.Fatalf("StartScan returned error: %v", err)
	}
	<-started
	if err := service.CancelScan("scan-cancel"); err != nil {
		t.Fatalf("CancelScan returned error: %v", err)
	}
	finished := emitter.wait(t)
	if finished.Status != StatusCancelled || finished.Completed != 0 || finished.Total != 2 {
		t.Fatalf("Unexpected cancelled event: %#v", finished)
	}
}

func TestStartScanRejectsDuplicateOrInvalidRequests(t *testing.T) {
	service := NewService(WithEmitter(newRecordingEmitter()))
	if err := service.StartScan(StartScanRequest{}); err == nil {
		t.Fatal("Expected invalid request to be rejected")
	}
	request := StartScanRequest{ScanID: "duplicate", Targets: []Target{{BookmarkID: "one", URL: "https://example.com"}}}
	if err := service.StartScan(request); err != nil {
		t.Fatalf("First StartScan returned error: %v", err)
	}
	if err := service.StartScan(request); err == nil {
		t.Fatal("Expected duplicate active scan to be rejected")
	}
	_ = service.CancelScan("duplicate")
}

// REQ-022-AC-002：受限访问或限流响应不应误判为失效，也不应误判为内容变更。
func TestStartScanTreatsRestrictedResponsesAsReachableWithoutFingerprintDrift(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.WriteHeader(http.StatusForbidden)
		_, _ = writer.Write([]byte("access denied"))
	}))
	defer server.Close()

	emitter := newRecordingEmitter()
	previous := Fingerprint([]byte("stable content"))
	service := NewService(WithEmitter(emitter), WithHTTPClient(server.Client()))
	if err := service.StartScan(StartScanRequest{ScanID: "scan-restricted", Targets: []Target{
		{BookmarkID: "restricted", URL: server.URL, PreviousFingerprint: &previous},
	}}); err != nil {
		t.Fatalf("StartScan returned error: %v", err)
	}

	finished := emitter.wait(t)
	if finished.Status != StatusCompleted || finished.Completed != 1 || finished.Total != 1 {
		t.Fatalf("Unexpected final event: %#v", finished)
	}

	emitter.mu.Lock()
	defer emitter.mu.Unlock()
	if len(emitter.progress) != 1 || emitter.progress[0].Result == nil {
		t.Fatalf("Expected one progress result, got %#v", emitter.progress)
	}
	result := *emitter.progress[0].Result
	if result.Health != HealthOK {
		t.Fatalf("Expected restricted response to remain reachable, got %#v", result)
	}
	if result.HTTPStatus == nil || *result.HTTPStatus != http.StatusForbidden {
		t.Fatalf("Expected HTTP status to be preserved, got %#v", result)
	}
	if result.ErrorCode != nil {
		t.Fatalf("Expected restricted response to avoid broken error code, got %#v", result)
	}
	if result.Fingerprint != nil {
		t.Fatalf("Expected restricted response to avoid fingerprint drift, got %#v", result)
	}
}

// REQ-022-AC-002：真正表示资源失效的状态仍需归类为 broken。
func TestStartScanTreatsGoneResponsesAsBroken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.WriteHeader(http.StatusGone)
		_, _ = writer.Write([]byte("gone"))
	}))
	defer server.Close()

	emitter := newRecordingEmitter()
	service := NewService(WithEmitter(emitter), WithHTTPClient(server.Client()))
	if err := service.StartScan(StartScanRequest{ScanID: "scan-gone", Targets: []Target{
		{BookmarkID: "gone", URL: server.URL},
	}}); err != nil {
		t.Fatalf("StartScan returned error: %v", err)
	}

	emitter.wait(t)
	emitter.mu.Lock()
	defer emitter.mu.Unlock()
	if len(emitter.progress) != 1 || emitter.progress[0].Result == nil {
		t.Fatalf("Expected one progress result, got %#v", emitter.progress)
	}
	result := *emitter.progress[0].Result
	if result.Health != HealthBroken {
		t.Fatalf("Expected gone response to be broken, got %#v", result)
	}
	if result.HTTPStatus == nil || *result.HTTPStatus != http.StatusGone {
		t.Fatalf("Expected HTTP 410 to be preserved, got %#v", result)
	}
	if result.ErrorCode == nil || *result.ErrorCode != "HTTP_410" {
		t.Fatalf("Expected HTTP_410 error code, got %#v", result)
	}
}

// REQ-022-AC-002：瞬时超时应先重试，成功后不得误判为 broken。
func TestStartScanRetriesTransientTimeoutBeforeClassifyingBroken(t *testing.T) {
	var attempts atomic.Int32
	client := &http.Client{
		Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			if attempts.Add(1) == 1 {
				return nil, timeoutError{}
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Header:     make(http.Header),
				Body:       io.NopCloser(strings.NewReader("stable content")),
				Request:    request,
			}, nil
		}),
	}

	emitter := newRecordingEmitter()
	service := NewService(WithEmitter(emitter), WithHTTPClient(client))
	if err := service.StartScan(StartScanRequest{ScanID: "scan-transient-timeout", Targets: []Target{
		{BookmarkID: "retry", URL: "https://example.com"},
	}}); err != nil {
		t.Fatalf("StartScan returned error: %v", err)
	}

	emitter.wait(t)
	emitter.mu.Lock()
	defer emitter.mu.Unlock()
	if len(emitter.progress) != 1 || emitter.progress[0].Result == nil {
		t.Fatalf("Expected one progress result, got %#v", emitter.progress)
	}
	result := *emitter.progress[0].Result
	if result.Health != HealthOK || result.ErrorCode != nil {
		t.Fatalf("Expected transient timeout to recover as ok, got %#v", result)
	}
	if attempts.Load() != 2 {
		t.Fatalf("Expected one retry after timeout, got %d attempts", attempts.Load())
	}
}

// REQ-022-AC-002：已有历史成功指纹时，网络层不确定错误不应直接翻转为 broken。
func TestStartScanKeepsPreviousFingerprintOnNetworkUncertainty(t *testing.T) {
	client := &http.Client{
		Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			return nil, timeoutError{}
		}),
	}

	emitter := newRecordingEmitter()
	previous := Fingerprint([]byte("stable content"))
	service := NewService(WithEmitter(emitter), WithHTTPClient(client), WithMaxRetries(0))
	if err := service.StartScan(StartScanRequest{ScanID: "scan-uncertain-network", Targets: []Target{
		{BookmarkID: "known", URL: "https://example.com", PreviousFingerprint: &previous},
	}}); err != nil {
		t.Fatalf("StartScan returned error: %v", err)
	}

	emitter.wait(t)
	emitter.mu.Lock()
	defer emitter.mu.Unlock()
	if len(emitter.progress) != 1 || emitter.progress[0].Result == nil {
		t.Fatalf("Expected one progress result, got %#v", emitter.progress)
	}
	result := *emitter.progress[0].Result
	if result.Health != HealthOK {
		t.Fatalf("Expected uncertain network failure to keep ok, got %#v", result)
	}
	if result.Fingerprint == nil || *result.Fingerprint != previous {
		t.Fatalf("Expected previous fingerprint to be preserved, got %#v", result)
	}
	if result.ErrorCode == nil || *result.ErrorCode != "TIMEOUT" {
		t.Fatalf("Expected TIMEOUT diagnostic to be preserved, got %#v", result)
	}
}

// REQ-022-AC-002：首次扫描且无历史成功记录时，网络失败仍应归类为 broken。
func TestStartScanMarksUnknownTargetBrokenOnNetworkFailure(t *testing.T) {
	client := &http.Client{
		Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			return nil, timeoutError{}
		}),
	}

	emitter := newRecordingEmitter()
	service := NewService(WithEmitter(emitter), WithHTTPClient(client), WithMaxRetries(0))
	if err := service.StartScan(StartScanRequest{ScanID: "scan-unknown-network", Targets: []Target{
		{BookmarkID: "unknown", URL: "https://example.com"},
	}}); err != nil {
		t.Fatalf("StartScan returned error: %v", err)
	}

	emitter.wait(t)
	emitter.mu.Lock()
	defer emitter.mu.Unlock()
	if len(emitter.progress) != 1 || emitter.progress[0].Result == nil {
		t.Fatalf("Expected one progress result, got %#v", emitter.progress)
	}
	result := *emitter.progress[0].Result
	if result.Health != HealthBroken {
		t.Fatalf("Expected unknown network failure to remain broken, got %#v", result)
	}
	if result.ErrorCode == nil || *result.ErrorCode != "TIMEOUT" {
		t.Fatalf("Expected TIMEOUT diagnostic to be preserved, got %#v", result)
	}
}

func TestWailsEmitterWithoutContextIsNoop(t *testing.T) {
	emitter := NewWailsEmitter()
	emitter.SetContext(nil)
	emitter.Progress(ProgressEvent{ScanID: "no-context"})
	emitter.Finished(FinishedEvent{ScanID: "no-context"})
}

var _ Emitter = (*recordingEmitter)(nil)
