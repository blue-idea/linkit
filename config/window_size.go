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
		return 1182, 739, true
	case UiSizeMedium:
		return AppWidth, AppHeight, true
	case UiSizeLarge:
		return 1566, 979, true
	case UiSizeXLarge:
		return 1822, 1139, true
	default:
		return 0, 0, false
	}
}
