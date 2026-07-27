# 完整资料库与可移植设置备份实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 导出和恢复全部书签、分类、主题、标签及可移植设置，同时排除凭据和设备运行态字段，并兼容旧 `linkit-library` 导入。

**Architecture:** Zod 4 定义严格 `BackupEnvelope` 与 `PortableAppSettings`；纯函数负责资料库投影、设置脱敏、双格式解析和摘要。恢复协调器先严格持久化两份文档，任何失败执行补偿回滚，全部成功后才更新 React 状态；Go 原生文件服务按结构扫描敏感字段并支持新旧信封。

**Tech Stack:** React 18、TypeScript、Zod 4、Vitest、Wails v2、Go 1.26、Playwright、ImageMagick。

---

## 文件结构

- 修改 `ui/src/domain/schemas.ts`、`library.ts`：新增 PortableAppSettings/BackupEnvelope Schema 和类型。
- 新增 `ui/src/config/backup.ts`：备份格式、版本和应用版本常量。
- 重构 `ui/src/features/import-export/from-ui.ts`：分离 LibraryEnvelope 与 BackupEnvelope 构建。
- 修改 `document.ts`、`apply.ts`、`index.ts`：双格式解析、设置摘要和导入投影。
- 新增 `ui/src/features/import-export/restore.ts`：持久化与补偿回滚协调器。
- 修改 `ui/src/features/auth/use-local-startup.ts`、`ui/src/types.ts`：保留 `view.defaultMode` 并暴露 UI/Domain 设置转换。
- 修改 `ui/src/services/storage/desktop-adapters.ts`：新增严格备份持久化适配器，不吞掉写入失败。
- 修改 `ui/src/components/SettingsDialog.tsx`、`ImportOverwriteDialog.tsx`、`ui/src/App.tsx`：完整导出、设置摘要、异步恢复与错误反馈。
- 修改 `internal/platform/export.go`、`import.go`、`native_file_test.go`：支持新信封并结构化拒绝敏感字段。
- 修改 `ui/tests/e2e/import-export.spec.ts`，新增备份 fixture 和视觉测试。

### Task 1: Schema 与纯函数 RED

- [ ] **Step 1: 在 `ui/src/domain/library.test.ts` 写失败 Schema 测试**

覆盖 `linkit-backup` 完整成功、缺少四类实体失败、`aiConsent`/`lastCloudRevision`/`apiKey`/token/log 字段失败、无效快捷键和设置枚举失败。

- [ ] **Step 2: 在 `import-export.test.ts` 写失败 round-trip 测试**

```ts
test('REQ-034-AC-001 完整备份保留四类实体与可移植设置', () => {});
test('REQ-034-AC-002 序列化结果不含凭据和设备状态', () => {});
test('REQ-034-AC-004 旧 linkit-library 保留当前设置', () => {});
test('无效备份被拒绝且不产生可应用值', () => {});
```

- [ ] **Step 3: 运行 RED**

```bash
pnpm --dir ui exec vitest run src/domain/library.test.ts src/features/import-export/import-export.test.ts
```

Expected: FAIL，原因是新 Schema、类型和构建函数不存在，旧导出仍为 `linkit-library`。

### Task 2: Schema、投影和双格式解析 GREEN

- [ ] **Step 1: 新增集中常量**

`ui/src/config/backup.ts`：

```ts
export const BACKUP_FORMAT = 'linkit-backup' as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;
export const LINKIT_APP_VERSION = '0.2.7';
```

- [ ] **Step 2: 新增严格 Schema**

```ts
export const PortableAppSettingsSchema = z.strictObject({
  settingsVersion: z.int().min(1),
  storageMode: z.enum(['local', 'cloud']),
  theme: z.enum(THEME_IDS),
  locale: z.enum(['en', 'zh']),
  ai: z.strictObject({ apiBase: optionalApiBaseSchema, model: z.string().trim() }),
  view: z.strictObject({ defaultMode: z.enum([...]) }),
  shortcuts: shortcutMapSchema,
  uiSize: z.enum(UI_SIZE_IDS),
});

export const BackupEnvelopeSchema = z.strictObject({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  revision: z.int().min(0),
  updatedAt: z.iso.datetime(),
  exportedAt: z.iso.datetime(),
  appVersion: z.string().trim().min(1),
  data: LibraryDataSchema,
  settings: PortableAppSettingsSchema,
});
```

- [ ] **Step 3: 重构构建函数**

提供：

```ts
buildLibraryEnvelopeFromUi(library, options): LibraryEnvelope;
buildPortableSettings(settings): PortableAppSettings;
buildBackupEnvelopeFromUi(library, settings, options): BackupEnvelope;
```

Portable 投影显式白名单复制；禁止对象 spread 整份 AppSettings，确保新增敏感字段不会自动进入备份。

- [ ] **Step 4: 实现双格式解析**

`parseImportText` 先检查 `format`：

- `linkit-backup`：严格 Schema + Library 关系校验，返回 `kind: 'backup'` 与 settings。
- `linkit-library` 或旧无信封数据：复用 `migrateLibraryDocument`，返回 `kind: 'library'`，settings 为 null。

摘要增加 `settingsIncluded`、theme、locale、storageMode、uiSize。

- [ ] **Step 5: 运行 GREEN**

```bash
pnpm --dir ui exec vitest run src/domain/library.test.ts src/features/import-export/import-export.test.ts src/features/import-export/apply.test.ts
```

Expected: PASS。

### Task 3: 原生文件安全门禁 RED/GREEN

- [ ] **Step 1: 修改 `internal/platform/native_file_test.go` 写 RED**

新增：

```go
func TestExportLibraryAcceptsPortableBackup(t *testing.T) {}
func TestImportAcceptsPortableBackup(t *testing.T) {}
func TestBackupRejectsNestedCredentialAndRuntimeFields(t *testing.T) {}
func TestSensitiveScannerDoesNotRejectBenignBookmarkText(t *testing.T) {}
```

首轮运行应复现 `settingsVersion` 被错误拒绝且 `linkit-backup` format 不被接受。

- [ ] **Step 2: 实现结构化敏感字段扫描**

JSON 解码为 `unknown`，递归遍历对象 key；拒绝 API Key、access/refresh token、session、Authorization、logs、`aiConsent`、`lastCloudRevision`，允许 `settingsVersion`。错误正文不包含敏感值。

- [ ] **Step 3: 扩展 `buildExportDocument`**

对 `linkit-library` 保留旧导出兼容；对 `linkit-backup` 严格读取必需顶层字段和 settings，更新 `exportedAt`/`appVersion` 后原样保存。

- [ ] **Step 4: 运行 GREEN**

```bash
go test ./internal/platform -run 'Test(ExportLibrary|SelectImportFile|Backup|Sensitive)' -count=1 -cover
```

Expected: PASS。

### Task 4: 原子恢复协调器 RED/GREEN

- [ ] **Step 1: 新增 `restore.test.ts` 并运行 RED**

覆盖：全部持久化成功后才调用 apply；设置写入失败时回滚资料库；apply 失败时回滚设置与资料库；取消/无效输入零调用；回滚错误保留原始失败语义。

- [ ] **Step 2: 实现 `restore.ts`**

```ts
export interface RestoreSnapshot {
  library: UiLibraryData;
  settings: UiAppSettings;
}

export async function restoreBackupAtomically(input: {
  previous: RestoreSnapshot;
  next: RestoreSnapshot;
  persistLibrary: (library: UiLibraryData) => Promise<void>;
  persistSettings: (settings: UiAppSettings) => Promise<void>;
  apply: (snapshot: RestoreSnapshot) => void;
}): Promise<void>;
```

执行顺序：persistLibrary(next) → persistSettings(next) → apply(next)。任一步失败按已完成步骤逆序补偿；补偿失败附加为 cause，但 UI 只显示稳定英文错误。

- [ ] **Step 3: 新增严格持久化适配器**

`createBackupPersistenceAdapters` 在桌面直接调用 `localstore.ReplaceLibrary` 与 `settingsstore.WriteSettings`，不回退并吞错；浏览器使用既有 adapter 的严格 `setItem` 路径。资料库持久化使用 `buildLibraryEnvelopeFromUi`，不得把 BackupEnvelope 写入 `library.json`。

- [ ] **Step 4: 保留设置字段**

UI `AppSettings` 增加可选 `view.defaultMode`；`toUiSettings` / `toDomainSettings` 双向映射该字段。导入 Portable 设置时显式将 `aiConsent` 和 domain `lastCloudRevision` 置为 null。

- [ ] **Step 5: 运行 GREEN**

```bash
pnpm --dir ui exec vitest run src/features/import-export/restore.test.ts src/features/auth/persist-ui-settings.test.ts src/services/storage/desktop-adapters.test.ts
```

Expected: PASS。

### Task 5: Settings/App 集成与 E2E RED/GREEN

- [ ] **Step 1: 修改现有 E2E 为 RED**

`import-export.spec.ts` 的导出断言改为 `linkit-backup`，检查四类实体、Portable settings 及敏感字段缺失；增加备份导入后主题/语言/窗口大小/AI Base/Model 恢复，旧 `linkit-library` 不覆盖设置，取消和无效输入不改变数据。

Run:

```bash
pnpm --dir ui exec playwright test tests/e2e/import-export.spec.ts --workers=1
```

Expected: FAIL，旧实现仍导出 `linkit-library` 且不恢复设置。

- [ ] **Step 2: 修改 SettingsDialog**

导出调用 `buildBackupEnvelopeFromUi(library, settings, ...)`，文件名为 `linkit-backup-YYYY-MM-DD.json`。pending import 保存双格式解析结果；确认按钮异步调用新的 `onImport(snapshot)`，处理中禁用重复确认，失败显示稳定错误且保留对话框。

- [ ] **Step 3: 修改 ImportOverwriteDialog**

摘要明确显示四类实体以及“Settings included”或“Current settings will be kept”；中英文键完整。

- [ ] **Step 4: 修改 App**

`handleImport` 使用 `restoreBackupAtomically` 与严格持久化适配器；只有全部持久化成功后才更新 bookmarks/categories/collections/tags/settings/theme/lang/density。成功后关闭确认并展示导入数量。

- [ ] **Step 5: 运行组件和 E2E GREEN**

```bash
pnpm --dir ui exec vitest run src/features/import-export src/components/SettingsDialog.test.tsx
pnpm --dir ui exec playwright test tests/e2e/import-export.spec.ts --workers=1
```

Expected: PASS。

### Task 6: QA、视觉证据与 SDD 收尾

- [ ] **Step 1: 视觉回归**

新增 `ui/tests/visual/settings-backup.spec.ts`，固定 English/中文两种摘要状态；生成 Baseline、Actual、Diff，并使用 Playwright MCP 复核截图中无 API Key 或用户敏感内容。

```bash
pnpm --dir ui exec playwright test tests/visual/settings-backup.spec.ts --update-snapshots --workers=1
pnpm --dir ui exec playwright test tests/visual/settings-backup.spec.ts --workers=1
```

- [ ] **Step 2: 全量验证**

```bash
go test ./internal/platform ./internal/settingsstore -cover
pnpm --dir ui typecheck
pnpm --dir ui lint
pnpm --dir ui build
pnpm --dir ui exec vitest run src/features/import-export src/services/settings src/components/SettingsDialog.test.tsx
```

Expected: 全部 PASS、零 error。

- [ ] **Step 3: 更新证据和规格状态**

创建 `TASK-078-AC.md`、evidence、report；更新 `tasks.md`、`traceability.md`；把 `fix_task.md` 1.20、1.21 改为 `[X]`，并记录旧格式兼容和敏感字段排除结果。

- [ ] **Step 4: 提交并合并**

```bash
git add .
git commit -m "feat: add complete portable backups"
git checkout main
git merge --ff-only feat/TASK-078-portable-backup
```

