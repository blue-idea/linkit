# TASK-067 AC 验收矩阵

| AC ID | 场景 | 测试类型 | 状态 | 实际结果 | 证据 |
|------|------|:--------:|:----:|----------|------|
| REQ-006-AC-006 | 有 http(s) favicon URL 时优先使用图片图标 | Unit | PASS | `resolveBookmarkIcon` 返回图片 URL | `pnpm --dir ui exec vitest run src/features/bookmarks/icon.test.ts` |
| REQ-006-AC-006 | 无 favicon 时首字母 + 域名稳定背景色 | Unit | PASS | 同域名颜色一致，glyph 为标题首字母 | `icon.test.ts` |
| REQ-006-AC-006 | 入库分析透传 metadata favicon | Unit | PASS | `preview.faviconUrl` 为抓取地址 | `bookmark-analysis.test.ts` |
| REQ-006-AC-006 | Favicon 组件渲染图片地址 | Unit | PASS | `<img src="...">` 存在 | `ui.test.tsx` |
| REQ-006-AC-006 | 新建书签 E2E 回归 | E2E | PASS | `bookmark-crud.spec.ts` 4/4 通过 | 2026-07-22 执行 |
