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
	Settings      json.RawMessage `json:"settings,omitempty"`
}

func buildExportDocument(documentJSON string, exportedAt time.Time) ([]byte, error) {
	if !json.Valid([]byte(documentJSON)) {
		return nil, exportInvalidError(fmt.Errorf("document JSON is invalid"))
	}
	if err := rejectSensitivePayload([]byte(documentJSON)); err != nil {
		return nil, err
	}

	decoder := json.NewDecoder(bytes.NewReader([]byte(documentJSON)))
	decoder.DisallowUnknownFields()
	var source struct {
		Format        string          `json:"format"`
		SchemaVersion int             `json:"schemaVersion"`
		Revision      int             `json:"revision"`
		UpdatedAt     string          `json:"updatedAt"`
		Data          json.RawMessage `json:"data"`
		ExportedAt    string          `json:"exportedAt"`
		AppVersion    string          `json:"appVersion"`
		Settings      json.RawMessage `json:"settings"`
	}
	if err := decoder.Decode(&source); err != nil {
		return nil, exportInvalidError(err)
	}
	if source.SchemaVersion < 1 || source.Revision < 0 || strings.TrimSpace(source.UpdatedAt) == "" || !isJSONObject(source.Data) {
		return nil, exportInvalidError(fmt.Errorf("library envelope is incomplete"))
	}

	var settings json.RawMessage
	switch source.Format {
	case "linkit-library":
		if len(bytes.TrimSpace(source.Settings)) > 0 {
			return nil, exportInvalidError(fmt.Errorf("library envelope must not include settings"))
		}
	case "linkit-backup":
		if source.SchemaVersion != 1 || strings.TrimSpace(source.ExportedAt) == "" || strings.TrimSpace(source.AppVersion) == "" || !isJSONObject(source.Settings) {
			return nil, exportInvalidError(fmt.Errorf("backup envelope is incomplete"))
		}
		settings = source.Settings
	default:
		return nil, exportInvalidError(fmt.Errorf("unsupported export format"))
	}

	envelope := libraryExportEnvelope{
		Format:        source.Format,
		SchemaVersion: source.SchemaVersion,
		Revision:      source.Revision,
		UpdatedAt:     source.UpdatedAt,
		Data:          source.Data,
		ExportedAt:    exportedAt.UTC().Format(time.RFC3339),
		AppVersion:    config.AppVersion,
		Settings:      settings,
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
	var payload any
	decoder := json.NewDecoder(bytes.NewReader(content))
	decoder.UseNumber()
	if err := decoder.Decode(&payload); err != nil {
		return exportInvalidError(fmt.Errorf("document JSON is invalid"))
	}
	if field, found := findSensitiveField(payload); found {
		return exportInvalidError(fmt.Errorf("payload must not contain sensitive field %s", field))
	}
	return nil
}

func findSensitiveField(value any) (string, bool) {
	switch typed := value.(type) {
	case map[string]any:
		for key, child := range typed {
			if isSensitiveField(key) {
				return key, true
			}
			if field, found := findSensitiveField(child); found {
				return field, true
			}
		}
	case []any:
		for _, child := range typed {
			if field, found := findSensitiveField(child); found {
				return field, true
			}
		}
	}
	return "", false
}

func isSensitiveField(key string) bool {
	normalized := strings.NewReplacer("_", "", "-", "", " ", "").Replace(strings.ToLower(key))
	switch normalized {
	case "apikey", "accesstoken", "refreshtoken", "servicerole", "session", "authorization", "logs", "aiconsent", "lastcloudrevision":
		return true
	default:
		return false
	}
}

func isJSONObject(raw json.RawMessage) bool {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '{' {
		return false
	}
	var object map[string]json.RawMessage
	return json.Unmarshal(trimmed, &object) == nil && object != nil
}

func exportInvalidError(cause error) error {
	return newServiceError(config.ErrorCodeExportInvalid, config.ErrorMessageExportInvalid, false, cause)
}
