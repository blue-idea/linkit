# TASK-068 验收矩阵

| TASK | AC | 测试类型 | 结果 | 说明 | 证据 |
|------|-----|----------|------|------|------|
| TASK-068 | REQ-006-AC-007 | Unit | PASS | glyph≤8 与 URL round-trip | `icon-persistence.test.ts` |
| TASK-068 | REQ-006-AC-007 | Unit | PASS | 超长 glyph 不入库 | `icon-persistence.test.ts` |
| TASK-068 | REQ-006-AC-007 | Integration | PASS | UI → 信封 → UI 保持 favicon/faviconColor | `icon-persistence.test.ts` |
| TASK-068 | REQ-006-AC-007 | Unit | PASS | 编辑保存写入领域 favicon 字段 | `batch-actions.test.ts` |
| TASK-068 | REQ-006-AC-007 | Unit | PASS | 迁移保留 emoji glyph；Schema 含 faviconColor | `library.test.ts` |
| TASK-068 | REQ-006-AC-006 | Unit | PASS | 有 faviconUrl 时 `initialIconEditorForNewBookmark` 默认网站图标 | `BookmarkIconEditor.test.tsx` |
| TASK-068 | REQ-006-AC-006 | Unit | PASS | 无图标时默认文字图标 + 随机背景色 | `BookmarkIconEditor.test.tsx` |
| TASK-068 | REQ-006-AC-006 | Unit | PASS | Go 元数据返回 faviconDataUrl；客户端映射 faviconDataUrl | `service_test.go`、`metadata-client.test.ts` |
| TASK-068 | REQ-006-AC-006 | Unit | PASS | 新建/编辑对话框图标编辑区与颜色字段 | `BookmarkIconEditor.test.tsx`、`BookmarkIconColorField.test.tsx` |
