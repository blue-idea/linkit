# Linkit 接口设计（API）

> 文件路径：`docs/spec/api.md`  
> 版本：1.2.1  
> 日期：2026-07-20  
> 状态：已定稿

---

## 1. 接口范围

Linkit MVP 包含三类接口：

1. React 调用 Go 的 Wails v2 生成绑定。
2. React 通过 Supabase JS 调用 Auth 与 `user_bookmarks` PostgREST API。
3. Go 调用用户配置的 OpenAI-compatible API 和目标网页。

Linkit MVP 不提供面向公网的自建业务 HTTP Server。若后续增加 Edge Function 或自建 API，必须新增接口规格、认证、限流和安全测试任务。

---

## 2. 通用契约

### 2.1 AppError

所有 Go 绑定和前端 Repository 错误统一映射为：

```typescript
interface AppError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, string | number | boolean | null>;
}
```

约束：

- `message` 是可展示的英文错误信息。
- `code` 是稳定机器码，用于 i18n 和测试断言。
- `details` 不得包含 API Key、授权头、Supabase token、完整网页正文或内部堆栈。
- Go 方法通过返回 `error` 使 Wails Promise reject；前端适配层必须转换为 `AppError`，UI 不直接处理任意异常。

### 2.2 主要错误码

| code | 场景 | retryable |
|------|------|:---------:|
| `INVALID_ARGUMENT` | 输入字段、URL 或 DTO 无效 | 否 |
| `DOCUMENT_INVALID` | LibraryDocument 校验失败 | 否 |
| `LOCAL_READ_FAILED` | 本地文件读取失败 | 是 |
| `LOCAL_WRITE_FAILED` | 本地原子保存失败 | 是 |
| `RECOVERY_AVAILABLE` | 正式文件无效但存在有效备份 | 否 |
| `CLOUD_AUTH_REQUIRED` | 云操作缺少有效会话 | 否 |
| `CLOUD_REVISION_CONFLICT` | revision 不匹配 | 否 |
| `CLOUD_REQUEST_FAILED` | Supabase 网络或服务错误 | 是 |
| `SECRET_NOT_CONFIGURED` | AI Key 未配置 | 否 |
| `AI_UNAUTHORIZED` | AI 服务拒绝 Key | 否 |
| `AI_RATE_LIMITED` | AI 服务限流 | 是 |
| `AI_TIMEOUT` | AI 请求超时 | 是 |
| `AI_RESPONSE_INVALID` | AI 响应无法归一化 | 是 |
| `AI_CONSENT_REQUIRED` | 当前 API Base 尚未获得数据发送授权 | 否 |
| `WEB_FETCH_FAILED` | 页面抓取失败 | 是 |
| `HEALTH_SCAN_CANCELLED` | 用户取消健康扫描 | 否 |
| `DATA_ROOT_TARGET_OCCUPIED` | 目标目录已包含 Linkit 数据 | 否 |
| `DATA_ROOT_MIGRATE_FAILED` | 数据根迁移复制、校验或指针切换失败 | 是 |
| `DATA_ROOT_INVALID` | 目标路径无效或不可写 | 否 |

### 2.3 时间与 ID

- 所有时间使用 UTC ISO-8601 字符串。
- 所有持久化实体使用全局唯一 ID。
- 所有跨边界 JSON 使用 camelCase；PostgreSQL 列名使用 snake_case。

---

## 3. Wails Go 绑定

Wails 通过 `options.App.Bind` 暴露多个职责单一的 Service 实例，并在 `ui/wailsjs/` 生成 JavaScript/TypeScript 绑定。生成目录不得手工编辑。

### 3.1 LocalDocumentService

#### `ReadLibrary()`

```typescript
ReadLibrary(): Promise<LocalReadResult>

interface LocalReadResult {
  state: 'found' | 'empty' | 'recovery_available';
  documentJson?: string;
  recoveryJson?: string;
  fileUpdatedAt?: string;
  recoveryUpdatedAt?: string;
}
```

- `documentJson` 和 `recoveryJson` 进入 Store 前必须由 Zod 校验。
- Go 只确认 JSON 语法、大小与文件完整读取，不复制 TypeScript 领域校验规则。
- 无有效正式文件但备份有效时返回 `recovery_available`，不得静默恢复。

#### `WriteLibrary(request)`

```typescript
interface LocalWriteRequest {
  documentJson: string;
  expectedRevision: number;
}

interface SaveResult {
  revision: number;
  updatedAt: string;
}

WriteLibrary(request: LocalWriteRequest): Promise<SaveResult>
```

- Go 从 JSON 信封读取 revision；必须等于 `expectedRevision`。
- 成功保存时 revision 增加一，并使用更新后的完整 JSON 执行原子替换。
- 失败时不得破坏现有正式文件或有效备份。

#### `ReplaceLibrary(request)`

```typescript
interface LocalReplaceRequest {
  documentJson: string;
  confirmed: boolean;
}

ReplaceLibrary(request: LocalReplaceRequest): Promise<SaveResult>
```

仅用于已由 UI 完成破坏性确认的导入、恢复或存储覆盖流程；`confirmed` 为 false 时返回 `INVALID_ARGUMENT`。

#### `DescribeLocalLibrary()`

```typescript
interface StorageSummary {
  exists: boolean;
  revision: number | null;
  updatedAt: string | null;
  bookmarkCount: number | null;
  byteSize: number;
}

DescribeLocalLibrary(): Promise<StorageSummary>
```

摘要用于存储切换确认，不返回完整资料库。

#### `ReadCloudDraft()` / `WriteCloudDraft(request)` / `ClearCloudDraft()`

```typescript
interface CloudDraftReadResult {
  state: 'found' | 'empty';
  draftJson?: string;
}

interface CloudDraftWriteRequest {
  draftJson: string;
}
```

- `WriteCloudDraft` 使用原子替换保存 dirty 云草稿。
- `ReadCloudDraft` 返回值进入同步状态前必须经过 Zod 校验。
- `ClearCloudDraft` 仅在云保存成功、用户明确放弃草稿或已完成冲突处理后调用。

#### `GetDataRoot()`

```typescript
interface DataRootInfo {
  bootstrapRoot: string;
  dataRoot: string;
  isCustom: boolean;
}
```

返回引导根与当前有效数据根。路径字符串仅用于 UI 展示与确认；日志不得拼接完整用户主目录以外的敏感上下文。

#### `SelectDataRootDirectory()`

```typescript
interface SelectDirectoryResult {
  state: 'selected' | 'cancelled';
  path?: string;
}
```

打开原生文件夹选择对话框。取消时不改变数据根。

#### `MigrateDataRoot(request)`

```typescript
interface MigrateDataRootRequest {
  targetPath: string;
  confirmed: boolean;
  /** 可选：迁移前将当前资料库信封写入源根后再复制。 */
  libraryDocumentJson?: string;
  /** 可选：迁移前将当前设置写入源根后再复制。 */
  settingsJson?: string;
}

interface MigrateDataRootResult {
  dataRoot: string;
  migratedFiles: string[];
}
```

- `confirmed` 为 false 时返回 `INVALID_ARGUMENT`，不写盘。
- 若提供 `libraryDocumentJson` / `settingsJson`，迁移前先写入源数据根，确保内存态/浏览器态数据也会落到目标。
- 源与快照均无任何可迁移文件时返回 `DATA_ROOT_MIGRATE_FAILED`，不得报告成功。
- 目标已含 Linkit 数据时返回 `DATA_ROOT_TARGET_OCCUPIED`。
- 成功后更新引导根 `data-root.json`，删除源中已迁文件，后续读写使用新数据根。
- 失败时返回 `DATA_ROOT_MIGRATE_FAILED` 或 `DATA_ROOT_INVALID`，保持原根，清理目标残留。
- 不迁移 OS Keychain 密钥。

### 3.2 NativeFileService

#### `ExportLibrary(request)`

```typescript
interface ExportRequest {
  suggestedFileName: string;
  documentJson: string;
}

interface ExportResult {
  state: 'saved' | 'cancelled';
  path?: string;
}

ExportLibrary(request: ExportRequest): Promise<ExportResult>
```

使用原生保存对话框。日志不得记录完整资料库内容。

#### `SelectImportFile()`

```typescript
interface ImportFileResult {
  state: 'selected' | 'cancelled';
  fileName?: string;
  byteSize?: number;
  documentJson?: string;
}

SelectImportFile(): Promise<ImportFileResult>
```

- 仅允许选择 JSON 文件。
- Go 执行大小上限与 UTF-8/JSON 语法检查。
- TypeScript 使用 Zod 验证 Schema 并生成导入摘要。

### 3.3 SettingsService

#### `ReadSettings()` / `WriteSettings(request)`

```typescript
interface SettingsReadResult {
  state: 'found' | 'default';
  settingsJson: string;
}

interface SettingsWriteRequest {
  settingsJson: string;
}
```

- 设置写入 `settings.json`，不得包含 AI API Key。
- API Base 改变时，Service 必须清除不再匹配的 AI 授权。
- 前端读取后使用 Zod 校验；无有效设置时返回正式默认值。

#### `GetAIConsentStatus(apiBase)` / `GrantAIConsent(apiBase)`

```typescript
interface AIConsentStatus {
  granted: boolean;
  grantedAt: string | null;
}
```

- API Base 在比较前执行统一规范化。
- `GrantAIConsent` 仅在前端已展示说明并收到明确确认后调用。
- Go AIService 在每次发送收藏内容前再次检查授权，不能只依赖 UI 状态。

### 3.4 SecretService

OS Keychain / Credential Manager 服务名由构建身份决定：正式为 `Linkit`，开发（`-tags dev`）为 `Linkit-Dev`。逻辑键 `linkit.ai.api-key` 跨身份保持不变，仅通过服务名隔离通道。

#### `SetAIKey(request)`

```typescript
interface SetSecretRequest {
  value: string;
}

SetAIKey(request: SetSecretRequest): Promise<void>
```

- 空值不得写入；删除使用独立方法。
- Key 只写入 OS Keychain，不写文件。

#### `DeleteAIKey()`

```typescript
DeleteAIKey(): Promise<void>
```

#### `GetAIKeyStatus()`

```typescript
interface SecretStatus {
  configured: boolean;
}

GetAIKeyStatus(): Promise<SecretStatus>
```

不存在返回 Key 明文的绑定方法。

### 3.5 MetadataService

#### `FetchMetadata(request)`

```typescript
interface MetadataRequest {
  url: string;
}

interface MetadataResult {
  finalUrl: string;
  title: string;
  description: string;
  domain: string;
  faviconUrl: string | null;
  contentText: string;
  contentFingerprint: string;
}

FetchMetadata(request: MetadataRequest): Promise<MetadataResult>
```

约束：

- 仅允许 HTTP(S)。
- 重定向、响应时间、响应体大小由 `config/network.go` 限制。
- `contentText` 是清洗和截断后的纯文本，不包含脚本。
- 不生成真实网页截图。

### 3.6 AIService

所有方法共用：

```typescript
interface AIContext {
  apiBase: string;
  model: string;
  locale: 'en' | 'zh';
}
```

API Key 由 Go 从 Keychain 获取，前端请求中不传 Key。

每个会发送收藏内容的方法在发起网络请求前必须验证当前 `AIContext.apiBase` 已获得授权；未授权时返回 `AI_CONSENT_REQUIRED`，且不得建立外部请求。

#### `AnalyzeBookmark(request)`

```typescript
interface AnalyzeBookmarkRequest {
  context: AIContext;
  url: string;
  title: string;
  contentText: string;
  categoryCandidates: Array<{ id: string; name: string }>;
  tagCandidates: Array<{ id: string; label: string }>;
}

interface AnalyzeBookmarkResult {
  summary: string;
  suggestedCategoryId: string | null;
  suggestedTags: string[];
}

AnalyzeBookmark(request: AnalyzeBookmarkRequest): Promise<AnalyzeBookmarkResult>
```

返回分类 ID 必须属于候选集合；建议标签是文本，用户采纳时再映射或创建 Tag。

#### `RerankSemanticSearch(request)`

```typescript
interface SemanticCandidate {
  id: string;
  title: string;
  domain: string;
  description: string;
  notesExcerpt: string;
  tagLabels: string[];
}

interface SemanticSearchRequest {
  context: AIContext;
  query: string;
  candidates: SemanticCandidate[];
}

interface SemanticSearchResult {
  results: Array<{ bookmarkId: string; score: number; reason: string }>;
}

RerankSemanticSearch(request: SemanticSearchRequest): Promise<SemanticSearchResult>
```

- 候选数量受配置上限约束。
- 结果 ID 必须属于输入候选，score 归一化到 0 至 1。
- AI 失败时由前端回退关键词结果。

#### `ReanalyzeBookmark(request)`

契约与 `AnalyzeBookmark` 相同，但不得直接修改已保存书签；返回预览结果。

#### `GenerateCollection(request)`

```typescript
interface GenerateCollectionRequest {
  context: AIContext;
  goal: string;
  candidates: SemanticCandidate[];
}

interface GenerateCollectionResult {
  name: string;
  description: string;
  suggestedTags: string[];
  bookmarkIds: string[];
}

GenerateCollection(request: GenerateCollectionRequest): Promise<GenerateCollectionResult>
```

返回 ID 只能来自当前库候选；前端确认前不得写入资料库。

#### `SuggestDuplicates(request)`

```typescript
interface DuplicateRequest {
  context: AIContext;
  candidates: SemanticCandidate[];
}

interface DuplicatePair {
  leftId: string;
  rightId: string;
  confidence: number;
  matchingReasons: string[];
}

SuggestDuplicates(request: DuplicateRequest): Promise<DuplicatePair[]>
```

该方法仅返回建议，永不执行合并或删除。

### 3.7 HealthService

#### `StartScan(request)`

```typescript
interface HealthTarget {
  bookmarkId: string;
  url: string;
  previousFingerprint: string | null;
}

interface StartHealthScanRequest {
  scanId: string;
  targets: HealthTarget[];
}

StartScan(request: StartHealthScanRequest): Promise<void>
```

启动后通过 Wails event 报告进度：

```typescript
interface HealthScanProgressEvent {
  scanId: string;
  completed: number;
  total: number;
  result?: {
    bookmarkId: string;
    health: 'ok' | 'changed' | 'broken';
    httpStatus: number | null;
    checkedAt: string;
    fingerprint: string | null;
    errorCode: string | null;
  };
}
```

事件名固定为 `linkit:health-scan-progress`，集中定义在前后端 `config/`。

#### `CancelScan(scanId)`

```typescript
CancelScan(scanId: string): Promise<void>
```

取消后发送最终事件，状态为 cancelled；已完成结果可由用户确认后写入资料库，未完成目标不得伪造结果。

### 3.8 SystemService

#### `OpenExternalURL(url)`

```typescript
OpenExternalURL(url: string): Promise<void>
```

仅允许 HTTP(S)，使用系统默认浏览器。调用成功后前端才更新访问计数；调用失败不得增加计数。

---

## 4. Supabase 接口

### 4.1 客户端初始化

```typescript
createClient<Database>(supabaseUrl, supabasePublishableKey)
```

- URL 与 publishable key 来自构建环境变量。
- 禁止使用 Service Role Key。
- 必须使用生成的 `Database` 类型，并为 `data` JSONB 覆盖为 `LibraryData` 对应 Json 类型。

### 4.2 Auth

使用 Supabase JS 官方方法：

| 行为 | 方法 |
|------|------|
| 注册 | `auth.signUp({ email, password })` |
| 登录 | `auth.signInWithPassword({ email, password })` |
| 会话恢复 | `auth.getSession()` + `onAuthStateChange` |
| 退出 | `auth.signOut()` |

所有错误由 `AuthRepository` 映射为稳定 `AppError`，UI 不直接展示第三方原始对象。

`signUp` 返回有效 session 时进入主界面；返回成功但 session 为 null 时显示 `Check your email` 并保持认证界面，不得自行构造登录状态。

### 4.3 CloudRepository.load

```typescript
interface CloudSnapshot {
  envelope: LibraryEnvelope;
}
```

查询：

```text
from('user_bookmarks')
  .select('user_id,data,schema_version,revision,updated_at')
  .eq('user_id', userId)
  .maybeSingle()
```

返回 `user_id` 必须等于当前 session 用户；JSONB 必须通过 Zod 校验并与 `schema_version` 一致。Repository 将数据库列组装为唯一的 `LibraryEnvelope`，不得在 Snapshot 中重复维护 revision 或 updatedAt。RLS 是授权边界，`.eq('user_id')` 仅用于查询明确性和性能，不替代 RLS。

### 4.4 CloudRepository.create

仅在当前用户不存在云行时执行：

```text
insert({
  user_id: userId,
  data,
  schema_version: schemaVersion,
  revision: 0
}).select('revision,updated_at').single()
```

唯一约束冲突必须重新 load 并进入正常 revision 流程，不得盲目覆盖。

### 4.5 CloudRepository.save

```text
from('user_bookmarks')
  .update({
    data,
    schema_version: schemaVersion,
    revision: expectedRevision + 1
  })
  .eq('user_id', userId)
  .eq('revision', expectedRevision)
  .select('revision,updated_at')
```

结果映射：

| 条件 | 结果 |
|------|------|
| 返回一行 | `SaveSuccess` |
| 返回零行且无网络错误 | `CLOUD_REVISION_CONFLICT` |
| Supabase error | `CLOUD_REQUEST_FAILED` 或认证错误 |

### 4.6 CloudRepository.forceReplace

仅在用户确认 `Overwrite Cloud` 后：

1. 重新 load 最新云 revision。
2. 使用最新 revision 调用正常 save。
3. 若再次冲突，保持对话框并要求重新选择，不无限重试。

### 4.7 RLS 契约

- SELECT：仅返回 `(select auth.uid()) = user_id` 的行。
- INSERT：`with check` 要求 user_id 等于认证用户。
- UPDATE：`using` 和 `with check` 均要求 user_id 等于认证用户。
- DELETE：仅允许删除本人行。
- 未认证 SELECT 可返回 Supabase 原生 HTTP 200 空数组，但不得获得任何用户数据。
- 未认证 INSERT、UPDATE、DELETE 必须被权限或 RLS 拒绝，允许 HTTP 401 或 403。

---

## 5. OpenAI-compatible 接口

### 5.1 Endpoint

默认调用：

```text
POST {apiBase}/chat/completions
Authorization: Bearer {key}
Content-Type: application/json
```

如果用户 API Base 已包含 `/v1`，不得重复拼接。URL 拼装由 Go 适配器集中处理。

### 5.2 请求约束

- 使用用户配置的 `model`。
- 使用 system + user 消息要求返回严格 JSON。
- 设置超时、最大响应大小和有限重试。
- 只对网络错误、HTTP 429 和部分 5xx 执行带抖动退避的有限重试。
- 401/403 不重试，映射为 `AI_UNAUTHORIZED`。
- 不把完整资料库发送给 AI；仅发送完成当前能力所需的候选和字段。

### 5.3 响应约束

- HTTP 成功不等同于业务成功；必须提取 message content 并执行 JSON Schema/Zod 等价校验。
- AI 返回未知 ID、重复 ID、非有限 score 或超长字段时拒绝响应。
- 任何失败不得自动写入资料库。

### 5.4 降级

| 能力 | 降级行为 |
|------|----------|
| 入库分析 | 保留手动表单 |
| 语义搜索 | 使用关键词结果 |
| 重新分析 | 保留旧摘要与标签 |
| AI 创建主题 | 保留手动创建流程 |
| 去重建议 | 不显示未经验证的建议 |

---

## 6. 网页请求接口约束

MetadataService 和 HealthService 共用受限 HTTP Client：

| 项目 | 设计要求 |
|------|----------|
| 协议 | 仅 HTTP(S) |
| 重定向 | 有限次数，每次重新验证协议 |
| 超时 | 连接、响应头和总请求分别配置 |
| 响应大小 | 达到配置上限立即停止读取 |
| User-Agent | 使用明确 Linkit 版本标识 |
| HTML | 不执行 JavaScript，只解析静态内容 |
| 凭据 | 不发送 Supabase token、AI Key 或本地 Cookie |
| 日志 | 记录域名、耗时和错误码，不记录查询中的敏感值 |

健康分类基线：

| 条件 | health |
|------|--------|
| 请求成功且指纹未变化 | `ok` |
| 请求成功且指纹相对上次变化 | `changed` |
| DNS、连接、TLS、超时、不可达或明确失效状态 | `broken` |

重定向后的有效页面仍可为 `ok` 或 `changed`，并记录最终 URL 供用户查看；不得静默改写书签原 URL。

---

## 7. 事件接口

| 事件名 | 发送方 | 订阅方 | 用途 |
|--------|--------|--------|------|
| `linkit:health-scan-progress` | Go HealthService | React healthSlice | 单项结果和总体进度 |
| `linkit:health-scan-finished` | Go HealthService | React healthSlice | completed/cancelled/failed 最终状态 |
| `linkit:ai-progress` | Go AIService | React 对应 feature | 可选的流式或阶段进度，不代表业务成功 |

事件 payload 必须包含操作 ID，前端忽略与当前操作 ID 不匹配的过期事件。组件卸载或操作结束时必须取消订阅。

---

## 8. 前端 Repository 契约

```typescript
interface LibraryRepository {
  load(): Promise<RepositoryLoadResult>;
  save(document: LibraryEnvelope, expectedRevision: number): Promise<SaveResult>;
  replace(document: LibraryEnvelope): Promise<SaveResult>;
  describe(): Promise<StorageSummary>;
}

type RepositoryLoadResult =
  | { state: 'empty' }
  | { state: 'found'; snapshot: LibrarySnapshot }
  | { state: 'recovery_available'; recovery: LibrarySnapshot };

interface LibrarySnapshot {
  source: 'local' | 'cloud';
  envelope: LibraryEnvelope;
}
```

`StorageCoordinator` 只依赖此接口，测试中使用内存实现验证切换、冲突和失败路径。测试替身不得模拟不存在的生产能力。

---

## 9. 接口安全检查

- Wails 绑定只暴露白名单 Service，不绑定包含内部依赖或密钥的根对象。
- 所有 Go 导出方法在执行前验证参数。
- 前端对 Wails、Supabase、导入文件和 AI 的所有返回执行运行时校验。
- 错误消息使用英文；中文 UI 通过稳定错误码查找翻译。
- 任何接口失败均不得返回伪成功或部分写入已完成的错误状态。
- Supabase RLS 与云 revision 必须在本地 Supabase 或可访问远程项目中真实测试。

---

## 10. 远程验证状态

当前 `.env` 中的 Supabase 项目无法通过 MCP 读取表结构，错误为无权限。因此以下项目为 `BLOCKED`：

- 远程 `user_bookmarks` 实际列和约束。
- 远程 RLS 策略与权限。
- 远程 trigger 和 migration 历史。

本文接口以仓库 migration 和 Supabase 官方文档为依据。解除阻塞前不得声称远程接口或 RLS 已验证通过。

---

## 11. 修订记录

| 版本 | 日期 | 状态 | 说明 |
|------|------|------|------|
| 0.1.0 | 2026-07-16 | 草稿 | 定义 Wails、Supabase、OpenAI-compatible、网页请求与 Repository 接口 |
| 1.0.0 | 2026-07-16 | 已定稿 | 经用户确认后正式生效 |
| 1.1.0 | 2026-07-16 | 已定稿 | STEP 4 修正 Snapshot revision 重复、补充设置/云草稿接口、注册分支、AI 授权和原生 RLS 响应 |
| 1.2.0 | 2026-07-19 | 已定稿 | 新增数据根查询、目录选择与迁移接口及错误码，覆盖 REQ-029 |
| 1.2.1 | 2026-07-20 | 已定稿 | SecretService 补充开发/正式 Keychain 服务名隔离说明，对齐 REQ-025-AC-006 |
