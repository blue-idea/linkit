package localstore

import (
	"encoding/json"
	"fmt"
	"testing"
)

// REQ-028-AC-007：测量 10,000 条资料库文档的 revision 更新与序列化成本。
func BenchmarkUpdateLibraryDocument10000(benchmark *testing.B) {
	bookmarks := make([]map[string]any, 10_000)
	for index := range bookmarks {
		bookmarks[index] = map[string]any{
			"id": fmt.Sprintf("bookmark-%05d", index), "title": fmt.Sprintf("Performance bookmark %d", index+1),
		}
	}
	document, err := json.Marshal(map[string]any{
		"format": "linkit-library", "schemaVersion": 1, "revision": 0,
		"updatedAt": "2026-07-19T00:00:00Z",
		"data":      map[string]any{"bookmarks": bookmarks, "categories": []any{}, "collections": []any{}, "tags": []any{}},
	})
	if err != nil {
		benchmark.Fatal(err)
	}
	benchmark.ReportAllocs()
	benchmark.SetBytes(int64(len(document)))
	benchmark.ResetTimer()
	for range benchmark.N {
		if _, _, err := updateLibraryDocument(document, 0, fixedTime, int64(len(document))+1); err != nil {
			benchmark.Fatal(err)
		}
	}
}
