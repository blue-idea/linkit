package netproxy

import (
	"net/http"
	"net/url"

	ieproxy "github.com/mattn/go-ieproxy"
)

type ProxyFunc func(*http.Request) (*url.URL, error)

// Chain 按顺序组合代理解析函数；当前一个未命中时才回退到下一个。
func Chain(primary ProxyFunc, fallback ProxyFunc) ProxyFunc {
	return func(request *http.Request) (*url.URL, error) {
		if primary != nil {
			proxyURL, err := primary(request)
			if err != nil || proxyURL != nil {
				return proxyURL, err
			}
		}
		if fallback != nil {
			return fallback(request)
		}
		return nil, nil
	}
}

// Resolve 优先使用显式环境变量代理；未配置时回退到系统代理。
func Resolve() ProxyFunc {
	return Chain(http.ProxyFromEnvironment, ieproxy.GetProxyFunc())
}
