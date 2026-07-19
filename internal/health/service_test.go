package health

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

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

func TestWailsEmitterWithoutContextIsNoop(t *testing.T) {
	emitter := NewWailsEmitter()
	emitter.SetContext(nil)
	emitter.Progress(ProgressEvent{ScanID: "no-context"})
	emitter.Finished(FinishedEvent{ScanID: "no-context"})
}

var _ Emitter = (*recordingEmitter)(nil)
