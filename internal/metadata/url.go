package metadata

import (
	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/httpurl"
)

func validateHTTPURL(raw string) error {
	if err := httpurl.Validate(raw); err != nil {
		return err
	}
	return nil
}

func urlInvalidError(cause error) error {
	return newServiceError(config.ErrorCodeURLInvalid, config.ErrorMessageURLInvalid, false, cause)
}
