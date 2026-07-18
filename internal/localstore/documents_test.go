package localstore

import (
	"encoding/json"
	"testing"

	"github.com/blue-idea/collection/config"
)

func TestDocumentDecodersRejectTrailingJSONValue(t *testing.T) {
	// REQ-027-AC-003：跨 Wails 边界的文档必须是且仅是一个完整 JSON 值。
	t.Run("资料库信封拒绝尾随 JSON", func(t *testing.T) {
		_, err := decodeLibraryDocument([]byte(makeLibraryDocumentJSON(0, "Bookmark")+`{}`), config.MaxDocumentBytes)
		assertError(t, err, "DOCUMENT_INVALID", false)
	})

	// REQ-003-AC-004：云草稿也不得接受尾随 JSON，避免保存不可验证状态。
	t.Run("云草稿拒绝尾随 JSON", func(t *testing.T) {
		_, err := decodeCloudDraft([]byte(makeCloudDraftJSON(true, 0)+`{}`), config.MaxDocumentBytes)
		assertError(t, err, "DOCUMENT_INVALID", false)
	})
}

func TestDocumentDecodersRequireValidUpdatedAtHeader(t *testing.T) {
	// REQ-002-AC-002：资料库缺少更新时间时无法生成可靠恢复摘要。
	t.Run("资料库信封拒绝缺失 updatedAt", func(t *testing.T) {
		content := mutateDocumentJSON(t, makeLibraryDocumentJSON(0, "Bookmark"), func(document map[string]any) {
			delete(document, "updatedAt")
		})
		_, err := decodeLibraryDocument(content, config.MaxDocumentBytes)
		assertError(t, err, "DOCUMENT_INVALID", false)
	})

	// REQ-003-AC-004：云草稿必须提供可解析的更新时间供恢复流程判断。
	t.Run("云草稿拒绝非法 updatedAt", func(t *testing.T) {
		content := mutateDocumentJSON(t, makeCloudDraftJSON(true, 0), func(document map[string]any) {
			document["updatedAt"] = "not-a-time"
		})
		_, err := decodeCloudDraft(content, config.MaxDocumentBytes)
		assertError(t, err, "DOCUMENT_INVALID", false)
	})
}

func TestDocumentDecodersRequireObjectDataEnvelope(t *testing.T) {
	// REQ-002-AC-002：资料库信封的 data 必须是对象，不能使用 null 伪装空库。
	t.Run("资料库信封拒绝 null data", func(t *testing.T) {
		content := mutateDocumentJSON(t, makeLibraryDocumentJSON(0, "Bookmark"), func(document map[string]any) {
			document["data"] = nil
		})
		_, err := decodeLibraryDocument(content, config.MaxDocumentBytes)
		assertError(t, err, "DOCUMENT_INVALID", false)
	})

	// REQ-003-AC-004：云草稿的 data 必须保持与资料库同构的对象边界。
	t.Run("云草稿拒绝数组 data", func(t *testing.T) {
		content := mutateDocumentJSON(t, makeCloudDraftJSON(true, 0), func(document map[string]any) {
			document["data"] = []any{}
		})
		_, err := decodeCloudDraft(content, config.MaxDocumentBytes)
		assertError(t, err, "DOCUMENT_INVALID", false)
	})
}

func mutateDocumentJSON(t *testing.T, content string, mutate func(document map[string]any)) []byte {
	t.Helper()
	var document map[string]any
	if err := json.Unmarshal([]byte(content), &document); err != nil {
		t.Fatalf("Unable to decode test document: %v", err)
	}
	mutate(document)
	updated, err := json.Marshal(document)
	if err != nil {
		t.Fatalf("Unable to encode test document: %v", err)
	}
	return updated
}
