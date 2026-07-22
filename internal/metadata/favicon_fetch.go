package metadata

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/blue-idea/collection/config"
)

const faviconFetchRequestHeader = "Accept"

type FaviconDataURLRequest struct {
	URL string `json:"url"`
}

// FetchFaviconDataURL 由桌面端抓取 favicon 并返回 data URL，供 WebView 展示外链图标。
func (service *Service) FetchFaviconDataURL(request FaviconDataURLRequest) (string, error) {
	dataURL, err := service.fetchFaviconDataURL(strings.TrimSpace(request.URL))
	if err != nil {
		return "", err
	}
	return dataURL, nil
}

func (service *Service) fetchFaviconDataURL(rawURL string) (string, error) {
	if rawURL == "" {
		return "", nil
	}
	if err := validateHTTPURL(rawURL); err != nil {
		return "", err
	}

	httpRequest, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return "", metadataFetchError(err)
	}
	httpRequest.Header.Set("User-Agent", service.userAgent)
	httpRequest.Header.Set(faviconFetchRequestHeader, "image/*,*/*;q=0.8")

	response, err := service.client.Do(httpRequest)
	if err != nil {
		return "", metadataFetchError(err)
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", metadataFetchError(fmt.Errorf("favicon status %d", response.StatusCode))
	}

	limited := io.LimitReader(response.Body, config.HTTPMaxFaviconBytes+1)
	body, err := io.ReadAll(limited)
	if err != nil {
		return "", metadataFetchError(err)
	}
	if int64(len(body)) > config.HTTPMaxFaviconBytes {
		return "", metadataFetchError(fmt.Errorf("favicon exceeded size limit"))
	}
	if len(body) == 0 {
		return "", nil
	}

	mime := faviconMIME(response.Header.Get("Content-Type"), rawURL)
	encoded := base64.StdEncoding.EncodeToString(body)
	return fmt.Sprintf("data:%s;base64,%s", mime, encoded), nil
}

func faviconMIME(contentType, rawURL string) string {
	if value := strings.TrimSpace(strings.Split(contentType, ";")[0]); value != "" && strings.HasPrefix(value, "image/") {
		return value
	}
	lower := strings.ToLower(rawURL)
	switch {
	case strings.HasSuffix(lower, ".svg"):
		return "image/svg+xml"
	case strings.HasSuffix(lower, ".png"):
		return "image/png"
	case strings.HasSuffix(lower, ".webp"):
		return "image/webp"
	case strings.HasSuffix(lower, ".gif"):
		return "image/gif"
	case strings.HasSuffix(lower, ".jpg"), strings.HasSuffix(lower, ".jpeg"):
		return "image/jpeg"
	default:
		return "image/x-icon"
	}
}
