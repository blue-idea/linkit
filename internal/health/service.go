package health

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/metadata"
)

type Health string

const (
	HealthOK      Health = "ok"
	HealthChanged Health = "changed"
	HealthBroken  Health = "broken"
)

type ScanStatus string

const (
	StatusCompleted ScanStatus = "completed"
	StatusCancelled ScanStatus = "cancelled"
	StatusFailed    ScanStatus = "failed"
)

type Target struct {
	BookmarkID          string  `json:"bookmarkId"`
	URL                 string  `json:"url"`
	PreviousFingerprint *string `json:"previousFingerprint"`
}

type StartScanRequest struct {
	ScanID  string   `json:"scanId"`
	Targets []Target `json:"targets"`
}

type Result struct {
	BookmarkID  string  `json:"bookmarkId"`
	Health      Health  `json:"health"`
	HTTPStatus  *int    `json:"httpStatus"`
	CheckedAt   string  `json:"checkedAt"`
	Fingerprint *string `json:"fingerprint"`
	ErrorCode   *string `json:"errorCode"`
}

type ProgressEvent struct {
	ScanID    string  `json:"scanId"`
	Completed int     `json:"completed"`
	Total     int     `json:"total"`
	Result    *Result `json:"result,omitempty"`
}

type FinishedEvent struct {
	ScanID    string     `json:"scanId"`
	Status    ScanStatus `json:"status"`
	Completed int        `json:"completed"`
	Total     int        `json:"total"`
}

type Emitter interface {
	Progress(ProgressEvent)
	Finished(FinishedEvent)
}

type noopEmitter struct{}

func (noopEmitter) Progress(ProgressEvent) {}
func (noopEmitter) Finished(FinishedEvent) {}

type Option func(*Service)

type Service struct {
	client           *http.Client
	emitter          Emitter
	concurrency      int
	maxResponseBytes int64
	mu               sync.Mutex
	active           map[string]context.CancelFunc
}

func NewService(options ...Option) *Service {
	service := &Service{
		client: metadata.NewBoundedHTTPClient(), emitter: noopEmitter{},
		concurrency: config.HealthMaxConcurrency, maxResponseBytes: config.HTTPMaxResponseBytes,
		active: make(map[string]context.CancelFunc),
	}
	for _, option := range options {
		option(service)
	}
	return service
}

func WithEmitter(emitter Emitter) Option {
	return func(service *Service) {
		if emitter != nil {
			service.emitter = emitter
		}
	}
}

func WithHTTPClient(client *http.Client) Option {
	return func(service *Service) {
		if client != nil {
			service.client = client
		}
	}
}

func WithConcurrency(concurrency int) Option {
	return func(service *Service) {
		if concurrency > 0 {
			service.concurrency = concurrency
		}
	}
}

func Fingerprint(content []byte) string {
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:])
}

func (service *Service) StartScan(request StartScanRequest) error {
	if err := validateRequest(request); err != nil {
		return err
	}
	service.mu.Lock()
	if _, exists := service.active[request.ScanID]; exists {
		service.mu.Unlock()
		return errors.New("Health scan is already running")
	}
	ctx, cancel := context.WithCancel(context.Background())
	service.active[request.ScanID] = cancel
	service.mu.Unlock()

	go service.run(ctx, request)
	return nil
}

func (service *Service) CancelScan(scanID string) error {
	service.mu.Lock()
	cancel, exists := service.active[strings.TrimSpace(scanID)]
	service.mu.Unlock()
	if !exists {
		return errors.New("Health scan was not found")
	}
	cancel()
	return nil
}

func (service *Service) run(ctx context.Context, request StartScanRequest) {
	defer func() {
		service.mu.Lock()
		delete(service.active, request.ScanID)
		service.mu.Unlock()
	}()

	jobs := make(chan Target)
	var completed atomic.Int32
	var workers sync.WaitGroup
	workerCount := min(service.concurrency, len(request.Targets))
	for range workerCount {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case target, open := <-jobs:
					if !open {
						return
					}
					result, ok := service.check(ctx, target)
					if !ok {
						return
					}
					count := int(completed.Add(1))
					service.emitter.Progress(ProgressEvent{ScanID: request.ScanID, Completed: count, Total: len(request.Targets), Result: &result})
				}
			}
		}()
	}

sendLoop:
	for _, target := range request.Targets {
		select {
		case <-ctx.Done():
			break sendLoop
		case jobs <- target:
		}
	}
	close(jobs)
	workers.Wait()
	status := StatusCompleted
	if ctx.Err() != nil {
		status = StatusCancelled
	}
	service.emitter.Finished(FinishedEvent{ScanID: request.ScanID, Status: status, Completed: int(completed.Load()), Total: len(request.Targets)})
}

func (service *Service) check(ctx context.Context, target Target) (Result, bool) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, target.URL, nil)
	if err != nil {
		return brokenResult(target.BookmarkID, nil, "INVALID_URL"), true
	}
	request.Header.Set("User-Agent", config.HTTPUserAgent)
	request.Header.Set("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8")
	response, err := service.client.Do(request)
	if err != nil {
		if ctx.Err() != nil {
			return Result{}, false
		}
		code := classifyNetworkError(err)
		return brokenResult(target.BookmarkID, nil, code), true
	}
	defer response.Body.Close()
	status := response.StatusCode
	if status < http.StatusOK || status >= http.StatusBadRequest {
		return brokenResult(target.BookmarkID, &status, fmt.Sprintf("HTTP_%d", status)), true
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, service.maxResponseBytes+1))
	if err != nil {
		if ctx.Err() != nil {
			return Result{}, false
		}
		return brokenResult(target.BookmarkID, &status, "READ_FAILED"), true
	}
	if int64(len(body)) > service.maxResponseBytes {
		return brokenResult(target.BookmarkID, &status, "RESPONSE_TOO_LARGE"), true
	}
	fingerprint := Fingerprint(body)
	health := HealthOK
	if target.PreviousFingerprint != nil && *target.PreviousFingerprint != fingerprint {
		health = HealthChanged
	}
	return Result{BookmarkID: target.BookmarkID, Health: health, HTTPStatus: &status, CheckedAt: time.Now().UTC().Format(time.RFC3339Nano), Fingerprint: &fingerprint}, true
}

func brokenResult(bookmarkID string, status *int, code string) Result {
	return Result{BookmarkID: bookmarkID, Health: HealthBroken, HTTPStatus: status, CheckedAt: time.Now().UTC().Format(time.RFC3339Nano), ErrorCode: &code}
}

func validateRequest(request StartScanRequest) error {
	if strings.TrimSpace(request.ScanID) == "" || len(request.Targets) == 0 {
		return errors.New("Health scan request is invalid")
	}
	for _, target := range request.Targets {
		parsed, err := url.Parse(strings.TrimSpace(target.URL))
		if err != nil || strings.TrimSpace(target.BookmarkID) == "" || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
			return errors.New("Health scan target is invalid")
		}
	}
	return nil
}

func classifyNetworkError(err error) string {
	var netError net.Error
	if errors.As(err, &netError) && netError.Timeout() {
		return "TIMEOUT"
	}
	return "NETWORK_ERROR"
}
