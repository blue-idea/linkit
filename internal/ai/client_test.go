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

func TestNewBoundedHTTPClientUsesFortySecondAITimeouts(t *testing.T) {
	client := NewBoundedHTTPClient()
	if client.Timeout != 40*time.Second {
		t.Fatalf("Unexpected total timeout: got %s, want 40s", client.Timeout)
	}

	transport, ok := client.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("Unexpected transport type: %T", client.Transport)
	}
	if transport.ResponseHeaderTimeout != 40*time.Second {
		t.Fatalf("Unexpected response header timeout: got %s, want 40s", transport.ResponseHeaderTimeout)
	}
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

func TestConnectionUsesMinimalPayloadWithoutConsent(t *testing.T) {
	var gotBody map[string]any
	var gotAuthorization string
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		gotAuthorization = request.Header.Get("Authorization")
		raw, _ := io.ReadAll(request.Body)
		_ = json.Unmarshal(raw, &gotBody)
		writer.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(writer, "connected")
	}))
	t.Cleanup(server.Close)

	consent := &stubConsent{granted: false}
	clockValues := []time.Time{
		time.Date(2026, time.July, 27, 9, 0, 0, 0, time.UTC),
		time.Date(2026, time.July, 27, 9, 0, 0, 42_000_000, time.UTC),
	}
	clockIndex := 0
	client := NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{key: "sk-connection-secret"}),
		WithConsentChecker(consent),
		WithMaxRetries(0),
		WithClock(func() time.Time {
			value := clockValues[clockIndex]
			clockIndex++
			return value
		}),
	)

	// REQ-033-AC-001：连接测试只发送最小提示，不携带收藏内容，也不要求 consent。
	result, err := client.TestConnection(AIContext{
		APIBase: server.URL + "/v1",
		Model:   "test-model",
		Locale:  "en",
	})
	if err != nil {
		t.Fatalf("TestConnection returned error: %v", err)
	}
	if gotAuthorization != "Bearer sk-connection-secret" {
		t.Fatalf("Unexpected Authorization header: %q", gotAuthorization)
	}
	if gotBody["model"] != "test-model" {
		t.Fatalf("Unexpected model: %#v", gotBody["model"])
	}
	if _, exists := gotBody["bookmark"]; exists {
		t.Fatal("Connection payload must not contain bookmark data")
	}
	if _, exists := gotBody["contentText"]; exists {
		t.Fatal("Connection payload must not contain contentText")
	}
	if consent.calls.Load() != 0 {
		t.Fatalf("Connection test must not consult consent, calls=%d", consent.calls.Load())
	}
	if result.Status != "ok" || result.LatencyMs != 42 || result.TestedAt != "2026-07-27T09:00:00.042Z" {
		t.Fatalf("Unexpected connection result: %+v", result)
	}
}

func TestConnectionRejectsMissingConfigurationBeforeNetwork(t *testing.T) {
	var hits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		writer.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)

	tests := []struct {
		name      string
		context   AIContext
		keyLoader KeyLoader
		code      string
	}{
		{
			name:      "缺少 API Base",
			context:   AIContext{Model: "test-model", Locale: "en"},
			keyLoader: stubKeyLoader{key: "sk-test"},
			code:      config.ErrorCodeInvalidArgument,
		},
		{
			name:      "缺少 Model",
			context:   AIContext{APIBase: server.URL + "/v1", Locale: "en"},
			keyLoader: stubKeyLoader{key: "sk-test"},
			code:      config.ErrorCodeInvalidArgument,
		},
		{
			name:    "缺少 Key",
			context: AIContext{APIBase: server.URL + "/v1", Model: "test-model", Locale: "en"},
			keyLoader: stubKeyLoader{err: newServiceError(
				config.ErrorCodeSecretNotConfigured,
				config.ErrorMessageSecretNotConfigured,
				false,
				nil,
			)},
			code: config.ErrorCodeSecretNotConfigured,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			before := hits.Load()
			client := NewClient(
				WithHTTPClient(server.Client()),
				WithKeyLoader(test.keyLoader),
				WithMaxRetries(0),
			)
			_, err := client.TestConnection(test.context)
			assertCodedError(t, err, test.code, false)
			if hits.Load() != before {
				t.Fatalf("Invalid configuration must not hit network, before=%d after=%d", before, hits.Load())
			}
		})
	}
}

func TestConnectionMapsErrorsAndRetries(t *testing.T) {
	t.Run("未授权", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
			writer.WriteHeader(http.StatusUnauthorized)
		}))
		t.Cleanup(server.Close)
		client := NewClient(
			WithHTTPClient(server.Client()),
			WithKeyLoader(stubKeyLoader{key: "sk-bad"}),
			WithMaxRetries(0),
		)
		_, err := client.TestConnection(AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"})
		assertCodedError(t, err, config.ErrorCodeAIUnauthorized, false)
	})

	t.Run("超时", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
			time.Sleep(100 * time.Millisecond)
			writer.WriteHeader(http.StatusOK)
		}))
		t.Cleanup(server.Close)
		httpClient := server.Client()
		httpClient.Timeout = 20 * time.Millisecond
		client := NewClient(
			WithHTTPClient(httpClient),
			WithKeyLoader(stubKeyLoader{key: "sk-test"}),
			WithMaxRetries(0),
		)
		_, err := client.TestConnection(AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"})
		assertCodedError(t, err, config.ErrorCodeAITimeout, true)
	})

	t.Run("网络失败", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
			writer.WriteHeader(http.StatusOK)
		}))
		apiBase := server.URL + "/v1"
		server.Close()
		client := NewClient(
			WithHTTPClient(&http.Client{Timeout: 100 * time.Millisecond}),
			WithKeyLoader(stubKeyLoader{key: "sk-test"}),
			WithMaxRetries(0),
		)
		_, err := client.TestConnection(AIContext{APIBase: apiBase, Model: "m", Locale: "en"})
		assertCodedError(t, err, config.ErrorCodeAIRequestFailed, true)
	})

	t.Run("限流后按配置重试", func(t *testing.T) {
		var hits atomic.Int32
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
			if hits.Add(1) == 1 {
				writer.WriteHeader(http.StatusTooManyRequests)
				return
			}
			writer.WriteHeader(http.StatusOK)
		}))
		t.Cleanup(server.Close)
		client := NewClient(
			WithHTTPClient(server.Client()),
			WithKeyLoader(stubKeyLoader{key: "sk-test"}),
			WithMaxRetries(1),
			WithRetryBaseDelay(0),
		)
		result, err := client.TestConnection(AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"})
		if err != nil {
			t.Fatalf("TestConnection returned error after retry: %v", err)
		}
		if result.Status != "ok" || hits.Load() != 2 {
			t.Fatalf("Unexpected retry result: result=%+v hits=%d", result, hits.Load())
		}
	})
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
