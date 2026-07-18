package platform

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/blue-idea/collection/config"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func TestNewServiceUsesWailsDialogsWithoutContext(t *testing.T) {
	service := NewService(WithClock(func() time.Time { return fixedTime }))

	_, err := service.ExportLibrary(ExportRequest{
		SuggestedFileName: "",
		DocumentJSON:      validLibraryDocumentJSON(),
	})
	assertCodedError(t, err, config.ErrorCodeLocalWriteFailed, true)

	_, err = service.SelectImportFile()
	assertCodedError(t, err, config.ErrorCodeLocalReadFailed, true)
}

func TestSetContextReplacesWailsDialogs(t *testing.T) {
	service := NewService()
	service.SetContext(context.Background())
	dialogs, ok := service.dialogs.(wailsDialogs)
	if !ok || dialogs.ctx == nil {
		t.Fatalf("SetContext must install wails dialogs with context")
	}
}

func TestExportLibraryWriteFailureAndInvalidEnvelope(t *testing.T) {
	service := NewService(
		WithDialogs(&scriptedDialogs{savePath: filepath.Join(t.TempDir(), "out.json")}),
		WithClock(func() time.Time { return fixedTime }),
	)
	service.writeFile = func(string, []byte, os.FileMode) error {
		return errors.New("disk full")
	}

	_, err := service.ExportLibrary(ExportRequest{
		SuggestedFileName: "export.json",
		DocumentJSON:      validLibraryDocumentJSON(),
	})
	assertCodedError(t, err, config.ErrorCodeLocalWriteFailed, true)
	if err.Error() != config.ErrorMessageLocalWriteFailed {
		t.Fatalf("Unexpected error message: %v", err)
	}
	var serviceError *ServiceError
	if !errors.As(err, &serviceError) || serviceError.Unwrap() == nil || serviceError.Unwrap().Error() != "disk full" {
		t.Fatalf("Expected unwrap disk full, got %v", err)
	}

	_, err = service.ExportLibrary(ExportRequest{
		DocumentJSON: `{"format":"other","schemaVersion":1,"revision":0,"updatedAt":"2026-07-18T10:00:00Z","data":{}}`,
	})
	assertCodedError(t, err, config.ErrorCodeExportInvalid, false)

	_, err = service.ExportLibrary(ExportRequest{DocumentJSON: "{bad"})
	assertCodedError(t, err, config.ErrorCodeExportInvalid, false)
}

func TestSelectImportFileReadFailureAndSecrets(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "missing.json")
	service := NewService(WithDialogs(&scriptedDialogs{openPath: missing}))
	_, err := service.SelectImportFile()
	assertCodedError(t, err, config.ErrorCodeLocalReadFailed, true)

	path := filepath.Join(t.TempDir(), "secret.json")
	if err := os.WriteFile(path, []byte(`{"format":"linkit-library","apiKey":"secret"}`), 0o600); err != nil {
		t.Fatalf("Unable to write secret fixture: %v", err)
	}
	secretService := NewService(WithDialogs(&scriptedDialogs{openPath: path}))
	_, err = secretService.SelectImportFile()
	assertCodedError(t, err, config.ErrorCodeImportInvalid, false)
}

func TestWailsDialogsRejectMissingContext(t *testing.T) {
	dialogs := wailsDialogs{}
	_, _, err := dialogs.OpenJSONFile()
	assertCodedError(t, err, config.ErrorCodeInvalidArgument, false)
	_, _, err = dialogs.SaveJSONFile("export.json")
	assertCodedError(t, err, config.ErrorCodeInvalidArgument, false)
}

func TestWailsDialogsWithStubbedRuntime(t *testing.T) {
	originalOpen := openFileDialog
	originalSave := saveFileDialog
	t.Cleanup(func() {
		openFileDialog = originalOpen
		saveFileDialog = originalSave
	})

	openFileDialog = func(context.Context, runtime.OpenDialogOptions) (string, error) {
		return "", nil
	}
	saveFileDialog = func(context.Context, runtime.SaveDialogOptions) (string, error) {
		return "/tmp/export.json", nil
	}

	dialogs := wailsDialogs{ctx: context.Background()}
	path, cancelled, err := dialogs.OpenJSONFile()
	if err != nil || !cancelled || path != "" {
		t.Fatalf("Expected open cancel, got path=%q cancelled=%v err=%v", path, cancelled, err)
	}
	path, cancelled, err = dialogs.SaveJSONFile("export.json")
	if err != nil || cancelled || path != "/tmp/export.json" {
		t.Fatalf("Unexpected save result: path=%q cancelled=%v err=%v", path, cancelled, err)
	}

	openFileDialog = func(context.Context, runtime.OpenDialogOptions) (string, error) {
		return "", errors.New("dialog failed")
	}
	_, _, err = dialogs.OpenJSONFile()
	if err == nil || err.Error() != "dialog failed" {
		t.Fatalf("Expected dialog failure, got %v", err)
	}
}
