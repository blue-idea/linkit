# Linkit 可追溯性矩阵（Traceability）

> 文件路径：`docs/spec/traceability.md`  
> 创建步骤：STEP 5（任务拆分）  
> 版本：1.36.0
> 日期：2026-07-22
> 状态：已定稿（新增并完成 TASK-072 / 分类名称双击展开与折叠）

---

## 矩阵说明

| 字段 | 含义 |
|------|------|
| `TASK ID` | 对应 `tasks.md` 的任务编号 |
| `REQ / AC` | 需求与验收标准；`001~004` 表示连续包含首尾 |
| `状态` | `待开始` / `进行中` / `done` / `BLOCKED` / `WONTFIX` |
| `实现文件` | STEP 6 完成后填写主要实现路径 |
| `测试文件` | STEP 6 完成后填写实际测试路径 |
| `AC 报告` | STEP 6 生成 `docs/spec/ac/TASK-XXX-AC.md` |
| `完成日期` | 任务关闭日期 |

---

## 追溯矩阵

| TASK ID | 任务名称 | REQ / AC | 状态 | 实现文件 | 测试文件 | AC 报告 | 完成日期 |
|---------|---------|----------|:----:|---------|---------|---------|---------|
| TASK-001 | Wails 与包管理骨架 | REQ-027-AC-004 | done | `main.go`、`config/app.go`、`wails.json`、`go.mod`、`ui/package.json`、`ui/pnpm-workspace.yaml`、`ui/vite.config.ts`、`ui/src/config/icons.ts` | `internal/scaffold/scaffold_test.go` | `docs/spec/ac/TASK-001-AC.md` | 2026-07-16 |
| TASK-002 | 测试与 CI 框架 | REQ-024-AC-006；REQ-028-AC-004 | done | `ui/vitest.config.ts`、`ui/playwright.config.ts`、`config/test/coverage.mjs`、`ui/.husky/*`、`.github/workflows/*` | `ui/src/utils/format-date.test.ts`、`ui/src/components/ui.test.tsx`、`ui/tests/e2e/*`、`ui/tests/visual/*`、`ui/verify-quality-config.mjs` | `docs/spec/ac/TASK-002-AC.md` | 2026-07-18 |
| TASK-003 | 数据 Schema 与迁移 | REQ-026-AC-001~004 | done | `ui/src/domain/schemas.ts`、`ui/src/domain/validation.ts`、`ui/src/domain/migration.ts`、`ui/src/domain/library.ts` | `ui/src/domain/library.test.ts` | `docs/spec/ac/TASK-003-AC.md` | 2026-07-18 |
| TASK-004 | 测试 Factory 与性能数据 | REQ-026-AC-001~004；REQ-028-AC-005~007 | done | `ui/src/config/test-data.ts`、`ui/src/testing/factories/index.ts`、`ui/src/testing/performance-data/index.ts` | `ui/src/tests/factories/factories.test.ts`、`ui/src/tests/performance-data/performance-data.test.ts` | `docs/spec/ac/TASK-004-AC.md` | 2026-07-18 |
| TASK-005 | Store、命令与 Repository | REQ-026-AC-001~004；REQ-027-AC-002~003 | done | `ui/src/domain/commands/*`、`ui/src/repositories/*`、`ui/src/store/*`、`ui/src/config/domain.ts`、`ui/src/config/repository.ts`、`ui/src/config/store.ts` | `ui/src/domain/commands/membership.test.ts`、`ui/src/repositories/memory.test.ts`、`ui/src/store/app-store.test.ts` | `docs/spec/ac/TASK-005-AC.md` | 2026-07-18 |
| TASK-006 | 本地原子资料库与云草稿 | REQ-002-AC-002；REQ-003-AC-004~005；REQ-027-AC-003 | done | `config/errors.go`、`config/storage.go`、`internal/localstore/*`、`main.go` | `internal/localstore/*_test.go`、`internal/scaffold/scaffold_test.go` | `docs/spec/ac/TASK-006-AC.md` | 2026-07-18 |
| TASK-007 | 本地设置服务 | REQ-019-AC-001、REQ-019-AC-006；REQ-023-AC-003~006 | done | `internal/settingsstore/*`、`config/storage.go`、`config/errors.go`、`main.go`、`ui/src/services/settings/*`、`ui/src/config/settings.ts`、`ui/src/domain/schemas.ts` | `internal/settingsstore/*_test.go`、`ui/src/services/settings/settings.test.ts` | `docs/spec/ac/TASK-007-AC.md` | 2026-07-18 |
| TASK-008 | 原生导入导出服务 | REQ-005-AC-001~003；REQ-025-AC-002 | done | `internal/platform/*`、`config/app.go`、`config/errors.go`、`main.go` | `internal/platform/*_test.go` | `docs/spec/ac/TASK-008-AC.md` | 2026-07-18 |
| TASK-009 | 网页元数据与外部 URL | REQ-006-AC-001~003；REQ-008-AC-002；REQ-025-AC-001 | done | `internal/metadata/*`、`internal/httpurl/*`、`internal/platform/external_url.go`、`config/network.go`、`main.go` | `internal/metadata/*_test.go`、`internal/httpurl/*_test.go`、`internal/platform/external_url_test.go` | `docs/spec/ac/TASK-009-AC.md` | 2026-07-18 |
| TASK-010 | 本地模式启动恢复 | REQ-001-AC-005；REQ-002-AC-001~004 | done | `ui/src/services/storage/*`、`ui/src/features/auth/*`、`ui/src/App.tsx`、`ui/src/storage.ts`、`ui/src/components/ui.tsx`、`ui/src/components/SettingsDialog.tsx` | `ui/src/features/auth/startup-gate.test.ts`、`ui/src/services/storage/*test*`、`ui/src/storage.test.ts`、`ui/tests/e2e/local-startup.spec.ts` | `docs/spec/ac/TASK-010-AC.md` | 2026-07-18 |
| TASK-011 | 书签核心 CRUD | REQ-006-AC-001、REQ-006-AC-003~004；REQ-007-AC-001~004 | done | `ui/src/domain/commands/bookmarks.ts`、`ui/src/features/bookmarks/*`、`ui/src/components/Dialogs.tsx`、`ui/src/components/DetailPanel.tsx`、`ui/src/App.tsx` | `ui/src/domain/commands/bookmarks.test.ts`、`ui/src/features/bookmarks/analysis.test.ts`、`ui/tests/e2e/bookmark-crud.spec.ts` | `docs/spec/ac/TASK-011-AC.md` | 2026-07-18 |
| TASK-012 | 书签状态与访问 | REQ-008-AC-001~004 | done | `ui/src/domain/commands/bookmark-state.ts`、`ui/src/features/bookmarks/visit.ts`、`ui/src/features/bookmarks/external-url.ts`、`ui/src/components/DetailPanel.tsx`、`ui/src/App.tsx` | `ui/src/domain/commands/bookmark-state.test.ts`、`ui/src/features/bookmarks/visit.test.ts`、`ui/tests/e2e/bookmark-state.spec.ts` | `docs/spec/ac/TASK-012-AC.md` | 2026-07-18 |
| TASK-013 | 排序与筛选 | REQ-008-AC-004；REQ-009-AC-001~004 | done | `ui/src/domain/query/index.ts`、`ui/src/config/query.ts`、`ui/src/App.tsx`、`ui/src/components/ContentArea.tsx` | `ui/src/domain/query/query.test.ts`、`ui/tests/e2e/bookmark-query.spec.ts` | `docs/spec/ac/TASK-013-AC.md` | 2026-07-18 |
| TASK-014 | 分类 CRUD 与删除 | REQ-010-AC-001~005 | done | `ui/src/domain/categories/index.ts`、`ui/src/features/categories/*`、`ui/src/components/Sidebar.tsx`、`ui/src/App.tsx` | `ui/src/domain/categories/categories.test.ts`、`ui/src/features/categories/delete-confirm.test.ts`、`ui/tests/e2e/category-crud.spec.ts` | `docs/spec/ac/TASK-014-AC.md` | 2026-07-18 |
| TASK-015 | 分类与书签拖拽 | REQ-011-AC-001~003；REQ-024-AC-006 | done | `ui/src/features/categories/drag/*`、`ui/src/components/Sidebar.tsx`、`ui/src/App.tsx`、`ui/src/components/ContentArea.tsx` | `ui/src/features/categories/drag/drag.test.ts`、`ui/tests/e2e/category-drag.spec.ts` | `docs/spec/ac/TASK-015-AC.md` | 2026-07-18 |
| TASK-016 | 主题 CRUD 与成员 | REQ-012-AC-001~004；REQ-026-AC-003 | done | `ui/src/domain/collections/*`、`ui/src/features/collections/*`、`ui/src/components/Sidebar.tsx`、`ui/src/App.tsx`、`ui/src/config/domain.ts` | `ui/src/domain/collections/collections.test.ts`、`ui/src/features/collections/apply-collection-command.test.ts`、`ui/src/domain/commands/membership.test.ts`、`ui/tests/e2e/collection-crud.spec.ts` | `docs/spec/ac/TASK-016-AC.md` | 2026-07-18 |
| TASK-017 | 手动主题组合 | REQ-013-AC-001~002 | done | `ui/src/features/collections/compose/*`、`ui/src/components/ContentArea.tsx`、`ui/src/components/Sidebar.tsx`、`ui/src/App.tsx` | `ui/src/features/collections/compose/compose.test.ts`、`ui/src/features/collections/compose/selection.test.ts`、`ui/tests/e2e/collection-compose.spec.ts` | `docs/spec/ac/TASK-017-AC.md` | 2026-07-18 |
| TASK-018 | 标签管理 | REQ-014-AC-001~003 | done | `ui/src/domain/tags/*`、`ui/src/features/tags/*`、`ui/src/components/Sidebar.tsx`、`ui/src/components/DetailPanel.tsx`、`ui/src/App.tsx` | `ui/src/domain/tags/tags.test.ts`、`ui/src/features/tags/apply-tag-command.test.ts`、`ui/tests/e2e/tag-management.spec.ts` | `docs/spec/ac/TASK-018-AC.md` | 2026-07-18 |
| TASK-019 | 三种基础视图 | REQ-015-AC-001~003；REQ-028-AC-004 | done | `ui/src/features/views/*`、`ui/src/components/ContentArea.tsx`、`ui/src/components/ui.tsx` | `ui/src/features/views/*.test.ts`、`ui/tests/e2e/base-views.spec.ts`、`ui/tests/e2e/base-views.spec.ts-snapshots/*` | `docs/spec/ac/TASK-019-AC.md` | 2026-07-18 |
| TASK-020 | 三种聚合视图 | REQ-016-AC-001~004；REQ-028-AC-004 | done | `ui/src/domain/views/*`、`ui/src/features/views/TimelineView.tsx`、`ui/src/features/views/TagAggregationView.tsx`、`ui/src/features/views/ThemeSpaceView.tsx`、`ui/src/components/ContentArea.tsx` | `ui/src/domain/views/views.test.ts`、`ui/tests/e2e/aggregate-views.spec.ts`、`ui/tests/e2e/aggregate-views.spec.ts-snapshots/*` | `docs/spec/ac/TASK-020-AC.md` | 2026-07-18 |
| TASK-021 | Spotlight 关键词与 URL | REQ-017-AC-001~004 | done | `ui/src/domain/search/*`、`ui/src/features/search/*`、`ui/src/components/Spotlight.tsx`、`ui/src/App.tsx` | `ui/src/domain/search/search.test.ts`、`ui/src/features/search/url.test.ts`、`ui/tests/e2e/spotlight.spec.ts` | `docs/spec/ac/TASK-021-AC.md` | 2026-07-18 |
| TASK-022 | 主窗口、快捷键与无障碍 | REQ-024-AC-001~006；REQ-028-AC-004 | done | `ui/src/features/shell/*`、`ui/src/App.tsx`、`ui/src/components/Dialogs.tsx`、`ui/src/components/SettingsDialog.tsx` | `ui/src/features/shell/shell.test.ts`、`ui/tests/e2e/app-shell.spec.ts`、`ui/tests/e2e/app-shell.spec.ts-snapshots/*` | `docs/spec/ac/TASK-022-AC.md` | 2026-07-18 |
| TASK-023 | 设置、主题与 i18n | REQ-023-AC-001~006 | done | `ui/src/i18n/*`、`ui/src/features/settings/*`、`ui/src/components/SettingsDialog.tsx`、`ui/src/components/LoginScreen.tsx`、`ui/src/features/shell/WindowChrome.tsx`、`ui/src/config/i18n.ts` | `ui/src/i18n/i18n.test.ts`、`ui/src/features/settings/settings-ui.test.ts`、`ui/tests/e2e/settings-i18n.spec.ts` | `docs/spec/ac/TASK-023-AC.md` | 2026-07-18 |
| TASK-024 | 导入导出 UX | REQ-005-AC-001~003；REQ-023-AC-005~006 | done | `ui/src/features/import-export/*`、`ui/src/components/SettingsDialog.tsx`、`ui/src/storage.ts`、`ui/src/i18n/catalogs.ts` | `ui/src/features/import-export/*.test.ts`、`ui/tests/e2e/import-export.spec.ts`、`ui/tests/fixtures/*` | `docs/spec/ac/TASK-024-AC.md` | 2026-07-18 |
| TASK-025 | 本地 MVP 回归 | REQ-002、006~017、023~024；REQ-028-AC-001~004 | done | `ui/tests/e2e/local-mvp/*` | `ui/tests/e2e/local-mvp/*.spec.ts`、`ui/tests/e2e/local-mvp/visual.spec.ts-snapshots/*` | `docs/spec/ac/TASK-025-AC.md` | 2026-07-18 |
| TASK-026 | Supabase 本地与 RLS | REQ-003-AC-002~003；REQ-025-AC-003~005 | done | `supabase/migrations/20260718113845_create_user_bookmarks.sql`、`supabase/seed.sql`、`ui/src/database.types.ts`、`ui/scripts/supabase-rls-api-test.mjs` | `supabase/tests/database/user_bookmarks_rls_test.sql`、`pnpm --dir ui test:supabase` | `docs/spec/ac/TASK-026-AC.md` | 2026-07-18 |
| TASK-027 | Supabase Auth | REQ-001-AC-001~006；REQ-002-AC-003 | done | `ui/src/repositories/auth.ts`、`ui/src/auth.ts`、`ui/src/components/LoginScreen.tsx`、`ui/src/features/auth/auth-flow.ts` | `ui/src/repositories/auth.test.ts`、`ui/src/features/auth/*.test.*`、`ui/tests/e2e/auth.spec.ts`、`ui/scripts/supabase-auth-api-test.mjs` | `docs/spec/ac/TASK-027-AC.md` | 2026-07-18 |
| TASK-028 | CloudRepository | REQ-003-AC-001~005；REQ-027-AC-002~003 | done | `ui/src/repositories/cloud.ts`、`ui/src/repositories/cloud-draft-sync.ts`、`ui/src/repositories/supabase-cloud-client.ts`、`ui/src/config/cloud-repository.ts` | `ui/src/repositories/cloud.test.ts`、`ui/src/repositories/cloud-draft-sync.test.ts`、`ui/scripts/supabase-revision-api-test.mjs` | `docs/spec/ac/TASK-028-AC.md` | 2026-07-18 |
| TASK-029 | 存储切换与冲突 | REQ-003-AC-005；REQ-004-AC-001~004 | done | `ui/src/services/storage-coordinator/index.ts`、`ui/src/features/storage/*`、`ui/src/components/SettingsDialog.tsx`、`ui/src/App.tsx` | `ui/src/services/storage-coordinator/index.test.ts`、`ui/tests/e2e/storage-switch.spec.ts` | `docs/spec/ac/TASK-029-AC.md` | 2026-07-18 |
| TASK-030 | 远程 Supabase 验收 | REQ-001-AC-001~004；REQ-003-AC-001~005；REQ-004-AC-001~004；REQ-025-AC-003~005 | done | `ui/scripts/cloud-remote-test.mjs`、`ui/package.json`（`test:cloud:remote`）、`ui/.env.test`（本机，不提交） | `pnpm --dir ui run test:cloud:remote`（17 PASS 0 FAIL） | `docs/spec/ac/TASK-030-AC.md` | 2026-07-18 |
| TASK-031 | SecretStore 与 AI 授权 | REQ-019-AC-001、004~006；REQ-025-AC-001~002 | done | `internal/secretstore/*`、`ui/src/features/settings/ai-consent/*`、`ui/src/services/secrets/browser-secret-store.ts`、`ui/src/components/SettingsDialog.tsx`、`main.go` | `internal/secretstore/service_test.go`、`ui/src/features/settings/ai-consent/ai-consent.test.ts`、`ui/tests/e2e/ai-consent.spec.ts` | `docs/spec/ac/TASK-031-AC.md` | 2026-07-18 |
| TASK-032 | AI 客户端与降级 | REQ-019-AC-002~005；REQ-027-AC-002 | done | `internal/ai/*`、`config/errors.go`、`config/network.go` | `internal/ai/client_test.go`、`internal/ai/url_test.go`、`internal/ai/adapters_test.go` | `docs/spec/ac/TASK-032-AC.md` | 2026-07-18 |
| TASK-033 | AI 分析与重分析 | REQ-006-AC-002~003；REQ-020-AC-001~002 | done | `internal/ai/service.go`、`ui/src/features/ai/bookmark-analysis/*`、`ui/src/components/Dialogs.tsx`、`ui/src/components/DetailPanel.tsx`、`main.go` | `internal/ai/service_test.go`、`ui/src/features/ai/bookmark-analysis/bookmark-analysis.test.ts`、`ui/tests/e2e/ai-bookmark-analysis.spec.ts` | `docs/spec/ac/TASK-033-AC.md` | 2026-07-18 |
| TASK-034 | 语义搜索 | REQ-018-AC-001~003 | done | `internal/ai/semantic.go`、`ui/src/features/search/semantic/*`、`ui/src/components/Spotlight.tsx` | `internal/ai/semantic_test.go`、`ui/src/features/search/semantic/semantic.test.ts`、`ui/tests/e2e/semantic-search.spec.ts` | `docs/spec/ac/TASK-034-AC.md` | 2026-07-18 |
| TASK-035 | AI 主题与去重 | REQ-013-AC-003~004；REQ-020-AC-003~004 | 待开始 | — | — | — | — |
| TASK-036 | 推荐与知识网络 | REQ-021-AC-001~004 | 待开始 | — | — | — | — |
| TASK-037 | 真实 AI 验收 | REQ-006-AC-002~003；REQ-013-AC-003~004；REQ-018-AC-001~003；REQ-019-AC-002~005；REQ-020-AC-001~004；REQ-021-AC-001~004 | BLOCKED | — | — | — | — |
| TASK-038 | 收藏洞察 | REQ-022-AC-001 | done | `ui/src/features/insights/*`、`ui/src/App.tsx` | `ui/src/features/insights/insights.test.ts`、`ui/tests/e2e/insights.spec.ts`、`ui/tests/e2e/insights.spec.ts-snapshots/*` | `docs/spec/ac/TASK-038-AC.md` | 2026-07-19 |
| TASK-039 | 链接健康 | REQ-022-AC-002~004 | done | `internal/health/*`、`config/events.go`、`config/network.go`、`main.go`、`ui/src/features/health/*`、`ui/src/components/Sidebar.tsx`、`ui/src/components/ContentArea.tsx`、`ui/src/App.tsx` | `internal/health/service_test.go`、`ui/src/features/health/health.test.ts`、`ui/tests/e2e/health-scan.spec.ts` | `docs/spec/ac/TASK-039-AC.md` | 2026-07-19 |
| TASK-040 | 安全与隐私测试 | REQ-003~005、019~020、025、027 的安全与破坏性操作 AC | done | `go.mod`、`go.sum`、`ui/scripts/test-env.mjs`、`ui/scripts/security-scan.mjs`、`ui/scripts/supabase-*-api-test.mjs`、`ui/package.json` | `ui/scripts/test-env.test.mjs`、`pnpm --dir ui test:security`、`pnpm --dir ui test:cloud:remote`、`govulncheck ./...` | `docs/spec/ac/TASK-040-AC.md` | 2026-07-19 |
| TASK-041 | 性能预算 | REQ-028-AC-005~008 | done | `ui/playwright.performance.config.ts`、`ui/package.json`、`ui/src/components/ContentArea.tsx` | `ui/tests/performance/performance-budget.spec.ts`、`internal/localstore/performance_test.go` | `docs/spec/ac/TASK-041-AC.md` | 2026-07-19 |
| TASK-042 | Windows 桌面验收 | REQ-005、008、024；REQ-027-AC-001、004；REQ-028-AC-004 | 待开始 | — | — | — | — |
| TASK-043 | macOS 桌面验收 | REQ-024；REQ-027-AC-001、004；REQ-028-AC-004 | 待开始 | — | — | — | — |
| TASK-044 | 全量回归与发布门禁 | REQ-001~028 / 全部 131 条 AC | 待开始 | — | — | — | — |
| TASK-045 | 书签操作与批量移动删除 | REQ-007-AC-005~010；REQ-011-AC-004~005；REQ-026-AC-002~003；REQ-027-AC-002~003 | done | `ui/src/features/bookmarks/batch-actions.ts`、`ui/src/features/bookmarks/BookmarkActionDialogs.tsx`、`ui/src/components/ContentArea.tsx`、`ui/src/components/DetailPanel.tsx`、`ui/src/features/views/CardView.tsx` | `ui/src/features/bookmarks/batch-actions.test.ts`、`ui/tests/e2e/bookmark-actions.spec.ts` | `docs/spec/ac/TASK-045-AC.md` | `docs/spec/evidence/TASK-045-evidence.md`、`TASK-045-bookmark-actions.png` |
| TASK-046 | 六主题皮肤与浅色主题 | REQ-023-AC-003、007；REQ-028-AC-004 | done | `ui/src/config/themes.ts`、`ui/src/types.ts`、`ui/src/domain/schemas.ts`、`ui/src/themes.ts`、`ui/src/i18n/catalogs.ts`、`ui/src/index.css`、`ui/tailwind.config.js`、`internal/settingsstore/settings.go` | `ui/src/themes.test.js`、`ui/src/services/settings/settings.test.ts`、`ui/src/features/settings/settings-ui.test.ts`、`internal/settingsstore/validation_test.go`、`ui/tests/visual/theme-skins.spec.ts` | `docs/spec/ac/TASK-046-AC.md` | 2026-07-19 |
| TASK-047 | 本地存储目录与数据迁移 | REQ-023-AC-002；REQ-029-AC-001~005 | done | `config/storage.go`、`config/errors.go`、`internal/localstore/dataroot.go`、`internal/localstore/directory_dialog.go`、`internal/settingsstore/service.go`、`main.go`、`ui/src/services/storage/data-root.ts`、`ui/src/components/SettingsDialog.tsx` | `internal/localstore/dataroot_test.go`、`ui/src/services/storage/data-root.test.ts`、`ui/tests/e2e/storage-data-root.spec.ts` | `docs/spec/ac/TASK-047-AC.md` | 2026-07-19 |
| TASK-048 | 书签项直接访问入口 | REQ-008-AC-005 | done | `ui/src/features/views/BookmarkItemActions.tsx`、`ui/src/features/views/CardView.tsx`、`ui/src/features/views/ListView.tsx`、`ui/src/features/views/MasonryView.tsx`、`ui/src/features/views/CompactRow.tsx`、`ui/src/features/views/TimelineView.tsx`、`ui/src/features/views/TagAggregationView.tsx`、`ui/src/features/views/ThemeSpaceView.tsx`、`ui/src/components/ContentArea.tsx`、`ui/src/App.tsx` | `ui/src/features/views/BookmarkItemActions.test.tsx`、`ui/src/features/bookmarks/visit.test.ts`、`ui/tests/e2e/bookmark-actions.spec.ts` | `docs/spec/ac/TASK-048-AC.md` | `docs/spec/evidence/TASK-048-evidence.md`、`TASK-048-direct-access*.png` |
| TASK-049 | Spotlight 回车直接访问 | REQ-017-AC-005；REQ-008-AC-002 | done | `ui/src/components/Spotlight.tsx`、`ui/src/App.tsx` | `ui/src/components/Spotlight.test.tsx`、`ui/tests/e2e/spotlight.spec.ts` | `docs/spec/ac/TASK-049-AC.md` | `docs/spec/evidence/TASK-049-evidence.md`、`TASK-049-spotlight-direct-open.png` |
| TASK-050 | Collection Emoji 候选菜单 | REQ-012-AC-005；REQ-012-AC-001 | done | `ui/src/config/collection-icons.ts`、`ui/src/features/collections/CollectionFormDialog.tsx` | `ui/src/features/collections/CollectionFormDialog.test.tsx`、`ui/tests/e2e/collection-crud.spec.ts` | `docs/spec/ac/TASK-050-AC.md` | `docs/spec/evidence/TASK-050-evidence.md`、`TASK-050-collection-emoji-menu.png` |
| TASK-051 | 新建书签 URL 唯一性 warning | REQ-006-AC-005；REQ-006-AC-004 | done | `ui/src/domain/commands/bookmarks.ts`、`ui/src/config/domain.ts`、`ui/src/components/Dialogs.tsx`、`ui/src/App.tsx` | `ui/src/domain/commands/bookmarks.test.ts`、`ui/tests/e2e/bookmark-crud.spec.ts` | `docs/spec/ac/TASK-051-AC.md` | `docs/spec/evidence/TASK-051-evidence.md`、`TASK-051-duplicate-url-warning.png` |
| TASK-052 | 主题批量成员命令与候选过滤 | REQ-012-AC-008、009、011；REQ-026-AC-003 | done | `ui/src/domain/commands/index.ts`、`ui/src/config/domain.ts`、`ui/src/features/collections/membership-candidates.ts`、`ui/src/features/collections/apply-collection-command.ts`、`ui/src/features/collections/index.ts` | `ui/src/domain/commands/membership.test.ts`、`ui/src/features/collections/membership-candidates.test.ts`、`ui/src/features/collections/apply-collection-command.test.ts` | `docs/spec/ac/TASK-052-AC.md` | 2026-07-19 |
| TASK-053 | 主题视图添加书签入口与挑选器 | REQ-012-AC-006~010 | done | `ui/src/features/collections/AddBookmarksToCollectionDialog.tsx`、`ui/src/components/ContentArea.tsx`、`ui/src/App.tsx`、`ui/src/features/shell/overlay-stack.ts` | `ui/src/features/collections/AddBookmarksToCollectionDialog.test.tsx`、`ui/tests/e2e/collection-membership.spec.ts` | `docs/spec/ac/TASK-053-AC.md` | 2026-07-19 |
| TASK-054 | 主题视图移出成员 | REQ-012-AC-011；REQ-026-AC-003 | done | `ui/src/features/views/BookmarkItemActions.tsx`、`ui/src/features/collections/RemoveFromCollectionDialog.tsx`、`ui/src/components/ContentArea.tsx`、`ui/src/App.tsx` | `ui/src/features/views/BookmarkItemActions.test.tsx`、`ui/src/features/collections/RemoveFromCollectionDialog.test.tsx`、`ui/tests/e2e/collection-membership.spec.ts` | `docs/spec/ac/TASK-054-AC.md` | 2026-07-19 |
| TASK-055 | 开发/正式本机身份槽隔离 | REQ-025-AC-006 | done | `config/identity.go`、`config/identity_dev.go`、`config/app.go`、`config/storage.go`、`config/errors.go`、`scripts/dev.ps1`、`scripts/dev.sh`、`scripts/check-identity/main.go`、`.github/workflows/ci.yml`、`.github/workflows/release.yml` | `config/identity_test.go`、`config/identity_release_test.go`、`config/identity_dev_test.go` | `docs/spec/ac/TASK-055-AC.md` | 2026-07-20 |
| TASK-056 | 全界面 UI 语言与设置对齐 | REQ-023-AC-004~006、008 | done | `ui/src/i18n/*`、`ui/src/App.tsx`、`ui/src/components/*`、`ui/src/features/*`、`ui/src/utils/format-date.ts` | `ui/src/i18n/*test*`、`ui/tests/e2e/settings-i18n.spec.ts`、`ui/tests/e2e/ui-language-alignment.spec.ts`、`ui/tests/visual/ui-language-alignment.spec.ts` | `docs/spec/ac/TASK-056-AC.md` | `docs/spec/evidence/TASK-056-evidence.md`、`TASK-056-*.png` |
| TASK-057 | 变更影响 E2E 与发布门禁 | REQ-024-AC-006；REQ-028-AC-004 | done | `config/test/e2e-impact.mjs`、`ui/scripts/select-e2e-tests.mjs`、`.github/workflows/ci.yml`、`.github/workflows/release.yml` | `ui/scripts/select-e2e-tests.test.mjs` | `docs/spec/ac/TASK-057-AC.md` | `docs/spec/evidence/TASK-057-evidence.md` |
| TASK-058 | 合并 Coverage 与精简 E2E | REQ-024-AC-006；REQ-028-AC-004 | done | `.github/workflows/ci.yml`、`config/test/e2e-impact.mjs`、`ui/scripts/select-e2e-tests.mjs`、`ui/verify-quality-config.mjs` | `ui/scripts/select-e2e-tests.test.mjs`、`pnpm --dir ui test:coverage` | `docs/spec/ac/TASK-058-AC.md` | `docs/spec/evidence/TASK-058-evidence.md` |
| TASK-059 | 关闭隐藏、托盘与显隐全局热键 | REQ-030-AC-001~005、REQ-030-AC-010；REQ-027-AC-001 | done | `internal/hotkey/*`、`internal/tray/*`、`internal/platform/desktop.go`、`main.go` | `internal/hotkey/*_test.go`、`internal/tray/*_test.go`、`internal/platform/desktop_test.go` | `docs/spec/ac/TASK-059-AC.md` | 2026-07-21 |
| TASK-060 | Settings→Shortcuts 可配置绑定 | REQ-030-AC-006~009；REQ-023-AC-001；REQ-024-AC-002~003 | done | `ui/src/features/shell/shortcuts.ts`、`ShortcutsPanel.tsx`、`SettingsDialog.tsx`、`schemas.ts` | `shortcuts.test.ts`、`ShortcutsPanel.test.tsx`、`settings-shortcuts.spec.ts` | `docs/spec/ac/TASK-060-AC.md` | 2026-07-21 |
| TASK-061 | 托盘与快捷键跨平台验收 | REQ-030-AC-001~010；REQ-027-AC-001 | done | `main.go`、`internal/tray/*`、`internal/hotkey/*`、Settings Shortcuts | J-17 Manual（用户 2026-07-21 确认） | `docs/spec/ac/TASK-061-AC.md` | 2026-07-21 |
| TASK-062 | uiSize 预设、Schema 与冷启动尺寸 | REQ-031-AC-002~005 | done | `config/window_size.go`、`internal/platform/desktop.go`、`internal/settingsstore/*`、`main.go`、`ui/src/config/window-size.ts`、`schemas.ts` | `config/window_size_test.go`、`platform/window_size_test.go`、`settingsstore/window_size_test.go`、`window-size.test.ts`、`library.test.ts` | `docs/spec/ac/TASK-062-AC.md` | 2026-07-21 |
| TASK-063 | Appearance 窗口大小 UI 与 i18n | REQ-031-AC-001~006；REQ-023-AC-001 | done | `SettingsDialog.tsx`、`desktop-window-size.ts`、`catalogs.ts`、`App.tsx` | `i18n.test.ts`、`desktop-window-size.test.ts`、`settings-window-size.spec.ts`、J-18 Manual | `docs/spec/ac/TASK-063-AC.md` | 2026-07-21 |
| TASK-064 | 修复 Windows 托盘 Quit 无法退出 | REQ-030-AC-002~004、010 | done | `internal/tray/menu.go`、`internal/tray/systray_runner*.go`、`internal/platform/desktop.go`、`internal/platform/service.go`、`main.go` | `internal/tray/menu_test.go`、`internal/platform/desktop_test.go`、Windows Manual | `docs/spec/ac/TASK-064-AC.md` | 2026-07-22 |
| TASK-065 | 托盘 Show 替换为 Settings | REQ-030-AC-002~004 | done | `config/events.go`、`internal/tray/menu.go`、`main.go`、`ui/src/config/events.ts`、`ui/src/services/wails-events.ts`、`ui/src/features/shell/tray-settings.ts`、`ui/src/App.tsx` | `internal/tray/menu_test.go`、`tray-settings.test.ts`、Windows native automation | `docs/spec/ac/TASK-065-AC.md` | 2026-07-22 |
| TASK-066 | 修复设置保存反馈与窗口大小重启恢复 | REQ-031-AC-003~005；REQ-023-AC-001；REQ-030-AC-007 | done | `ui/src/features/auth/use-local-startup.ts`、`ui/src/features/shell/desktop-hotkey.ts`、`ui/src/components/SettingsDialog.tsx`、`ui/src/App.tsx`、`ui/src/i18n/catalogs.ts` | `persist-ui-settings.test.ts`、`desktop-hotkey.test.ts`、`SettingsDialog.test.tsx`、`settings-save-feedback.spec.ts`、Windows native automation | `docs/spec/ac/TASK-066-AC.md` | 2026-07-22 |
| TASK-067 | 新建书签图标（元数据图片与文字回退） | REQ-006-AC-006 | done | `ui/src/features/bookmarks/icon.ts`、`ui/src/components/Dialogs.tsx`、`ui/src/components/ui.tsx`、`ui/src/features/ai/bookmark-analysis/inbound.ts` | `icon.test.ts`、`ui.test.tsx`、`bookmark-analysis.test.ts`、`tests/e2e/bookmark-crud.spec.ts` | `docs/spec/ac/TASK-067-AC.md` | 2026-07-22 |
| TASK-068 | 书签图标领域持久化 | REQ-006-AC-006~007 | done | `ui/src/domain/bookmark-icon.ts`、`ui/src/features/bookmarks/icon-persistence.ts`、`BookmarkIconEditor.tsx`、`metadata/favicon_fetch.go`、`Dialogs.tsx`、`BookmarkActionDialogs.tsx`、`supabase/migrations/20260722101627_*`、`supabase/seed.sql` | `icon-persistence.test.ts`、`BookmarkIconEditor.test.ts`、`library.test.ts`、`service_test.go`、bookmarks Vitest 套件 | `docs/spec/ac/TASK-068-AC.md` | 2026-07-22 |
| TASK-069 | AI 新建书签标签匹配与复用 | REQ-006-AC-002、004；REQ-014-AC-003 | done | `internal/ai/prompt.go`、`ui/src/features/tags/suggested-tag-matching.ts`、`ui/src/components/Dialogs.tsx` | `internal/ai/prompt_test.go`、`suggested-tag-matching.test.ts`、`NewBookmarkDialog.ai-tags.test.tsx`、`ai-bookmark-analysis.spec.ts` | `docs/spec/ac/TASK-069-AC.md` | `docs/spec/evidence/TASK-069-evidence.md`、`TASK-069-ai-tag-match.png` |
| TASK-070 | AI 书签摘要 200 字限制 | REQ-006-AC-008 | done | `config/network.go`、`internal/ai/prompt.go`、`internal/ai/service.go` | `internal/ai/prompt_test.go`、`internal/ai/service_test.go` | `docs/spec/ac/TASK-070-AC.md` | `docs/spec/evidence/TASK-070-evidence.md`、`docs/spec/reports/TASK-070-report.md` |
| TASK-071 | 新建书签 Manual 与 Smart 双入口 | REQ-006-AC-001、004、009 | done | `ui/src/components/Dialogs.tsx`、`ui/src/features/bookmarks/analysis.ts`、`ui/src/i18n/catalogs.ts` | `NewBookmarkDialog.entry-modes.test.tsx`、`analysis.test.ts`、`new-bookmark-entry-modes.spec.ts`、相关书签 E2E | `docs/spec/ac/TASK-071-AC.md` | `docs/spec/evidence/TASK-071-evidence.md`、`docs/spec/reports/TASK-071-report.md`、`TASK-071-entry-modes-*.png` |
| TASK-072 | 分类名称双击展开与折叠 | REQ-010-AC-001、006；REQ-011-AC-001 | done | `ui/src/components/Sidebar.tsx`、`ui/src/App.tsx` | `Sidebar.category-double-click.test.tsx`、`Sidebar.category-label.test.tsx`、`category-name-double-click.spec.ts`、分类 CRUD/拖拽 E2E | `docs/spec/ac/TASK-072-AC.md` | `docs/spec/evidence/TASK-072-evidence.md`、`docs/spec/reports/TASK-072-report.md`、`TASK-072-category-name-double-click-*.png` |

---

## REQ 覆盖摘要

| REQ 范围 | 主要 TASK |
|----------|-----------|
| REQ-001~005 | TASK-006、008、010、024、026~030、040、042、044 |
| REQ-006~009 | TASK-009、011~013、025、033、037、044、048、051、069~071 |
| REQ-010~014 | TASK-014~018、025、035、044、050、052~054、069、072 |
| REQ-015~018 | TASK-019~021、025、034、037、041、044 |
| REQ-019~022 | TASK-007、031~040、044 |
| REQ-023~024 | TASK-001~002、015、022~025、042~044、046~047、056 |
| REQ-025~029 | TASK-001~009、022、026~032、040~044、046~047 |
| REQ-030~031 | TASK-059~066 |

---

## 变更记录

| 日期 | 变更内容 | 原因 |
|------|----------|------|
| 2026-07-16 | 初始化矩阵，共 44 项任务 | STEP 5 本地优先任务拆分完成 |
| 2026-07-16 | 矩阵定稿为 1.0.0 | 用户确认任务拆分 |
| 2026-07-16 | TASK-001 标记为 BLOCKED，并补充实现、测试与 AC 证据 | 工程骨架已实现；三个 AC 仍需原生桌面或下游持久化能力验收 |
| 2026-07-16 | 矩阵更新为 1.1.0，TASK-001 改绑 REQ-027-AC-004，平台任务采用单平台完整旅程加另一平台构建门禁 | 用户确认平台验收策略并修正任务与 AC 职责边界 |
| 2026-07-16 | TASK-001 更新为 done，并补充最终实现、测试、AC 报告与完成日期 | REQ-027-AC-004 已通过真实工程契约、双平台构建与 macOS 启动验证 |
| 2026-07-18 | TASK-007 更新为 done，补充 settingsstore 与前端 settings 服务路径 | 本机设置原子读写、默认值、consent 失效与 Unit AC 已验收 |
| 2026-07-18 | TASK-008 更新为 done，补充 NativeFileService 路径 | 原生导入导出、导出信封与密钥拒绝 Unit AC 已验收 |
| 2026-07-18 | TASK-009 更新为 done，补充 MetadataService 与 OpenExternalURL | 受限 HTTP 抓取、静态解析与外开门禁已验收 |
| 2026-07-18 | TASK-010 更新为 done，补充启动门控与本地恢复旅程 | Loading gate、刷新恢复、退出保留与种子确认已验收 |
| 2026-07-18 | TASK-011 更新为 done，补充书签 CRUD 命令与入库确认 UI | 分析确认、英文降级、编辑同步与删除确认已验收 |
| 2026-07-18 | TASK-012 更新为 done，补充状态命令、访问门控与阅读筛选 | 星标/置顶、visit 成功计数、四态 readStatus 与筛选已验收 |
| 2026-07-18 | TASK-013 更新为 done，补充 query 排序筛选引擎 | 四键排序、pinned 分组、交集筛选与清除已验收 |
| 2026-07-18 | TASK-014 更新为 done，补充分类树 CRUD 与三删除策略 | 树计数、创建重命名、移动/递归/取消删除已验收 |
| 2026-07-18 | TASK-015 更新为 done，补充分类拖拽与书签归类 | 合法/非法移动、书签归类与键盘等价已验收 |
| 2026-07-18 | TASK-016 更新为 done，补充主题 CRUD 与双向成员 | 创建/编辑/删除、成员对称与主题视图计数已验收 |
| 2026-07-18 | TASK-017 更新为 done，补充手动拖出主题组合 | 预览/取消无副作用/确认双向成员已验收 |
| 2026-07-18 | TASK-018 更新为 done，补充标签维护与筛选 | 唯一性、引用清理、侧栏计数与建议采纳已验收 |
| 2026-07-18 | TASK-023 更新为 done，补充 i18n、五分区设置与四主题 | 默认 English、中英切换、主题持久化与 AC 已验收 |
| 2026-07-18 | TASK-024 更新为 done，补充导入导出 UX 与覆盖确认 | 版本化导出、覆盖确认、无效拒绝与双语言截图已验收 |
| 2026-07-18 | TASK-025 更新为 done，补充本地 MVP 旅程与视觉回归 | 三次操作预算、串联旅程与 Baseline 比对已验收；本地 MVP 波次完成 |
| 2026-07-18 | TASK-030 更新为 done，解除 BLOCKED，补充远程 Supabase 验收脚本与 AC 报告 | 远程 `linkit` 项目 Schema/RLS/trigger/revision 核验通过；17 PASS 0 FAIL |
| 2026-07-19 | 新增 TASK-045 与批量书签操作追溯 | 用户确认统一编辑入口、URL 字段、批量移动与批量删除 |
| 2026-07-19 | 新增 TASK-048 书签项直接访问追溯 | 六种视图共享 `Open bookmark directly`，并与右侧详情 `Visit` 区分 |
| 2026-07-19 | 新增 TASK-049 Spotlight 回车直接访问追溯 | 搜索结果 Enter 确认复用访问编排直接打开网站，点击结果仍定位详情 |
| 2026-07-19 | 新增 TASK-050 Collection Emoji 候选菜单追溯 | 侧栏新建/编辑主题时可通过候选菜单选择主题图标 |
| 2026-07-19 | 新增 TASK-051 新建书签 URL 唯一性追溯 | 创建书签时重复 URL 显示 warning 并阻止进入分析、确认或保存下一步 |
| 2026-07-19 | 新增 TASK-046 与六主题皮肤追溯 | 用户确认参考 `ck/project` 优化主题样式，并新增 Daylight 与 Paper |
| 2026-07-19 | TASK-046 更新为 done，补充六主题实现、测试、AC 与视觉证据 | 六主题持久化、12 组 Baseline/Actual/Diff 和回归测试完成 |
| 2026-07-19 | 新增 TASK-047 与 REQ-029 追溯行 | 用户确认可配置本地存储目录并在变更时自动迁移应用数据 |
| 2026-07-19 | TASK-047 更新为 done，补充 data-root 实现、测试与 AC | Go/Vitest/Playwright 真实验收通过 |
| 2026-07-19 | 新增 TASK-052~054 主题视图手动成员管理追溯 | 覆盖 REQ-012-AC-006~011：添加挑选器、空态 CTA、单条/批量移出 |
| 2026-07-19 | TASK-052 更新为 done | 批量成员命令与候选过滤 Unit 验收通过 |
| 2026-07-19 | TASK-053 更新为 done | 主题视图 Add bookmarks 挑选器与空态 CTA 验收通过 |
| 2026-07-19 | TASK-054 更新为 done | 主题视图单条/多选移出成员验收通过 |
| 2026-07-20 | 新增 TASK-055 与 REQ-025-AC-006 追溯 | 开发/正式 AppData 与 Keychain 身份槽隔离；Release 产物门禁 |
| 2026-07-20 | 新增 TASK-056 与 REQ-023-AC-008 追溯 | 全部非自定义 UI 文案、状态和无障碍名称跟随设置语言；自定义内容保持原样 |
| 2026-07-20 | TASK-056 更新为 done | 全界面语言对齐 Unit/E2E/Visual 验收通过，补齐 AC、evidence 与报告 |
| 2026-07-21 | 新增并完成 TASK-057 | PR 按变更影响执行 Smoke 与相关测试；main 全量回归；Release 校验同 SHA CI 后执行关键旅程与构建 |
| 2026-07-21 | 新增并完成 TASK-058 | Vitest/Coverage 合并为单次执行；文档和纯 Go 变更跳过浏览器；定时/手动保留全量回归 |
| 2026-07-21 | 新增 TASK-059~061 与 REQ-030 追溯 | 关闭隐藏/托盘/全局热键与 Settings→Shortcuts；对齐 fix_task 1.8 |
| 2026-07-21 | TASK-059 Unit done；TASK-060 done | Manual 托盘/全局热键并入 TASK-061 J-17 |
| 2026-07-21 | TASK-061 done；fix_task 1.8 关闭 | 用户确认 J-17 Manual 通过 |
| 2026-07-21 | 新增 TASK-062~063 与 REQ-031 追溯 | Appearance 窗口大小四档；对齐 fix_task 1.9 |
| 2026-07-21 | TASK-062 Unit done | Manual/J-18 并入 TASK-063 |
| 2026-07-21 | TASK-063 done；fix_task 1.9 关闭 | 用户确认 J-18 Manual 通过 |
| 2026-07-22 | 新增并完成 TASK-064 | Windows 托盘 HWND 与消息循环线程不一致，且 Quit 清理顺序可能晚于 Wails 退出；修复后用户确认可正常退出 |
| 2026-07-22 | 新增并完成 TASK-065 | 用户确认托盘 Show 替换为 Settings；Windows 原生设置弹窗与未改动 Quit 回归通过 |
| 2026-07-22 | 新增 TASK-066 | 用户反馈保存设置无响应且 uiSize 重启未恢复；进入 TDD 修复与回归验收 |
| 2026-07-22 | TASK-066 更新为 done | UI/Domain 双向映射、热键变更检测、保存反馈、视觉回归与 Windows 1536×960 冷启动验收通过 |
| 2026-07-22 | 新增 TASK-067 | REQ-006-AC-006 新建书签 favicon 图片优先与文字图标稳定背景色 |
| 2026-07-22 | 新增 TASK-068 | REQ-006-AC-007 书签图标 glyph≤8 与 faviconColor 信封持久化 |
| 2026-07-22 | 新增并完成 TASK-069 | 对齐 fix_task 1.11；修复 AI 建议标签与现有标签候选之间的语言/格式匹配断层，且不新增数据库结构 |
| 2026-07-22 | 新增并完成 TASK-070 | 对齐 fix_task 1.12；提示词与服务边界双重保证 AI 书签摘要最多 200 个 Unicode 字符 |
| 2026-07-22 | 新增并完成 TASK-071 | 对齐 fix_task 1.13；Manual 仅获取元数据且零 AI，Smart 与 URL Enter 保持智能分析 |
| 2026-07-22 | 新增并完成 TASK-072 | 对齐 fix_task 1.14；双击分类名称切换子分类，修正根分类默认展开的首次切换语义 |
