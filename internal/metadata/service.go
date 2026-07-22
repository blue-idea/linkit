package metadata

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/blue-idea/collection/config"
)

type MetadataRequest struct {
	URL string `json:"url"`
}

type MetadataResult struct {
	FinalURL           string  `json:"finalUrl"`
	Title              string  `json:"title"`
	Description        string  `json:"description"`
	Domain             string  `json:"domain"`
	FaviconURL         *string `json:"faviconUrl"`
	FaviconDataURL     *string `json:"faviconDataUrl"`
	ContentText        string  `json:"contentText"`
	ContentFingerprint string  `json:"contentFingerprint"`
}

type Option func(*Service)

type Service struct {
	client           *http.Client
	maxResponseBytes int64
	userAgent        string
}

func NewService(options ...Option) *Service {
	service := &Service{
		client:           NewBoundedHTTPClient(),
		maxResponseBytes: config.HTTPMaxResponseBytes,
		userAgent:        config.HTTPUserAgent,
	}
	for _, option := range options {
		option(service)
	}
	return service
}

func WithHTTPClient(client *http.Client) Option {
	return func(service *Service) {
		if client == nil {
			return
		}
		bounded := NewBoundedHTTPClient()
		// 始终挂上安全重定向校验，同时保留测试用 Transport/Timeout。
		client.CheckRedirect = bounded.CheckRedirect
		if client.Timeout == 0 {
			client.Timeout = bounded.Timeout
		}
		service.client = client
	}
}

func WithMaxResponseBytes(maxBytes int64) Option {
	return func(service *Service) { service.maxResponseBytes = maxBytes }
}

// HTTPClient 暴露给测试复用受限客户端配置。
func (service *Service) HTTPClient() *http.Client {
	return service.client
}

func (service *Service) FetchMetadata(request MetadataRequest) (MetadataResult, error) {
	if err := validateHTTPURL(request.URL); err != nil {
		return MetadataResult{}, err
	}

	httpRequest, err := http.NewRequest(http.MethodGet, strings.TrimSpace(request.URL), nil)
	if err != nil {
		return MetadataResult{}, urlInvalidError(err)
	}
	httpRequest.Header.Set("User-Agent", service.userAgent)
	httpRequest.Header.Set("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8")

	response, err := service.client.Do(httpRequest)
	if err != nil {
		return MetadataResult{}, metadataFetchError(err)
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return MetadataResult{}, metadataFetchError(fmt.Errorf("unexpected status %d", response.StatusCode))
	}

	limited := io.LimitReader(response.Body, service.maxResponseBytes+1)
	body, err := io.ReadAll(limited)
	if err != nil {
		return MetadataResult{}, metadataFetchError(err)
	}
	if int64(len(body)) > service.maxResponseBytes {
		return MetadataResult{}, metadataFetchError(fmt.Errorf("response exceeded size limit"))
	}

	finalURL := request.URL
	if response.Request != nil && response.Request.URL != nil {
		finalURL = response.Request.URL.String()
		if err := validateHTTPURL(finalURL); err != nil {
			return MetadataResult{}, metadataFetchError(err)
		}
	}
	parsedFinal, err := url.Parse(finalURL)
	if err != nil {
		return MetadataResult{}, metadataFetchError(err)
	}

	page, err := parseHTMLMetadata(strings.NewReader(string(body)), parsedFinal)
	if err != nil {
		return MetadataResult{}, metadataFetchError(err)
	}

	var favicon *string
	var faviconData *string
	if page.faviconURL != "" {
		value := page.faviconURL
		favicon = &value
		if dataURL, err := service.fetchFaviconDataURL(value); err == nil && dataURL != "" {
			faviconData = &dataURL
		}
	}

	return MetadataResult{
		FinalURL:           finalURL,
		Title:              page.title,
		Description:        page.description,
		Domain:             parsedFinal.Hostname(),
		FaviconURL:         favicon,
		FaviconDataURL:     faviconData,
		ContentText:        page.contentText,
		ContentFingerprint: page.fingerprint,
	}, nil
}

func metadataFetchError(cause error) error {
	return newServiceError(config.ErrorCodeMetadataFetchFailed, config.ErrorMessageMetadataFetchFailed, true, cause)
}
