package platform

import (
	"context"

	"github.com/blue-idea/collection/config"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// fileDialogs 抽象原生打开/保存对话框，便于单测注入替身。
type fileDialogs interface {
	OpenJSONFile() (path string, cancelled bool, err error)
	SaveJSONFile(suggestedFileName string) (path string, cancelled bool, err error)
}

type openFileDialogFn func(ctx context.Context, dialogOptions runtime.OpenDialogOptions) (string, error)
type saveFileDialogFn func(ctx context.Context, dialogOptions runtime.SaveDialogOptions) (string, error)

// 可在测试中替换，避免真实弹出系统对话框。
var openFileDialog openFileDialogFn = runtime.OpenFileDialog
var saveFileDialog saveFileDialogFn = runtime.SaveFileDialog

type wailsDialogs struct {
	ctx context.Context
}

func (dialogs wailsDialogs) OpenJSONFile() (string, bool, error) {
	if dialogs.ctx == nil {
		return "", false, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageInvalidArgument, false, nil)
	}
	path, err := openFileDialog(dialogs.ctx, runtime.OpenDialogOptions{
		Title: "Import Library",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return "", false, err
	}
	if path == "" {
		return "", true, nil
	}
	return path, false, nil
}

func (dialogs wailsDialogs) SaveJSONFile(suggestedFileName string) (string, bool, error) {
	if dialogs.ctx == nil {
		return "", false, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageInvalidArgument, false, nil)
	}
	path, err := saveFileDialog(dialogs.ctx, runtime.SaveDialogOptions{
		Title:           "Export Library",
		DefaultFilename: suggestedFileName,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return "", false, err
	}
	if path == "" {
		return "", true, nil
	}
	return path, false, nil
}
