package platform

import (
	"encoding/json"
	"fmt"
	"unicode/utf8"

	"github.com/blue-idea/collection/config"
)

func validateImportContent(content []byte, maxBytes int64) error {
	if len(content) == 0 || int64(len(content)) > maxBytes {
		return importInvalidError(fmt.Errorf("import size %d is out of range", len(content)))
	}
	if !utf8.Valid(content) {
		return importInvalidError(fmt.Errorf("import file is not valid UTF-8"))
	}
	if !json.Valid(content) {
		return importInvalidError(fmt.Errorf("import file is not valid JSON"))
	}
	return nil
}

func importInvalidError(cause error) error {
	return newServiceError(config.ErrorCodeImportInvalid, config.ErrorMessageImportInvalid, false, cause)
}
