package localstore

import (
	"context"

	"github.com/blue-idea/collection/config"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// directoryDialog 抽象文件夹选择，便于单测注入替身。
type directoryDialog interface {
	SelectDirectory() (path string, cancelled bool, err error)
}

type contextAwareDialog interface {
	SetContext(ctx context.Context)
}

type openDirectoryDialogFn func(ctx context.Context, dialogOptions runtime.OpenDialogOptions) (string, error)

// 可在测试中替换，避免真实弹出系统对话框。
var openDirectoryDialog openDirectoryDialogFn = runtime.OpenDirectoryDialog

type wailsDirectoryDialog struct {
	ctx context.Context
}

func (dialog wailsDirectoryDialog) SelectDirectory() (string, bool, error) {
	if dialog.ctx == nil {
		return "", false, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageInvalidArgument, false, nil)
	}
	path, err := openDirectoryDialog(dialog.ctx, runtime.OpenDialogOptions{
		Title:                "Select Data Directory",
		CanCreateDirectories: true,
	})
	if err != nil {
		return "", false, err
	}
	if path == "" {
		return "", true, nil
	}
	return path, false, nil
}
