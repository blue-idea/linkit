package platform

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/blue-idea/collection/config"
)

type libraryExportEnvelope struct {
	Format        string          `json:"format"`
	SchemaVersion int             `json:"schemaVersion"`
	Revision      int             `json:"revision"`
	UpdatedAt     string          `json:"updatedAt"`
	Data          json.RawMessage `json:"data"`
	ExportedAt    string          `json:"exportedAt"`
	AppVersion    string          `json:"appVersion"`
}

func buildExportDocument(documentJSON string, exportedAt time.Time) ([]byte, error) {
	if err := rejectSensitivePayload([]byte(documentJSON)); err != nil {
		return nil, err
	}
	if !json.Valid([]byte(documentJSON)) {
		return nil, exportInvalidError(fmt.Errorf("document JSON is invalid"))
	}

	decoder := json.NewDecoder(bytes.NewReader([]byte(documentJSON)))
	decoder.DisallowUnknownFields()
	var source struct {
		Format        string          `json:"format"`
		SchemaVersion int             `json:"schemaVersion"`
		Revision      int             `json:"revision"`
		UpdatedAt     string          `json:"updatedAt"`
		Data          json.RawMessage `json:"data"`
	}
	if err := decoder.Decode(&source); err != nil {
		return nil, exportInvalidError(err)
	}
	if source.Format != "linkit-library" || source.SchemaVersion < 1 || source.Revision < 0 || len(bytes.TrimSpace(source.Data)) == 0 {
		return nil, exportInvalidError(fmt.Errorf("library envelope is incomplete"))
	}

	envelope := libraryExportEnvelope{
		Format:        source.Format,
		SchemaVersion: source.SchemaVersion,
		Revision:      source.Revision,
		UpdatedAt:     source.UpdatedAt,
		Data:          source.Data,
		ExportedAt:    exportedAt.UTC().Format(time.RFC3339),
		AppVersion:    config.AppVersion,
	}
	content, err := json.Marshal(envelope)
	if err != nil {
		return nil, exportInvalidError(err)
	}
	if err := rejectSensitivePayload(content); err != nil {
		return nil, err
	}
	return content, nil
}

func rejectSensitivePayload(content []byte) error {
	raw := string(content)
	forbidden := []string{
		`"apiKey"`,
		`"api_key"`,
		`"settingsVersion"`,
		`"access_token"`,
		`"refresh_token"`,
		`"service_role"`,
	}
	for _, token := range forbidden {
		if strings.Contains(raw, token) {
			return exportInvalidError(fmt.Errorf("payload must not contain sensitive field %s", token))
		}
	}
	return nil
}

func exportInvalidError(cause error) error {
	return newServiceError(config.ErrorCodeExportInvalid, config.ErrorMessageExportInvalid, false, cause)
}
