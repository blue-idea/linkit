package ai

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/blue-idea/collection/config"
)

type codedError interface {
	error
	ErrorCode() string
	IsRetryable() bool
}

type stubKeyLoader struct {
	key string
	err error
}

func (s stubKeyLoader) LoadAIKey() (string, error) {
	if s.err != nil {
		return "", s.err
	}
	return s.key, nil
}

type stubConsent struct {
	granted bool
	err     error
	calls   atomic.Int32
}

func (s *stubConsent) HasConsent(apiBase string) (bool, error) {
	s.calls.Add(1)
	_ = apiBase
	if s.err != nil {
		return false, s.err
	}
	return s.granted, nil
}

func TestChatCompletionsHappyPathUsesConfiguredBaseModelAndKey(t *testing.T) {
	var gotAuth string
	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodPost {
			t.Errorf("Unexpected method: %s", request.Method)
		}
		if request.URL.Path != "/v1/chat/completions" {
			t.Errorf("Unexpected path: %s", request.URL.Path)
		}
		gotAuth = request.Header.Get("Authorization")
		raw, _ := io.ReadAll(request.Body)
		_ = json.Unmarshal(raw, &gotBody)
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{
			"choices":[{"message":{"role":"assistant","content":"{\"title\":\"Hello\",\"score\":1}"}}]
		}`)
	}))
	t.Cleanup(server.Close)

	client := NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{key: "sk-test-secret"}),
		WithConsentChecker(&stubConsent{granted: true}),
	)

	// REQ-019-AC-002：使用用户配置的 Base、Model 与 Key，且凭据只发往配置的 Base。
	result, err := client.ChatCompletions(ChatRequest{
		Context: AIContext{
			APIBase: server.URL + "/v1",
			Model:   "test-model",
			Locale:  "en",
		},
		System:               "Return JSON only",
		User:                 `{"url":"https://example.test"}`,
		SendsBookmarkContent: true,
	})
	if err != nil {
		t.Fatalf("ChatCompletions returned error: %v", err)
	}
	if gotAuth != "Bearer sk-test-secret" {
		t.Fatalf("Authorization must use configured key, got %q", gotAuth)
	}
	if gotBody["model"] != "test-model" {
		t.Fatalf("Unexpected model in body: %#v", gotBody["model"])
	}
	var payload map[string]any
	if err := json.Unmarshal(result.ContentJSON, &payload); err != nil {
		t.Fatalf("ContentJSON must be strict JSON: %v", err)
	}
	if payload["title"] != "Hello" {
		t.Fatalf("Unexpected normalized content: %s", string(result.ContentJSON))
	}
}

func TestChatCompletionsRequiresConsentBeforeNetwork(t *testing.T) {
	var hits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		writer.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(writer, `{"choices":[{"message":{"content":"{}"}}]}`)
	}))
	t.Cleanup(server.Close)

	consent := &stubConsent{granted: false}
	client := NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{key: "sk-test-secret"}),
		WithConsentChecker(consent),
	)

	// REQ-019-AC-005：未授权时不得建立外部请求。
	_, err := client.ChatCompletions(ChatRequest{
		Context: AIContext{
			APIBase: server.URL + "/v1",
			Model:   "test-model",
			Locale:  "en",
		},
		System:               "sys",
		User:                 "user bookmark content",
		SendsBookmarkContent: true,
	})
	assertCodedError(t, err, config.ErrorCodeAIConsentRequired, false)
	if hits.Load() != 0 {
		t.Fatalf("Consent failure must not hit the network, hits=%d", hits.Load())
	}
	if consent.calls.Load() < 1 {
		t.Fatal("Consent checker must be consulted")
	}
}

func TestChatCompletionsSkipsConsentWhenNotSendingBookmarkContent(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{"choices":[{"message":{"content":"{\"ok\":true}"}}]}`)
	}))
	t.Cleanup(server.Close)

	consent := &stubConsent{granted: false}
	client := NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{key: "sk-test"}),
		WithConsentChecker(consent),
	)

	_, err := client.ChatCompletions(ChatRequest{
		Context:              AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"},
		System:               "sys",
		User:                 "ping",
		SendsBookmarkContent: false,
	})
	if err != nil {
		t.Fatalf("Non-content request should succeed without consent: %v", err)
	}
	if consent.calls.Load() != 0 {
		t.Fatal("Consent must not be required when bookmark content is not sent")
	}
}

func TestChatCompletionsMapsUnauthorizedWithoutRetry(t *testing.T) {
	for _, status := range []int{http.StatusUnauthorized, http.StatusForbidden} {
		status := status
		t.Run(http.StatusText(status), func(t *testing.T) {
			var hits atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
				hits.Add(1)
				writer.WriteHeader(status)
				_, _ = io.WriteString(writer, `{"error":{"message":"bad key"}}`)
			}))
			t.Cleanup(server.Close)

			client := NewClient(
				WithHTTPClient(server.Client()),
				WithKeyLoader(stubKeyLoader{key: "sk-bad"}),
				WithConsentChecker(&stubConsent{granted: true}),
				WithMaxRetries(2),
				WithRetryBaseDelay(time.Millisecond),
			)

			// REQ-019-AC-003 / api.md：401/403 → AI_UNAUTHORIZED，不重试。
			_, err := client.ChatCompletions(sampleRequest(server.URL + "/v1"))
			assertCodedError(t, err, config.ErrorCodeAIUnauthorized, false)
			if hits.Load() != 1 {
				t.Fatalf("%d must not retry, hits=%d", status, hits.Load())
			}
			if strings.Contains(err.Error(), "sk-bad") {
				t.Fatalf("Error message must not leak API key: %v", err)
			}
		})
	}
}

func TestChatCompletionsRetriesRateLimitThenSucceeds(t *testing.T) {
	var hits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		n := hits.Add(1)
		if n < 3 {
			writer.WriteHeader(http.StatusTooManyRequests)
			_, _ = io.WriteString(writer, `{"error":"rate"}`)
			return
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{"choices":[{"message":{"content":"{\"ok\":true}"}}]}`)
	}))
	t.Cleanup(server.Close)

	client := NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{key: "sk-ok"}),
		WithConsentChecker(&stubConsent{granted: true}),
		WithMaxRetries(2),
		WithRetryBaseDelay(time.Millisecond),
	)

	// REQ-019-AC-003：429 有限重试后可恢复。
	result, err := client.ChatCompletions(sampleRequest(server.URL + "/v1"))
	if err != nil {
		t.Fatalf("Expected success after retries: %v", err)
	}
	if hits.Load() != 3 {
		t.Fatalf("Expected 3 attempts, got %d", hits.Load())
	}
	if string(result.ContentJSON) != `{"ok":true}` {
		t.Fatalf("Unexpected content: %s", result.ContentJSON)
	}
}

func TestChatCompletionsMapsPersistentRateLimit(t *testing.T) {
	var hits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		writer.WriteHeader(http.StatusTooManyRequests)
	}))
	t.Cleanup(server.Close)

	client := NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{key: "sk-ok"}),
		WithConsentChecker(&stubConsent{granted: true}),
		WithMaxRetries(2),
		WithRetryBaseDelay(time.Millisecond),
	)

	_, err := client.ChatCompletions(sampleRequest(server.URL + "/v1"))
	assertCodedError(t, err, config.ErrorCodeAIRateLimited, true)
	if hits.Load() != 3 {
		t.Fatalf("Expected retries exhausted at 3 hits, got %d", hits.Load())
	}
}

func TestChatCompletionsRetriesServerError(t *testing.T) {
	var hits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		writer.WriteHeader(http.StatusBadGateway)
	}))
	t.Cleanup(server.Close)

	client := NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{key: "sk-ok"}),
		WithConsentChecker(&stubConsent{granted: true}),
		WithMaxRetries(1),
		WithRetryBaseDelay(time.Millisecond),
	)

	_, err := client.ChatCompletions(sampleRequest(server.URL + "/v1"))
	assertCodedError(t, err, config.ErrorCodeAIRequestFailed, true)
	if hits.Load() != 2 {
		t.Fatalf("Expected 2 attempts for 5xx, got %d", hits.Load())
	}
}

func TestChatCompletionsMapsTimeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		time.Sleep(200 * time.Millisecond)
		writer.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(writer, `{"choices":[{"message":{"content":"{}"}}]}`)
	}))
	t.Cleanup(server.Close)

	httpClient := server.Client()
	httpClient.Timeout = 40 * time.Millisecond
	client := NewClient(
		WithHTTPClient(httpClient),
		WithKeyLoader(stubKeyLoader{key: "sk-ok"}),
		WithConsentChecker(&stubConsent{granted: true}),
		WithMaxRetries(0),
	)

	_, err := client.ChatCompletions(sampleRequest(server.URL + "/v1"))
	assertCodedError(t, err, config.ErrorCodeAITimeout, true)
}

func TestChatCompletionsRejectsInvalidJSONContent(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{
			"choices":[{"message":{"content":"not-json-at-all"}}]
		}`)
	}))
	t.Cleanup(server.Close)

	client := NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{key: "sk-ok"}),
		WithConsentChecker(&stubConsent{granted: true}),
	)

	// REQ-019 / api.md §5.3：HTTP 成功不等于业务成功，必须严格 JSON。
	_, err := client.ChatCompletions(sampleRequest(server.URL + "/v1"))
	assertCodedError(t, err, config.ErrorCodeAIResponseInvalid, true)
}

func TestChatCompletionsEnforcesResponseSizeLimit(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		payload := `{"choices":[{"message":{"content":"{\"x\":"` + strings.Repeat("A", 200) + `\"}"}}]}`
		_, _ = io.WriteString(writer, payload)
	}))
	t.Cleanup(server.Close)

	client := NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{key: "sk-ok"}),
		WithConsentChecker(&stubConsent{granted: true}),
		WithMaxResponseBytes(64),
	)

	_, err := client.ChatCompletions(sampleRequest(server.URL + "/v1"))
	assertCodedError(t, err, config.ErrorCodeAIResponseInvalid, true)
}

func TestChatCompletionsFailsWithoutKeyAndSkipsNetwork(t *testing.T) {
	var hits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		writer.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)

	client := NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{err: newServiceError(config.ErrorCodeSecretNotConfigured, config.ErrorMessageSecretNotConfigured, false, nil)}),
		WithConsentChecker(&stubConsent{granted: true}),
	)

	_, err := client.ChatCompletions(sampleRequest(server.URL + "/v1"))
	assertCodedError(t, err, config.ErrorCodeSecretNotConfigured, false)
	if hits.Load() != 0 {
		t.Fatalf("Missing key must not hit network, hits=%d", hits.Load())
	}
}

func sampleRequest(apiBase string) ChatRequest {
	return ChatRequest{
		Context: AIContext{
			APIBase: apiBase,
			Model:   "test-model",
			Locale:  "en",
		},
		System:               "Return JSON",
		User:                 `{"q":"x"}`,
		SendsBookmarkContent: true,
	}
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
		t.Fatalf("Unexpected coded error: code=%s retryable=%v want code=%s retryable=%v message=%s",
			coded.ErrorCode(), coded.IsRetryable(), code, retryable, coded.Error())
	}
}
