package platform

import (
	"context"
	"strings"

	"github.com/blue-idea/collection/config"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// fileDialogs 抽象原生打开/保存对话框，便于单测注入替身。
type fileDialogs interface {
	OpenJSONFile() (path string, cancelled bool, err error)
	SaveJSONFile(suggestedFileName string) (path string, cancelled bool, err error)
	SaveFile(options SaveFileOptions) (path string, cancelled bool, err error)
}

type openFileDialogFn func(ctx context.Context, dialogOptions runtime.OpenDialogOptions) (string, error)
type saveFileDialogFn func(ctx context.Context, dialogOptions runtime.SaveDialogOptions) (string, error)

type SaveFileOptions struct {
	Title             string
	SuggestedFileName string
	DisplayName       string
	Pattern           string
}

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
	return dialogs.SaveFile(SaveFileOptions{
		Title:             "Export Library",
		SuggestedFileName: suggestedFileName,
		DisplayName:       "JSON Files (*.json)",
		Pattern:           "*.json",
	})
}

func (dialogs wailsDialogs) SaveFile(options SaveFileOptions) (string, bool, error) {
	if dialogs.ctx == nil {
		return "", false, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageInvalidArgument, false, nil)
	}
	var filters []runtime.FileFilter
	p := strings.TrimSpace(options.Pattern)
	if p != "" && p != "*.*" && p != "*" {
		filters = []runtime.FileFilter{
			{DisplayName: options.DisplayName, Pattern: p},
		}
	}
	path, err := saveFileDialog(dialogs.ctx, runtime.SaveDialogOptions{
		Title:           options.Title,
		DefaultFilename: options.SuggestedFileName,
		Filters:         filters,
	})
	if err != nil {
		return "", false, err
	}
	if path == "" {
		return "", true, nil
	}
	// macOS NSSavePanel 有时会将文件过滤器中的通配符（如 .*）追加到文件名末尾，
	// 例如 "file.json.*"，需要在此处清理。
	path = cleanSaveDialogPath(path)
	return path, false, nil
}

// cleanSaveDialogPath 清理 macOS NSSavePanel 在路径末尾追加的 glob 通配符后缀。
// 例如 "file.json.*" → "file.json"，"file.*" → "file"。
func cleanSaveDialogPath(path string) string {
	for strings.HasSuffix(path, ".*") {
		path = strings.TrimSuffix(path, ".*")
	}
	return path
}
