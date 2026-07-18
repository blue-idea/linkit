package localstore

import (
	"bytes"
	"encoding/json"
	"fmt"
	"time"

	"github.com/blue-idea/collection/config"
)

type libraryDocument struct {
	Format        string          `json:"format"`
	SchemaVersion int             `json:"schemaVersion"`
	Revision      int             `json:"revision"`
	UpdatedAt     string          `json:"updatedAt"`
	Data          json.RawMessage `json:"data"`
}

type cloudDraftDocument struct {
	Format        string          `json:"format"`
	SchemaVersion int             `json:"schemaVersion"`
	BaseRevision  int             `json:"baseRevision"`
	Dirty         *bool           `json:"dirty"`
	UpdatedAt     string          `json:"updatedAt"`
	Data          json.RawMessage `json:"data"`
}

func validateInputSize(content []byte, maxBytes int64) error {
	if len(content) == 0 || int64(len(content)) > maxBytes {
		return newServiceError(
			config.ErrorCodeInvalidArgument,
			config.ErrorMessageInvalidArgument,
			false,
			fmt.Errorf("document size %d exceeds allowed range", len(content)),
		)
	}
	return nil
}

func validateDocumentJSON(content []byte, maxBytes int64) error {
	if err := validateInputSize(content, maxBytes); err != nil {
		return err
	}
	if !json.Valid(content) {
		return invalidDocumentError(nil)
	}
	return nil
}

func isValidUTCTimestamp(value string) bool {
	timestamp, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return false
	}
	_, offset := timestamp.Zone()
	return offset == 0
}

func isJSONObject(content json.RawMessage) bool {
	trimmed := bytes.TrimSpace(content)
	return len(trimmed) > 0 && trimmed[0] == '{' && json.Valid(trimmed)
}

func decodeLibraryDocument(content []byte, maxBytes int64) (libraryDocument, error) {
	if err := validateDocumentJSON(content, maxBytes); err != nil {
		return libraryDocument{}, err
	}
	var document libraryDocument
	decoder := json.NewDecoder(bytes.NewReader(content))
	if err := decoder.Decode(&document); err != nil {
		return libraryDocument{}, invalidDocumentError(err)
	}
	if document.Format != "linkit-library" || document.SchemaVersion < 1 || document.Revision < 0 || !isValidUTCTimestamp(document.UpdatedAt) || !isJSONObject(document.Data) {
		return libraryDocument{}, invalidDocumentError(nil)
	}
	return document, nil
}

func decodeCloudDraft(content []byte, maxBytes int64) (cloudDraftDocument, error) {
	if err := validateDocumentJSON(content, maxBytes); err != nil {
		return cloudDraftDocument{}, err
	}
	var document cloudDraftDocument
	decoder := json.NewDecoder(bytes.NewReader(content))
	if err := decoder.Decode(&document); err != nil {
		return cloudDraftDocument{}, invalidDocumentError(err)
	}
	if document.Format != "linkit-cloud-draft" || document.SchemaVersion < 1 || document.BaseRevision < 0 || document.Dirty == nil || !isValidUTCTimestamp(document.UpdatedAt) || !isJSONObject(document.Data) {
		return cloudDraftDocument{}, invalidDocumentError(nil)
	}
	return document, nil
}

func updateLibraryDocument(content []byte, expectedRevision int, updatedAt time.Time, maxBytes int64) ([]byte, SaveResult, error) {
	document, err := decodeLibraryDocument(content, maxBytes)
	if err != nil {
		return nil, SaveResult{}, err
	}
	if document.Revision != expectedRevision {
		return nil, SaveResult{}, newServiceError(
			config.ErrorCodeInvalidArgument,
			config.ErrorMessageInvalidArgument,
			false,
			fmt.Errorf("document revision %d does not match expected revision %d", document.Revision, expectedRevision),
		)
	}
	document.Revision++
	document.UpdatedAt = updatedAt.UTC().Format(time.RFC3339Nano)
	updated, err := json.Marshal(document)
	if err != nil {
		return nil, SaveResult{}, newServiceError(config.ErrorCodeLocalWriteFailed, config.ErrorMessageLocalWriteFailed, true, err)
	}
	return updated, SaveResult{Revision: document.Revision, UpdatedAt: document.UpdatedAt}, nil
}

func libraryBookmarkCount(document libraryDocument) (int, error) {
	var data struct {
		Bookmarks json.RawMessage `json:"bookmarks"`
	}
	if err := json.Unmarshal(document.Data, &data); err != nil {
		return 0, invalidDocumentError(err)
	}
	trimmed := bytes.TrimSpace(data.Bookmarks)
	if len(trimmed) == 0 || trimmed[0] != '[' || !json.Valid(trimmed) {
		return 0, invalidDocumentError(nil)
	}
	var bookmarks []json.RawMessage
	if err := json.Unmarshal(trimmed, &bookmarks); err != nil {
		return 0, invalidDocumentError(err)
	}
	return len(bookmarks), nil
}

func invalidDocumentError(cause error) *ServiceError {
	return newServiceError(config.ErrorCodeDocumentInvalid, config.ErrorMessageDocumentInvalid, false, cause)
}
