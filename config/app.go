package config

var (
	// AppVersion 用于导出信封标识生成文件的应用版本。
	// 支持通过编译期 -ldflags "-X github.com/blue-idea/collection/config.AppVersion=X.Y.Z" 动态覆盖。
	AppVersion = "0.3.5"
)

const (
	// GitHubURL 为 About 与文档入口使用的项目主页。
	GitHubURL = "https://github.com/blue-idea/linkit"
	// AppWidth 与 AppHeight 为三栏主界面提供默认可用空间。
	AppWidth  = 1384
	AppHeight = 865

	// 窗口背景色用于 WebView 完成首屏渲染前的原生背景。
	BackgroundRed   = 11
	BackgroundGreen = 17
	BackgroundBlue  = 32
	BackgroundAlpha = 1
)
