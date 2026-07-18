package metadata

import (
	"net"
	"net/http"
	"time"

	"github.com/blue-idea/collection/config"
)

func NewBoundedHTTPClient() *http.Client {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   config.HTTPConnectTimeout,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          10,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   config.HTTPConnectTimeout,
		ResponseHeaderTimeout: config.HTTPResponseHeaderTimeout,
		ExpectContinueTimeout: 1 * time.Second,
	}

	return &http.Client{
		Transport: transport,
		Timeout:   config.HTTPTotalTimeout,
		CheckRedirect: func(request *http.Request, via []*http.Request) error {
			if len(via) >= config.HTTPMaxRedirects {
				return http.ErrUseLastResponse
			}
			if err := validateHTTPURL(request.URL.String()); err != nil {
				return err
			}
			return nil
		},
	}
}
