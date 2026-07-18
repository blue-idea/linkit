package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"math/rand"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/secretstore"
)

// KeyLoader 仅由 Go 侧读取 Key；前端不得拿到明文。
type KeyLoader interface {
	LoadAIKey() (string, error)
}

// ConsentChecker 在发送收藏内容前二次校验本机授权。
type ConsentChecker interface {
	HasConsent(apiBase string) (bool, error)
}

type AIContext struct {
	APIBase string `json:"apiBase"`
	Model   string `json:"model"`
	Locale  string `json:"locale"`
}

type ChatRequest struct {
	Context              AIContext
	System               string
	User                 string
	SendsBookmarkContent bool
}

type ChatResult struct {
	ContentJSON json.RawMessage
}

type Client struct {
	httpClient       *http.Client
	keyLoader        KeyLoader
	consentChecker   ConsentChecker
	maxRetries       int
	retryBaseDelay   time.Duration
	maxResponseBytes int64
	userAgent        string
	now              func() time.Time
	sleep            func(time.Duration)
}

type Option func(*Client)

func NewClient(options ...Option) *Client {
	client := &Client{
		httpClient:       NewBoundedHTTPClient(),
		maxRetries:       config.AIMaxRetries,
		retryBaseDelay:   config.AIRetryBaseDelay,
		maxResponseBytes: config.AIMaxResponseBytes,
		userAgent:        config.HTTPUserAgent,
		now:              time.Now,
		sleep:            time.Sleep,
	}
	for _, option := range options {
		option(client)
	}
	return client
}

func WithHTTPClient(httpClient *http.Client) Option {
	return func(client *Client) {
		client.httpClient = httpClient
	}
}

func WithKeyLoader(loader KeyLoader) Option {
	return func(client *Client) {
		client.keyLoader = loader
	}
}

func WithConsentChecker(checker ConsentChecker) Option {
	return func(client *Client) {
		client.consentChecker = checker
	}
}

func WithMaxRetries(maxRetries int) Option {
	return func(client *Client) {
		client.maxRetries = maxRetries
	}
}

func WithRetryBaseDelay(delay time.Duration) Option {
	return func(client *Client) {
		client.retryBaseDelay = delay
	}
}

func WithMaxResponseBytes(limit int64) Option {
	return func(client *Client) {
		client.maxResponseBytes = limit
	}
}

// ChatCompletions 调用 OpenAI-compatible Chat Completions，并返回严格 JSON content。
func (client *Client) ChatCompletions(request ChatRequest) (ChatResult, error) {
	if client.keyLoader == nil {
		return ChatResult{}, newServiceError(config.ErrorCodeSecretNotConfigured, config.ErrorMessageSecretNotConfigured, false, nil)
	}
	if strings.TrimSpace(request.Context.Model) == "" {
		return ChatResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, nil)
	}
	if strings.TrimSpace(request.System) == "" || strings.TrimSpace(request.User) == "" {
		return ChatResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, nil)
	}

	endpoint, err := ChatCompletionsURL(request.Context.APIBase)
	if err != nil {
		return ChatResult{}, err
	}

	// 发送收藏内容前必须二次检查 consent，且失败时不得建立外部请求。
	if request.SendsBookmarkContent {
		if client.consentChecker == nil {
			return ChatResult{}, newServiceError(config.ErrorCodeAIConsentRequired, config.ErrorMessageAIConsentRequired, false, nil)
		}
		granted, consentErr := client.consentChecker.HasConsent(NormalizeAPIBase(request.Context.APIBase))
		if consentErr != nil {
			return ChatResult{}, consentErr
		}
		if !granted {
			return ChatResult{}, newServiceError(config.ErrorCodeAIConsentRequired, config.ErrorMessageAIConsentRequired, false, nil)
		}
	}

	apiKey, err := client.keyLoader.LoadAIKey()
	if err != nil {
		return ChatResult{}, err
	}
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return ChatResult{}, newServiceError(config.ErrorCodeSecretNotConfigured, config.ErrorMessageSecretNotConfigured, false, nil)
	}

	body, err := json.Marshal(map[string]any{
		"model": request.Context.Model,
		"messages": []map[string]string{
			{"role": "system", "content": request.System},
			{"role": "user", "content": request.User},
		},
		"temperature": 0,
	})
	if err != nil {
		return ChatResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, err)
	}

	var lastErr error
	attempts := 1 + client.maxRetries
	for attempt := 0; attempt < attempts; attempt++ {
		if attempt > 0 {
			client.sleep(client.backoffDelay(attempt))
		}

		result, retryable, callErr := client.doChatOnce(endpoint, apiKey, body)
		if callErr == nil {
			return result, nil
		}
		lastErr = callErr
		if !retryable || attempt == attempts-1 {
			return ChatResult{}, callErr
		}
	}
	return ChatResult{}, lastErr
}

func (client *Client) doChatOnce(endpoint string, apiKey string, body []byte) (ChatResult, bool, error) {
	httpRequest, err := http.NewRequestWithContext(context.Background(), http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return ChatResult{}, true, newServiceError(config.ErrorCodeAIRequestFailed, config.ErrorMessageAIRequestFailed, true, err)
	}
	httpRequest.Header.Set("Authorization", "Bearer "+apiKey)
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("User-Agent", client.userAgent)

	response, err := client.httpClient.Do(httpRequest)
	if err != nil {
		return ChatResult{}, true, mapTransportError(err)
	}
	defer response.Body.Close()

	limited := io.LimitReader(response.Body, client.maxResponseBytes+1)
	raw, err := io.ReadAll(limited)
	if err != nil {
		return ChatResult{}, true, mapTransportError(err)
	}
	if int64(len(raw)) > client.maxResponseBytes {
		return ChatResult{}, false, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, nil)
	}

	switch {
	case response.StatusCode == http.StatusUnauthorized || response.StatusCode == http.StatusForbidden:
		return ChatResult{}, false, newServiceError(config.ErrorCodeAIUnauthorized, config.ErrorMessageAIUnauthorized, false, nil)
	case response.StatusCode == http.StatusTooManyRequests:
		return ChatResult{}, true, newServiceError(config.ErrorCodeAIRateLimited, config.ErrorMessageAIRateLimited, true, nil)
	case response.StatusCode >= 500:
		return ChatResult{}, true, newServiceError(config.ErrorCodeAIRequestFailed, config.ErrorMessageAIRequestFailed, true, nil)
	case response.StatusCode < 200 || response.StatusCode >= 300:
		// 其他 4xx 不重试；retryable=false 表示前端不应自动重试。
		return ChatResult{}, false, newServiceError(config.ErrorCodeAIRequestFailed, config.ErrorMessageAIRequestFailed, false, nil)
	}

	content, err := extractMessageContent(raw)
	if err != nil {
		return ChatResult{}, false, err
	}
	normalized, err := parseStrictJSONContent(content)
	if err != nil {
		return ChatResult{}, false, err
	}
	return ChatResult{ContentJSON: normalized}, false, nil
}

func extractMessageContent(raw []byte) (string, error) {
	var envelope struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return "", newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, err)
	}
	if len(envelope.Choices) == 0 || strings.TrimSpace(envelope.Choices[0].Message.Content) == "" {
		return "", newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, nil)
	}
	return envelope.Choices[0].Message.Content, nil
}

func parseStrictJSONContent(content string) (json.RawMessage, error) {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return nil, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, nil)
	}
	var decoded any
	if err := json.Unmarshal([]byte(trimmed), &decoded); err != nil {
		return nil, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, err)
	}
	switch decoded.(type) {
	case map[string]any, []any:
		return json.RawMessage(trimmed), nil
	default:
		return nil, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, nil)
	}
}

func mapTransportError(err error) error {
	if err == nil {
		return nil
	}
	redacted := secretstore.RedactSecrets(err.Error())
	if isTimeoutError(err) {
		return newServiceError(config.ErrorCodeAITimeout, config.ErrorMessageAITimeout, true, errors.New(redacted))
	}
	return newServiceError(config.ErrorCodeAIRequestFailed, config.ErrorMessageAIRequestFailed, true, errors.New(redacted))
}

func isTimeoutError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "timeout") || strings.Contains(message, "deadline exceeded") || strings.Contains(message, "client.timeout")
}

func (client *Client) backoffDelay(attempt int) time.Duration {
	base := client.retryBaseDelay
	if base <= 0 {
		base = config.AIRetryBaseDelay
	}
	// 指数退避 + 有界抖动，避免雷群。
	delay := base * time.Duration(1<<uint(attempt-1))
	jitter := time.Duration(rand.Int63n(int64(base) + 1))
	return delay + jitter
}

// NewBoundedHTTPClient 为 AI 请求提供连接/响应头/总超时约束。
func NewBoundedHTTPClient() *http.Client {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   config.AIConnectTimeout,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          10,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   config.AIConnectTimeout,
		ResponseHeaderTimeout: config.AIResponseHeaderTimeout,
		ExpectContinueTimeout: 1 * time.Second,
	}
	return &http.Client{
		Transport: transport,
		Timeout:   config.AITotalTimeout,
	}
}
