package hotkey

import (
	"errors"
	"strings"
)

var (
	ErrInvalidAccelerator = errors.New("invalid hotkey accelerator")
	ErrUnavailable        = errors.New("global hotkey unavailable on this platform")
)

// Binding 表示跨平台 accelerator 解析结果。
type Binding struct {
	ModCtrlOrCmd bool
	Key          string
}

// DefaultToggleAccelerator 返回窗口显隐默认绑定。
// REQ-030-AC-005
func DefaultToggleAccelerator() string {
	return "CmdOrCtrl+L"
}

// ParseAccelerator 解析 CmdOrCtrl+<key> 形式的绑定。
func ParseAccelerator(raw string) (Binding, error) {
	normalized := strings.TrimSpace(raw)
	if normalized == "" {
		return Binding{}, ErrInvalidAccelerator
	}

	parts := strings.Split(normalized, "+")
	if len(parts) != 2 {
		return Binding{}, ErrInvalidAccelerator
	}

	mod := strings.ToLower(strings.TrimSpace(parts[0]))
	key := strings.ToUpper(strings.TrimSpace(parts[1]))
	if mod != "cmdorctrl" || key == "" || len(key) != 1 {
		return Binding{}, ErrInvalidAccelerator
	}
	if key < "A" || key > "Z" {
		// 允许数字与少量标点；字母已覆盖默认场景，其余按单字符接受。
		if !(key >= "0" && key <= "9") && key != "," && key != "\\" {
			return Binding{}, ErrInvalidAccelerator
		}
	}

	return Binding{ModCtrlOrCmd: true, Key: key}, nil
}
