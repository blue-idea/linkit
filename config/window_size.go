package config

// 窗口大小档位（REQ-031）；与 docs/spec/data.md 预设表一致。
const (
	UiSizeSmall  = "small"
	UiSizeMedium = "medium"
	UiSizeLarge  = "large"
	UiSizeXLarge = "xlarge"
)

// ResolveWindowSize 将 uiSize 映射为原生窗口宽高。
func ResolveWindowSize(uiSize string) (width int, height int, ok bool) {
	switch uiSize {
	case UiSizeSmall:
		return 1152, 720, true
	case UiSizeMedium:
		return AppWidth, AppHeight, true
	case UiSizeLarge:
		return 1536, 960, true
	case UiSizeXLarge:
		return 1792, 1120, true
	default:
		return 0, 0, false
	}
}
