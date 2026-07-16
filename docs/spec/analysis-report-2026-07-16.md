# 规格审查报告（Analysis Report）

> 文件路径：`docs/spec/analysis-report-2026-07-16.md`  
> 创建步骤：STEP 4（规格审查）  
> 审查日期：2026-07-16  
> 审查人：Codex  
> 状态：已归档

---

## 审查范围

| 文件 | 审查后版本 / 日期 |
|------|------------------|
| `docs/spec/requirements.md` | 1.2.0 / 2026-07-16 |
| `docs/spec/design.md` | 1.1.0 / 2026-07-16 |
| `docs/spec/data.md` | 1.1.0 / 2026-07-16 |
| `docs/spec/api.md` | 1.1.0 / 2026-07-16 |

参考约束：`docs/spec/constitution.md` 1.0.0。

---

## 审查结论摘要

- **发现问题数**：P0 0 条 · P1 5 条 · P2 5 条
- **已解决**：P1 5 条 · P2 4 条
- **外部阻塞**：P2 1 条，Supabase 远程项目无 MCP 访问权限
- **已更新文件**：`requirements.md`、`design.md`、`data.md`、`api.md`
- **用户决策**：4 条，均已完成
- **结论**：✅ 可进入 STEP 5

---

## 七维度审查结果

| 维度 | 结果 | 说明 |
|------|:----:|------|
| 术语一致性 | 通过 | 统一使用 Bookmark、Category、Collection、Tag、LibraryEnvelope、revision 等术语；AI 归一化响应统一 camelCase |
| 用户角色清晰度 | 通过 | 本地用户与登录用户边界明确；云能力要求有效 Supabase session |
| 触发条件完整性 | 通过 | 补齐注册无 session、AI 首次授权、API Base 改变、未认证 RLS 与性能基线触发条件 |
| 系统响应可验证性 | 通过 | 121 条 AC 均包含 EARS、test_type 和对应 expected 结构 |
| 前置条件与约束 | 通过 | 明确 session、AI Key、AI consent、expectedRevision、基准数据量与外部服务失败条件 |
| 跨文档冲突 | 通过 | 修正 CloudSnapshot revision 重复、AI 字段命名、健康扫描接口类型及本地恢复契约 |
| 非功能性需求 | 通过 | 已覆盖安全、隐私、跨平台、键盘可访问性、性能和视觉回归；远程 Supabase 核验单独标记 BLOCKED |

---

## 问题列表

| # | 优先级 | 关联需求 | 维度 | 问题描述 | 处理方式 | 状态 |
|---|:------:|---------|------|---------|---------|:----:|
| 1 | P1 | REQ-001 | 触发条件完整性 | 注册成功但 Supabase 未返回 session 时，原需求仍要求进入主界面，与邮箱验证配置冲突 | 用户选择兼容分支；增加 `Check your email` AC，并同步 Auth 接口与设计 | 已解决 |
| 2 | P1 | REQ-025 | 跨文档冲突 | 未认证 SELECT 固定期望 HTTP 401，与 Supabase 原生 RLS 常见的 HTTP 200 空结果不一致 | 用户选择原生 RLS；修改 SELECT AC，并补充未认证写入拒绝 AC 与权限基线 | 已解决 |
| 3 | P1 | REQ-027、REQ-028 | 非功能性需求缺失 | 缺少可执行的资料库规模、启动、交互、保存和网络进度性能预算 | 用户选择 10,000 条平衡基线；新增 4 条性能 AC 与设计实现策略 | 已解决 |
| 4 | P1 | REQ-019、REQ-025 | 前置条件与约束 | 收藏内容发送至用户配置 AI 服务前缺少知情授权与 API Base 变化处理 | 用户选择首次授权；新增 consent AC、AppSettings 字段与 Go 端二次校验 | 已解决 |
| 5 | P1 | REQ-003、REQ-026 | 跨文档冲突 | CloudSnapshot 重复维护 revision/updatedAt，且云保存失败缺少明确的本机未同步草稿契约 | Snapshot 改为单一 LibraryEnvelope；新增 `cloud-draft.json`、SettingsService 和草稿接口 | 已解决 |
| 6 | P2 | REQ-006、REQ-013、REQ-020 | 术语一致性 | requirements 使用 snake_case AI 字段，api.md 规定 Linkit JSON 使用 camelCase | 将字段统一为 `suggestedCategoryId`、`suggestedTags`、`bookmarkIds` | 已解决 |
| 7 | P2 | REQ-022 | 系统响应可验证性 | 健康扫描 AC 使用 API/HTTP 200，但实现是异步 Wails Service + event，且目标 URL 可能返回非 200 | 将 AC test_type 改为 E2E，按进度、分类结果和持久化副作用验收 | 已解决 |
| 8 | P2 | REQ-003 | 接口契约 | 云加载 AC 期望校验 user_id，但 CloudRepository 查询未返回 user_id | Supabase select 增加 user_id，并要求等于当前 session 用户 | 已解决 |
| 9 | P2 | REQ-024 | 非功能性需求缺失 | 宪法要求组件交互与可访问性测试，但需求未明确核心键盘可访问行为 | 新增键盘焦点顺序、可见焦点和 accessible name AC | 已解决 |
| 10 | P2 | REQ-003、REQ-025 | 前置条件与约束 | `.env` 配置的 Supabase 项目无法通过 MCP 验证远程表、RLS、trigger 和 migration | 保留 BLOCKED；STEP 6 云任务前提供权限或使用 Supabase CLI 本地环境真实验证 | BLOCKED |

---

## 澄清问题记录

### 澄清 1 · 注册成功但无 session【REQ-001】

**问题**：Supabase 注册成功但未返回 session 时，系统如何处理？

**选项**：

- A. 关闭邮箱验证，立即登录
- B. 强制邮箱验证后重新登录
- C. 有 session 时进入主界面；无 session 时显示 `Check your email`
- D. 其他

**用户回复**：C

**处理动作**：修改 REQ-001 AC；同步 `design.md` 认证流程和 `api.md` Auth 契约。  
**更新文件**：`requirements.md`、`design.md`、`api.md`

### 澄清 2 · 未认证云读取响应【REQ-025】

**问题**：未登录客户端读取 `user_bookmarks` 时要求何种响应？

**选项**：

- A. Supabase 原生 RLS，HTTP 200 空结果
- B. 通过代理强制 HTTP 401
- C. 撤销 anon 权限，接受 HTTP 401 或 403
- D. 其他

**用户回复**：A

**处理动作**：将未认证 SELECT AC 修改为 HTTP 200 空数组，新增未认证写入拒绝 AC，并补充数据库 GRANT/REVOKE 基线。  
**更新文件**：`requirements.md`、`design.md`、`data.md`、`api.md`

### 澄清 3 · MVP 性能基线【REQ-027、REQ-028】

**问题**：MVP 本地性能采用哪一档？

**选项**：

- A. 10,000 条，热启动 2 秒，本地交互 P95 100ms，保存 P95 500ms，网络进度 300ms
- B. 5,000 条宽松基线
- C. 50,000 条高容量基线
- D. 其他

**用户回复**：A

**处理动作**：新增性能 AC；设计增加虚拟化、搜索投影、Web Worker、pending 状态和启动 hydrate 策略。  
**更新文件**：`requirements.md`、`design.md`

### 澄清 4 · AI 数据发送授权【REQ-019、REQ-025】

**问题**：首次向用户配置的 AI 服务发送收藏内容前如何取得授权？

**选项**：

- A. 首次使用明确确认，按 API Base 记忆，地址变化后重新确认
- B. 保存 AI 设置即视为授权
- C. 每次请求前确认
- D. 其他

**用户回复**：A

**处理动作**：新增 consent AC；AppSettings 增加授权记录；SettingsService 与 AIService 在发送前校验。  
**更新文件**：`requirements.md`、`design.md`、`data.md`、`api.md`

---

## 文档变更清单

| 文件 | 版本变化 | 变更内容摘要 | 变更类型 |
|------|----------|--------------|----------|
| `docs/spec/requirements.md` | 1.1.0 → 1.2.0 | 新增注册无 session、原生 RLS、性能、AI consent、可访问性 AC；修正 AI 字段与健康扫描 test_type | 修改 |
| `docs/spec/design.md` | 1.0.0 → 1.1.0 | 增加 SettingsService、云草稿、性能实现、AI 授权、注册和 RLS 行为 | 修改 |
| `docs/spec/data.md` | 1.0.0 → 1.1.0 | 增加 aiConsent、cloud-draft、数据不变量和 anon/authenticated 权限基线 | 修改 |
| `docs/spec/api.md` | 1.0.0 → 1.1.0 | 增加设置/草稿接口和 consent 错误；修正 Snapshot、Auth、RLS 与 user_id 契约 | 修改 |

---

## 自动检查证据

- REQ 数量：28。
- AC 数量：121，ID 唯一且每个 REQ 内从 001 连续编号。
- 121 条 AC 均包含合法 `test_type` 与匹配的 `expected` 必填字段。
- requirements 中原始 58 个 `F-*` / `NF-*` 来源 ID 均保持覆盖。
- design.md 包含 4 个 Mermaid 图，含系统架构与核心数据流。
- requirements、design、data、api 均无模板占位符，Markdown 代码围栏成对。
- design.md 仅列测试框架，覆盖率与测试策略仍留给 STEP 5。
- Supabase MCP 对项目 `yqfnyttbcdgntizadqit` 返回无权限，未伪造远程验证结果。

---

## 结论

需求、设计、数据和接口规格已完成七维度审查。所有 P1 问题均经用户澄清或技术修正后关闭；跨文档术语、字段、revision、恢复和测试类型现已一致。

项目可以进入 STEP 5，生成任务清单、测试策略、测试数据模板和可追溯矩阵。Supabase 远程访问权限不阻塞任务拆分，但所有涉及云表、RLS 和 migration 的 STEP 6 任务必须在获得可访问项目或本地 Supabase 环境前保持 `BLOCKED`，不得宣称验证通过。

> 本报告归档后不再修改。如 STEP 5 / 6 期间发现新问题，须新建审查报告记录。
