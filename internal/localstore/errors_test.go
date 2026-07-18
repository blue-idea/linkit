package localstore

import (
	"errors"
	"testing"

	"github.com/blue-idea/collection/config"
)

func TestServiceErrorKeepsPublicMessageAndInternalCauseSeparate(t *testing.T) {
	cause := errors.New("C:\\Users\\example\\private\\library.json")
	serviceError := newServiceError(
		config.ErrorCodeLocalWriteFailed,
		config.ErrorMessageLocalWriteFailed,
		true,
		cause,
	)

	// REQ-027-AC-003：公开错误必须是稳定英文消息，不得泄露本机路径。
	if serviceError.Error() != config.ErrorMessageLocalWriteFailed {
		t.Fatalf("Unexpected public error message: %q", serviceError.Error())
	}
	if !errors.Is(serviceError, cause) {
		t.Fatal("Service error does not preserve its internal cause")
	}
}
