# Linkit 数据设计（Data）

> 文件路径：`docs/spec/data.md`  
> 版本：1.3.0
> 日期：2026-07-19  
> 状态：已定稿

---

## 1. 设计原则

- 本地、云端和导入导出共用同一份版本化 `LibraryDocument`。
- 云端保持“一名用户一行 JSONB”的 MVP 模型，不拆分关系表。
- AI API Key 永不进入资料库文档、云端、导出文件或日志。
- 所有未知 JSON 必须通过 Zod 4 Schema 校验后才能进入 Zustand Store。
- 所有实体引用必须有效；分类树不得成环；主题成员关系必须双向一致。
- 所有破坏性迁移必须先保留可恢复备份。

---

## 2. 数据容器

### 2.1 LibraryEnvelope

本地文件加载和 Repository 返回使用统一信封：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `format` | string | 固定 `linkit-library` | 防止误导入其他 JSON |
| `schemaVersion` | integer | `>= 1` | 文档结构版本 |
| `revision` | integer | `>= 0` | 本地或云端乐观锁版本 |
| `updatedAt` | ISO-8601 string | 必填 | 最后成功保存时间 |
| `data` | LibraryData | 必填 | 领域资料库 |

示例：

```json
{
  "format": "linkit-library",
  "schemaVersion": 1,
  "revision": 12,
  "updatedAt": "2026-07-16T12:00:00.000Z",
  "data": {
    "bookmarks": [],
    "categories": [],
    "collections": [],
    "tags": []
  }
}
```

### 2.2 LibraryData

| 字段 | 类型 | 约束 |
|------|------|------|
| `bookmarks` | Bookmark[] | ID 唯一 |
| `categories` | Category[] | ID 唯一、parentId 无环 |
| `collections` | Collection[] | ID 唯一、成员引用有效 |
| `tags` | Tag[] | ID 唯一 |

数组是持久化格式，不承担 UI 排序语义。排序和筛选由纯函数根据字段计算，不依赖数组当前顺序。

---

## 3. 核心实体

### 3.1 Bookmark

| 字段 | 类型 | 必填 | 约束与说明 |
|------|------|:---:|------------|
| `id` | string | 是 | UUID 或兼容的全局唯一 ID |
| `title` | string | 是 | trim 后非空 |
| `url` | string | 是 | 仅 `http`/`https`，规范化后保存 |
| `domain` | string | 是 | 从规范化 URL 推导 |
| `favicon` | string/null | 否 | URL 或空值 |
| `description` | string | 是 | 可为空字符串 |
| `notes` | string | 是 | 可为空字符串 |
| `tagIds` | string[] | 是 | 去重，必须引用现有 Tag |
| `categoryId` | string/null | 是 | 引用现有 Category 或未分类 |
| `collectionIds` | string[] | 是 | 去重，必须引用现有 Collection |
| `createdAt` | ISO-8601 string | 是 | 创建后不可静默改变 |
| `updatedAt` | ISO-8601 string | 是 | 任意持久化修改后更新 |
| `lastVisitedAt` | ISO-8601 string/null | 是 | 未访问为 null |
| `visitCount` | integer | 是 | `>= 0` |
| `starred` | boolean | 是 | 星标状态 |
| `pinned` | boolean | 是 | 置顶状态 |
| `readStatus` | enum | 是 | `unread`、`reading`、`read`、`archived` |
| `health` | enum | 是 | `ok`、`changed`、`broken` |
| `healthCheckedAt` | ISO-8601 string/null | 是 | 最近手动扫描时间 |
| `healthHttpStatus` | integer/null | 是 | 最近响应状态码 |
| `healthFingerprint` | string/null | 是 | 可比较内容的摘要，不保存完整网页 |
| `healthErrorCode` | string/null | 是 | 归一化错误码，不含敏感信息 |
| `aiSummary` | string | 是 | 已确认或成功分析的摘要 |
| `aiSuggestedTags` | string[] | 是 | 尚未采纳的文本建议，去重 |
| `thumbnail` | string/null | 是 | 渐变或占位预览键，不是真实截图 |

现有原型中的 `tags` 字段在正式 Schema 中重命名为 `tagIds`，避免与 Tag 实体数组混淆。旧数据通过版本迁移转换。

### 3.2 Tag

| 字段 | 类型 | 必填 | 约束与说明 |
|------|------|:---:|------------|
| `id` | string | 是 | 唯一 ID |
| `label` | string | 是 | trim 后非空；同一资料库中按规范化标签去重 |
| `color` | string | 是 | 受控颜色 token，不保存任意脚本或样式 |

标签删除时必须同步移除所有 Bookmark.tagIds 引用。

### 3.3 Category

| 字段 | 类型 | 必填 | 约束与说明 |
|------|------|:---:|------------|
| `id` | string | 是 | 唯一 ID |
| `name` | string | 是 | trim 后非空 |
| `icon` | string | 是 | 受控图标名称 |
| `parentId` | string/null | 是 | 引用现有 Category；不得引用自身或后代 |
| `color` | string/null | 是 | 受控颜色 token |

分类计数为派生数据，不持久化。递归删除分类树时，受影响书签的 `categoryId` 设为 null；移动内容后删除时，子分类和直属书签移动到被删分类的父级。

### 3.4 Collection

| 字段 | 类型 | 必填 | 约束与说明 |
|------|------|:---:|------------|
| `id` | string | 是 | 唯一 ID |
| `name` | string | 是 | trim 后非空 |
| `emoji` | string | 是 | 单个可显示 emoji 或受控默认值 |
| `color` | string | 是 | 受控颜色 token |
| `description` | string | 是 | 可为空字符串 |
| `bookmarkIds` | string[] | 是 | 去重，必须引用现有 Bookmark |
| `createdAt` | ISO-8601 string | 是 | 创建时间 |
| `updatedAt` | ISO-8601 string | 是 | 修改时间 |

`Collection.bookmarkIds` 与 `Bookmark.collectionIds` 必须在同一领域命令中同步更新。校验器发现不一致时不得静默选择一侧作为权威，应返回结构化错误或执行显式迁移修复。

---

## 4. 非领域数据

### 4.1 AppSettings

保存在本机 `settings.json`，不包含资料库实体和密钥。

| 字段 | 类型 | 约束 |
|------|------|------|
| `settingsVersion` | integer | `>= 1` |
| `storageMode` | enum | `local`、`cloud` |
| `theme` | enum | `midnight`、`ocean`、`graphite`、`sunset`、`daylight`、`paper`；新增值向后兼容，默认仍为 `midnight` |
| `locale` | enum | `en`、`zh`；默认 `en` |
| `ai.apiBase` | string | HTTPS；loopback 可使用 HTTP |
| `ai.model` | string | trim 后非空或未配置 |
| `aiConsent` | object/null | `{ apiBase, grantedAt }`；仅对完全匹配的 API Base 有效 |
| `view.defaultMode` | enum | Card/List/Masonry/Timeline/Tag Aggregation/Theme Space |
| `lastCloudRevision` | integer/null | 最近成功加载或保存的云版本 |

### 4.2 SecretStore

AI Key 使用逻辑键保存到 OS Keychain：

| 键 | 值 | 前端可见性 |
|----|----|------------|
| `linkit.ai.api-key` | 用户 AI API Key | 仅返回是否已配置，不返回明文 |

### 4.3 UIState

选择项、筛选器、展开节点、对话框、同步进度和临时草稿属于运行时 UIState，默认不进入 LibraryDocument。确需跨重启保留的非敏感偏好必须提升到 AppSettings，而不是直接持久化整个 Zustand Store。

---

## 5. 本地文件设计

### 5.1 路径

应用使用两层目录：

| 角色 | 位置 | 内容 |
|------|------|------|
| 引导根（bootstrap root） | 平台默认 AppData/`Linkit`（开发构建为 `Linkit-Dev`） | 仅 `data-root.json` |
| 有效数据根（data root） | 默认等于引导根，或由 `data-root.json.dataRoot` 重定向 | 资料库、设置、云草稿及其备份/临时文件 |

身份槽由 Go build tag 决定：无 `dev` tag 为正式身份 `Linkit`；`-tags dev` 为开发身份 `Linkit-Dev`。OS Keychain 服务名与对应目录名一致，避免开发数据污染正式安装验证。

| 文件 | 所在根 | 用途 |
|------|--------|------|
| `data-root.json` | 引导根 | 持久化有效数据根绝对路径 |
| `library.json` | 有效数据根 | 当前 LibraryEnvelope |
| `library.json.bak` | 有效数据根 | 上一次有效正式版本 |
| `library.json.tmp` | 有效数据根 | 原子写入中间文件 |
| `cloud-draft.json` | 有效数据根 | 云模式下最新未确认同步状态 |
| `settings.json` | 有效数据根 | AppSettings |
| `settings.json.bak` / `settings.json.tmp` | 有效数据根 | 设置备份与原子写入中间文件 |

引导根路径由 Wails/Go 平台 API 获取，不硬编码用户目录。有效数据根不得指向安装目录或应用工作目录。

### 5.1.1 data-root.json

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `format` | string | 固定 `linkit-data-root` | 防止误读其他 JSON |
| `schemaVersion` | integer | `>= 1` | 引导文件版本 |
| `dataRoot` | string | 绝对路径 | 有效数据根；等于引导根表示未重定向 |
| `updatedAt` | ISO-8601 string | 必填 | 最近一次成功切换时间 |

约束：

- `data-root.json` 不得迁移到用户自定义数据根。
- 路径变更前必须二次确认；目标已包含 Linkit 数据文件时阻止迁移。
- 迁移失败不得更新 `dataRoot`，并清理目标残留。
- AI API Key 等密钥不进入任何本地 JSON 文件，也不参与目录迁移。

### 5.2 原子保存流程

1. 前端将已通过 Zod 校验的 LibraryEnvelope 序列化后提交 Go。
2. Go 校验 JSON 可解析、文件大小未超过配置上限。
3. 写入 `library.json.tmp` 并同步刷新。
4. 当前 `library.json` 存在时，将其安全替换为 `library.json.bak`。
5. 原子重命名临时文件为 `library.json`。
6. 返回新 revision 与更新时间。
7. 任一步骤失败时删除不完整临时文件并保留上一次正式文件与备份。

### 5.3 云草稿

云模式下，领域状态修改后先写入本机 `cloud-draft.json`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `format` | string | 固定 `linkit-cloud-draft` |
| `schemaVersion` | integer | 文档 Schema 版本 |
| `baseRevision` | integer | 编辑开始时对应的云 revision |
| `dirty` | boolean | 是否存在尚未成功同步的更改 |
| `updatedAt` | ISO-8601 string | 草稿更新时间 |
| `data` | LibraryData | 最新本机草稿 |

- 云保存成功后删除草稿或将 `dirty` 设为 false。
- 云保存失败、应用异常退出或 revision 冲突时保留 dirty 草稿。
- 下次进入云模式时，如果 dirty 草稿存在且与云 revision 不一致，必须进入恢复或冲突流程，不得静默覆盖任一侧。
- `cloud-draft.json` 不等同于本地模式的 `library.json`，存储切换摘要必须分别展示。

### 5.4 加载与恢复

- 优先读取并验证 `library.json`。
- 正式文件无效时验证 `.bak`，但不得静默恢复；返回 `RecoveryAvailable` 供 UI 确认。
- 正式文件与备份均无效时返回结构化错误，不自动写入种子数据覆盖用户文件。
- 云模式启动时同时检查 dirty 云草稿；存在未同步更改时，在加载云数据后显示恢复或冲突提示。

---

## 6. 云端 PostgreSQL 设计

### 6.1 表：public.user_bookmarks

| 列 | PostgreSQL 类型 | 约束 | 说明 |
|----|-----------------|------|------|
| `id` | uuid | PK，默认 `gen_random_uuid()` | 内部行 ID |
| `user_id` | uuid | NOT NULL、UNIQUE、FK `auth.users(id)` ON DELETE CASCADE | 一名用户一行 |
| `data` | jsonb | NOT NULL | LibraryData，不含 AI Key |
| `schema_version` | integer | NOT NULL，默认 1，CHECK `>= 1` | JSONB Schema 版本 |
| `revision` | bigint | NOT NULL，默认 0，CHECK `>= 0` | 乐观锁版本 |
| `updated_at` | timestamptz | NOT NULL，默认 now() | 触发器维护 |

`UNIQUE(user_id)` 同时为所有权查找和 RLS 条件提供索引；不得在云端保存 AppSettings 中的 AI API Key。

### 6.2 目标 DDL 增量

```sql
alter table public.user_bookmarks
  add column if not exists schema_version integer not null default 1,
  add column if not exists revision bigint not null default 0;

alter table public.user_bookmarks
  add constraint user_bookmarks_schema_version_check
    check (schema_version >= 1),
  add constraint user_bookmarks_revision_check
    check (revision >= 0);
```

实际 migration 必须处理约束已存在的幂等性，不能直接重复执行上述示意 SQL。

### 6.3 RLS

必须对 SELECT、INSERT、UPDATE、DELETE 分别建立策略，并显式限定 `authenticated`：

```sql
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
```

INSERT 使用等价 `with check`；UPDATE 同时使用 `using` 与 `with check`。未认证 SELECT 可采用 Supabase 原生 RLS 的 HTTP 200 空数组行为；INSERT、UPDATE、DELETE 必须被权限或 RLS 拒绝。不得在客户端使用 Service Role Key。

权限基线：

```sql
grant select on public.user_bookmarks to anon;
revoke insert, update, delete on public.user_bookmarks from anon;
grant select, insert, update, delete on public.user_bookmarks to authenticated;
```

`anon` 具有 SELECT 表权限但没有匹配策略，因此读取结果为空；写权限被显式撤销。RLS 仍是登录用户之间的数据隔离边界。

### 6.4 乐观锁保存

普通保存使用 `user_id` 和客户端 `expectedRevision` 作为过滤条件：

```text
UPDATE user_bookmarks
SET data = :data,
    schema_version = :schemaVersion,
    revision = :expectedRevision + 1
WHERE user_id = auth.uid()
  AND revision = :expectedRevision
RETURNING revision, updated_at
```

Supabase JS 等价调用应使用 `.update({ data, schema_version: schemaVersion, revision: expectedRevision + 1 }).eq('user_id', userId).eq('revision', expectedRevision).select('revision,updated_at')`。返回零行且无传输错误时映射为 `CLOUD_REVISION_CONFLICT`。

初次保存仅在用户行不存在时 INSERT；不得使用无 revision 条件的 upsert 覆盖现有行。用户明确选择 `Overwrite Cloud` 后，客户端重新读取最新 revision，再执行一次带最新 revision 条件的覆盖。

### 6.5 远程验证状态

- 本地：Supabase CLI 已初始化（`supabase/`），`db reset` + pgTAP/API RLS 测试在 TASK-026 通过。
- 远程：MCP 已创建可访问项目 `linkit`（ref `zheqhjsctvkuzmtohrnm`，`ap-southeast-1`），已应用 `user_bookmarks` migration 与双用户 seed。
- TASK-030 仍负责完整远程 Auth/冲突旅程验收；客户端 `.env` 需指向该项目的 publishable key（勿提交密钥）。

---

## 7. 导入导出格式

### 7.1 导出

导出文件使用完整 LibraryEnvelope，并额外包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| `exportedAt` | ISO-8601 string | 导出时间 |
| `appVersion` | string | 生成文件的 Linkit 版本 |

导出不得包含 AppSettings、AI API Key、Supabase session 或日志。

### 7.2 导入

1. 读取文件为未知 JSON。
2. 检查 `format` 与 `schemaVersion`。
3. 使用对应版本 Zod Schema `safeParse`。
4. 旧版本按顺序执行纯迁移函数，禁止跳版本。
5. 对最终文档执行引用完整性和分类无环校验。
6. 显示导入摘要与覆盖确认。
7. 用户确认后调用活动 Repository 保存。

---

## 8. Schema 版本与迁移

### 8.1 版本规则

- `schemaVersion` 只增不减。
- 每个已发布版本保留只读 Zod Schema。
- 迁移函数命名为 `migrateV1ToV2`，输入旧版本类型，输出下一版本类型。
- 迁移失败不得部分覆盖当前资料库。

### 8.2 V1 迁移基线

现有原型数据进入 V1 时至少执行：

- `Bookmark.tags` 重命名为 `tagIds`。
- 补齐 `updatedAt`、`readStatus`、健康元数据字段。
- 为 Collection 补齐 `createdAt`、`updatedAt`。
- 去除重复 ID 和重复关系前先生成验证报告；不得静默删除语义冲突数据。
- 校正 Collection.bookmarkIds 与 Bookmark.collectionIds 的双向一致性。

---

## 9. 数据不变量

| ID | 不变量 |
|----|--------|
| DATA-INV-001 | 所有实体 ID 在同类集合内唯一 |
| DATA-INV-002 | Bookmark.categoryId 为 null 或引用现有 Category |
| DATA-INV-003 | Bookmark.tagIds 仅引用现有 Tag 且无重复 |
| DATA-INV-004 | Category.parentId 不得形成自引用或环 |
| DATA-INV-005 | Collection.bookmarkIds 与 Bookmark.collectionIds 双向一致 |
| DATA-INV-006 | readStatus 与 health 只能使用已定义枚举 |
| DATA-INV-007 | revision 单调递增，普通保存必须匹配 expectedRevision |
| DATA-INV-008 | LibraryDocument、导出文件和云数据不得包含 AI API Key |
| DATA-INV-009 | 失败的导入、迁移或保存不得改变最后一次有效持久化状态 |
| DATA-INV-010 | AI 授权仅对记录时的规范化 API Base 有效，地址改变后视为未授权 |
| DATA-INV-011 | dirty 云草稿在云保存成功或用户明确放弃前不得静默删除 |
| DATA-INV-012 | 有效数据根由引导根 `data-root.json` 解析；指针文件不得随资料库迁移离开默认 AppData |
| DATA-INV-013 | 更改数据根必须先确认；目标已占用或迁移失败时不得更新指针、不得破坏源数据 |

---

## 10. 数据量与演进触发条件

MVP 不预先拆分 JSONB。若真实测量出现以下任一情况，必须回退 STEP 3 评估 SQLite、分片文档或关系表，而不是在实现中临时绕过：

- 单个序列化资料库达到配置的安全上限。
- 防抖整库保存持续无法满足交互或网络预算。
- 冲突频率使单文档乐观锁不可接受。
- 需要服务端查询、聚合或局部同步单个实体。
- 需要 embeddings/pgvector 等服务端检索能力。

具体性能预算在 STEP 5 测试策略中定义。

---

## 11. 修订记录

| 版本 | 日期 | 状态 | 说明 |
|------|------|------|------|
| 0.1.0 | 2026-07-16 | 草稿 | 定义版本化 JSON 文档、本地原子存储、Supabase JSONB、RLS 与 revision 乐观锁 |
| 1.0.0 | 2026-07-16 | 已定稿 | 经用户确认后正式生效 |
| 1.1.0 | 2026-07-16 | 已定稿 | STEP 4 补充 AI 授权状态、云未同步草稿和 Supabase 原生未认证响应 |
| 1.2.0 | 2026-07-19 | 已定稿 | 扩展 AppSettings.theme 枚举以支持 Daylight 与 Paper；设置版本和持久化结构不变 |
| 1.3.0 | 2026-07-19 | 已定稿 | 新增引导根 / 有效数据根与 `data-root.json`；定义目录迁移约束 |
| 1.3.1 | 2026-07-20 | 已定稿 | 补充开发身份 `Linkit-Dev` 与正式身份 `Linkit` 的本地数据/密钥槽隔离说明 |
