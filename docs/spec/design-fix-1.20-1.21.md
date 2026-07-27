# fix_task 1.20/1.21 设计说明

> 状态：已获用户确认，待实现
> 日期：2026-07-27
> 关联任务：TASK-077、TASK-078

## 1. 目标与边界

本次变更包含两个相互独立但共享 Settings UI 与 Wails AI Service 的能力：

1. 在 Settings → AI 中测试当前已配置的 OpenAI-compatible 接口，并展示实际往返耗时。
2. 在 Settings → General 中导出和导入完整的可移植备份，包含全部 LibraryData 与非敏感用户设置。

不改变 LibraryData 的实体模型、Supabase 表结构或 AI API Key 的 OS Keychain 存储方式。

## 2. 方案决策

### 2.1 AI 接口测试

新增 `AIService.TestConnection` Wails 方法。Go 客户端复用既有 URL 规范化、Keychain 读取、HTTP 超时和错误映射，但使用独立的连接测试路径：

- API Base、Model、Key 任一为空时在 Service 层拒绝请求；UI 不调用 Wails 方法。
- 请求只携带最小测试提示，不携带书签、用户内容或授权 consent。
- 只需验证配置端点可用并返回可接受的 HTTP 响应，不把测试响应当作业务 JSON 解析。
- 返回 `status`、`latencyMs`、`testedAt`；不返回 Key、授权头或原始响应正文。
- 错误继续使用既有 `AI_UNAUTHORIZED`、`AI_TIMEOUT`、`AI_REQUEST_FAILED` 等稳定错误码。

前端通过独立的 `ai-connection` 适配器读取 Wails 绑定并用 Zod 校验 DTO。无 Wails 绑定的浏览器环境只显示不可用错误，不执行前端直连或伪造成功。

### 2.2 完整备份格式

Settings 导出改用版本化 `linkit-backup` 信封；旧 `linkit-library` 文件仍可导入。

```json
{
  "format": "linkit-backup",
  "schemaVersion": 1,
  "revision": 0,
  "updatedAt": "2026-07-27T00:00:00.000Z",
  "exportedAt": "2026-07-27T00:00:00.000Z",
  "appVersion": "0.0.0",
  "data": {
    "bookmarks": [],
    "categories": [],
    "collections": [],
    "tags": []
  },
  "settings": {
    "settingsVersion": 1,
    "storageMode": "local",
    "theme": "midnight",
    "locale": "en",
    "ai": { "apiBase": "", "model": "" },
    "view": { "defaultMode": "card" },
    "shortcuts": {},
    "uiSize": "medium"
  }
}
```

`settings` 是可移植设置投影，包含主题、语言、存储模式、AI Base/Model、默认视图、快捷键和窗口大小。以下字段永不进入备份：

- AI API Key、Supabase session/token、日志及授权头。
- `aiConsent`：导入后固定重置为 `null`，不得通过导入绕过数据发送确认。
- `lastCloudRevision`：导入后固定重置为 `null`，避免把另一设备的同步游标当作本机状态。

导入时先解析并校验整个备份，用户确认后一次性替换资料库并持久化设置；任意校验、写入或用户取消失败都保持原状态不变。旧 `linkit-library` 导入只替换资料库，保留当前设置。

## 3. 模块与数据流

### TASK-077

`SettingsDialog` → `features/settings/ai-connection` → `window.go.ai.Service.TestConnection` → `internal/ai.Service` → `internal/ai.Client` → 配置 API。

连接测试结果只在当前对话框状态中展示，不写入 LibraryData、AppSettings 或日志。

### TASK-078

`SettingsDialog` 读取当前 `library` 与 `settings` → `features/import-export` 构建 `linkit-backup` → 下载；
文件选择 → Zod 解析/迁移 → 摘要与覆盖确认 → 原子回调同时应用 LibraryData 与可移植设置 → 既有设置持久化协调器写盘。

现有 `linkit-library` 解析路径继续作为向后兼容分支。

## 4. 错误与安全

- 所有跨边界 DTO 使用 camelCase，并在前端运行时校验。
- UI 文案和错误消息使用英文；中文界面通过现有 i18n 映射。
- 导出前执行敏感字段扫描；导入拒绝包含 API Key、token、日志或未知敏感字段的载荷。
- 不在截图、测试输出或错误详情中输出真实凭据或用户内容。
- 连接测试不触发 AI 内容授权，因为请求不包含收藏内容。

## 5. 测试与验收

### TASK-077

- Go Unit：缺失配置不发请求、成功返回非负耗时、401/超时/网络失败映射稳定错误。
- TypeScript Unit/Component：DTO 校验、按钮禁用、加载/成功/失败状态和配置变更后状态清理。
- Playwright E2E/Visual：Settings → AI 测试旅程，保存 English Baseline、Actual、Diff；截图不得包含 Key。
- 真实第三方 AI 调用遵循 `docs/spec/info.md`，缺少环境变量时标记 `BLOCKED`，不得用 Mock 冒充真实验收。

### TASK-078

- TypeScript Unit：备份构建、完整实体与设置 round-trip、敏感字段排除、旧格式兼容、无效输入拒绝及失败无副作用。
- Go Unit：原生文件服务对 `linkit-backup` 的 JSON/大小/敏感字段门禁（若走 Wails 原生文件路径）。
- Playwright E2E/Visual：完整导出、设置与资料库导入、取消/无效错误路径，保存中英文 Baseline、Actual、Diff。

## 6. 不变更项

- 不新增数据库迁移，不改变 Supabase `user_bookmarks` 结构。
- 不把 API Key 从 Keychain 移到 JSON、浏览器存储、云端或备份。
- 不改变旧资料库 `linkit-library` schemaVersion 1 的读取语义。
