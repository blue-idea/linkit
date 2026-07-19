# Linkit 需求文档（Requirements）

> 文件路径：`docs/spec/requirements.md`  
> 版本：2.2.0
> 日期：2026-07-19
> 状态：已定稿

---

## 介绍

Linkit 是一款面向 Windows 与 macOS 的桌面端智能知识收藏应用，用于收集、整理、发现和再利用网址、网页资源与灵感素材。本文件以 `docs/README.md` 的 MVP 范围为需求来源，并遵循 `docs/spec/constitution.md` 1.0.0。

本文件中的每条需求使用唯一的 `REQ-XXX` 编号，每条验收标准使用 `REQ-XXX-AC-YYY` 编号。验收标准采用 EARS 语法，并明确测试类型和可观察结果。

### 用户角色

| 角色 | 说明 |
|------|------|
| 本地用户 | 无需账户，在当前设备使用除云同步外的完整 MVP 能力 |
| 登录用户 | 使用 Email/Password 登录，可选择本地或 Supabase 云存储 |

### 已确认的需求决策

1. 本地与云端均有数据时，存储切换提供“使用目标端数据”“用当前数据覆盖目标端”“取消”。
2. 删除含内容的分类时，提供“移动内容后删除”“二次确认递归删除”“取消”。
3. Timeline 默认按 `createdAt` 分组，可切换到 `lastVisitedAt`，未访问项目归入 `Never Visited`。
4. MVP 链接健康检查由用户手动触发，不执行后台定时扫描。
5. 新增收藏、搜索并打开、添加标签/分类/主题均不超过三次主要操作，不计算文本输入。
6. AI 接口采用 OpenAI-compatible API，通过 API Base、Model、API Key 配置。
7. 云端保存使用 revision 乐观锁；检测到版本冲突时停止自动保存，并提供 `Use Cloud Copy`、`Overwrite Cloud`、`Cancel`，不执行自动合并。
8. 注册成功时仅在 Supabase 返回有效 session 后进入主界面；未返回 session 时显示 `Check your email` 并停留在认证界面。
9. 未认证读取云用户表采用 Supabase 原生 RLS 行为，允许 HTTP 200 空结果；核心安全条件是不返回用户数据。
10. 10,000 个书签下，热启动不超过 2 秒；本地搜索与筛选 P95 不超过 100ms，视图切换 P95 不超过 150ms；本地保存 P95 不超过 500ms；AI/网络操作在 300ms 内显示进度。
11. 首次向某个 API Base 发送收藏内容前必须获得用户明确授权；授权按 API Base 记忆，API Base 改变后重新确认。
12. Windows 与 macOS 均为目标平台；每个发布候选至少在一个选定平台执行完整桌面关键旅程，另一平台保留 Wails 构建门禁，不重复要求完整真实旅程。
13. 外观提供 Midnight、Ocean、Graphite、Sunset、Daylight、Paper 六套主题；新增浅色主题不得改变现有设置交互、持久化流程或业务功能。
14. 本地存储目录可在 Settings → Storage 中通过原生文件夹选择器变更；变更时迁移除 OS Keychain 密钥外的全部应用数据目录内容。目标目录已含 Linkit 数据时阻止迁移；迁移失败保持原路径与原数据并清理目标残留；默认 AppData 保留轻量 bootstrap 指针文件，真实数据根可重定向。
15. 开发构建与正式构建使用隔离的本机身份槽：正式身份 AppData/Keychain 为 `Linkit`；开发身份（`-tags dev`）为 `Linkit-Dev`。发布产物不得嵌入开发身份字符串或携带开发者本机测试数据/密钥。

---

## 需求列表

### 需求 REQ-001 · 账户认证与启动

**来源：** F-AUTH-01、F-AUTH-02、F-AUTH-05  
**用户故事：** 作为登录用户，我希望注册、登录并恢复有效会话，以便安全进入个人收藏空间。

#### 验收标准

```yaml
- id: REQ-001-AC-001
  ears: >
    When 用户提交有效的 Email 和 Password,
    the Linkit shall 完成认证并显示主界面.
  test_type: E2E
  expected:
    ui_state: "Main window is visible and the authenticated account is shown"
    side_effects:
      - "A valid authentication session is stored"

- id: REQ-001-AC-002
  ears: >
    When 用户提交有效且未注册的 Email 和符合规则的 Password,
    the Linkit shall 创建账户并仅在认证服务返回有效 session 后进入主界面.
  test_type: E2E
  expected:
    ui_state: "Registration returns a valid session and the main window is visible"
    side_effects:
      - "A Supabase user account and valid session are created"

- id: REQ-001-AC-003
  ears: >
    When 用户提交无效凭据或认证服务拒绝请求,
    the Linkit shall 保持在认证界面并显示英文错误提示.
  test_type: E2E
  expected:
    ui_state: "Authentication form remains visible with a clear English error message"
    side_effects:
      - "No authenticated session is created"

- id: REQ-001-AC-004
  ears: >
    While 本机存在有效会话,
    when Linkit 再次启动,
    the Linkit shall 恢复会话并直接进入主界面.
  test_type: E2E
  expected:
    ui_state: "Main window is shown without requesting credentials again"
    side_effects: []

- id: REQ-001-AC-005
  ears: >
    While 认证状态仍在初始化,
    when Linkit 显示启动界面,
    the Linkit shall 显示加载状态且不短暂显示错误的登录或主界面.
  test_type: E2E
  expected:
    ui_state: "A loading indicator is visible and no authentication-state flash occurs"
    side_effects: []

- id: REQ-001-AC-006
  ears: >
    While Supabase 注册成功但未返回 session,
    when Linkit 处理注册结果,
    the Linkit shall 显示 Check your email 并停留在认证界面.
  test_type: E2E
  expected:
    ui_state: "Check your email is visible and the authentication screen remains active"
    side_effects:
      - "No authenticated application session is created"
```

---

### 需求 REQ-002 · 本地模式与退出登录

**来源：** F-AUTH-03、F-AUTH-04、F-STORE-01  
**用户故事：** 作为本地用户，我希望无需账户使用并保留本机数据，以便离线管理收藏。

#### 验收标准

```yaml
- id: REQ-002-AC-001
  ears: >
    When 用户在认证界面选择本地模式,
    the Linkit shall 设置 storageMode 为 local 并开放除云同步外的完整 MVP 能力.
  test_type: E2E
  expected:
    ui_state: "Main window is visible with a Local storage badge"
    side_effects:
      - "Local mode is persisted"

- id: REQ-002-AC-002
  ears: >
    While storageMode 为 local,
    when 用户修改收藏并重启应用,
    the Linkit shall 从本机恢复最后一次成功保存的资料库与设置.
  test_type: E2E
  expected:
    ui_state: "The previously saved library and settings are restored after restart"
    side_effects:
      - "No cloud request is required"

- id: REQ-002-AC-003
  ears: >
    While 用户已登录,
    when 用户执行 Sign Out,
    the Linkit shall 返回认证界面且不得自动清除本机导入或创建的数据.
  test_type: E2E
  expected:
    ui_state: "Authentication screen is visible"
    side_effects:
      - "Authentication session is removed"
      - "Existing local library data remains available"

- id: REQ-002-AC-004
  ears: >
    When 用户请求恢复种子示例且当前存在本机数据,
    the Linkit shall 在二次确认后才替换当前数据.
  test_type: E2E
  expected:
    ui_state: "A destructive-action confirmation is shown before restoring sample data"
    side_effects:
      - "Data is unchanged until explicit confirmation"
```

---

### 需求 REQ-003 · 云存储同步与用户隔离

**来源：** F-STORE-02、NF-01、NF-02  
**用户故事：** 作为登录用户，我希望将资料库保存到个人云空间，以便在授权设备上恢复数据且其他用户无法访问。

#### 验收标准

```yaml
- id: REQ-003-AC-001
  ears: >
    While 用户已登录且 storageMode 为 cloud,
    when 资料库发生变更,
    the Linkit shall 防抖保存完整用户资料库并显示 Cloud 状态.
  test_type: E2E
  expected:
    ui_state: "Cloud storage badge is visible and no false success is shown on failure"
    side_effects:
      - "The authenticated user's cloud library is updated after the debounce interval"

- id: REQ-003-AC-002
  ears: >
    While 用户已通过 Supabase 认证,
    when 客户端读取或写入本人 user_bookmarks 数据,
    the cloud API shall 仅处理 auth.uid() 对应的记录.
  test_type: API
  expected:
    http_status: 200
    body_schema:
      user_id: "string, equals the authenticated user id"
      data: "object, valid LibraryData"
    side_effects:
      - "Only the authenticated user's record is read or updated"

- id: REQ-003-AC-003
  ears: >
    While 请求使用用户 A 的会话,
    when 请求读取用户 B 的云资料库,
    the Supabase RLS policy shall 返回空结果且不得泄露用户 B 的数据.
  test_type: API
  expected:
    http_status: 200
    body_schema:
      data: "array, empty"
    side_effects: []

- id: REQ-003-AC-004
  ears: >
    While 云保存请求失败,
    when Linkit 收到网络或服务错误,
    the Linkit shall 显示英文同步错误且保留本机当前状态以供重试.
  test_type: E2E
  expected:
    ui_state: "A clear English sync error is visible"
    side_effects:
      - "Current in-memory and local recovery data is not discarded"

- id: REQ-003-AC-005
  ears: >
    While 云端 revision 与客户端已加载 revision 不一致,
    when Linkit 尝试保存资料库,
    the Linkit shall 停止自动保存并提供 Use Cloud Copy、Overwrite Cloud 和 Cancel 且不得自动合并.
  test_type: E2E
  expected:
    ui_state: "A cloud conflict dialog shows Use Cloud Copy, Overwrite Cloud and Cancel"
    side_effects:
      - "Cloud and local data remain unchanged until the user confirms a choice"
      - "Automatic cloud saving remains paused while the conflict is unresolved"
```

---

### 需求 REQ-004 · 本地与云端存储切换

**来源：** F-STORE-03  
**用户故事：** 作为用户，我希望在明确了解数据影响后切换存储模式，以便避免静默覆盖收藏。

#### 验收标准

```yaml
- id: REQ-004-AC-001
  ears: >
    When 用户请求在 local 与 cloud 之间切换,
    the Linkit shall 在任何数据变更前显示源端、目标端及两端数据摘要.
  test_type: E2E
  expected:
    ui_state: "A storage-switch confirmation shows source, target, bookmark counts and modification times"
    side_effects:
      - "No library data is changed before a choice is confirmed"

- id: REQ-004-AC-002
  ears: >
    While 源端与目标端均有数据,
    when 用户选择使用目标端数据,
    the Linkit shall 加载目标端资料库并保留目标端内容不被源端覆盖.
  test_type: E2E
  expected:
    ui_state: "The target library is displayed and the storage badge matches the target mode"
    side_effects:
      - "The target library becomes the active library"

- id: REQ-004-AC-003
  ears: >
    While 源端与目标端均有数据,
    when 用户明确选择用当前数据覆盖目标端并完成确认,
    the Linkit shall 将当前资料库写入目标端后切换模式.
  test_type: E2E
  expected:
    ui_state: "The target mode is active only after a successful write"
    side_effects:
      - "The target library is replaced with the confirmed current library"

- id: REQ-004-AC-004
  ears: >
    When 用户取消存储切换或目标端写入失败,
    the Linkit shall 保持原存储模式与原资料库不变.
  test_type: E2E
  expected:
    ui_state: "The original storage badge and library remain visible"
    side_effects:
      - "No partial mode switch is persisted"
```

---

### 需求 REQ-005 · JSON 导入与导出

**来源：** F-STORE-04  
**用户故事：** 作为用户，我希望导出和恢复完整资料库，以便备份或迁移数据。

#### 验收标准

```yaml
- id: REQ-005-AC-001
  ears: >
    When 用户执行 Export,
    the Linkit shall 生成包含书签、分类、主题、标签和格式版本的有效 JSON 文件.
  test_type: E2E
  expected:
    ui_state: "A JSON file download or desktop save operation completes"
    side_effects:
      - "The exported file contains a valid and complete LibraryData payload"

- id: REQ-005-AC-002
  ears: >
    While 用户选择了结构有效的 Linkit JSON 文件,
    when 用户确认覆盖当前资料库,
    the Linkit shall 导入全部数据并保持实体关系一致.
  test_type: E2E
  expected:
    ui_state: "Imported bookmarks, categories, collections and tags are visible"
    side_effects:
      - "The active library is replaced only after explicit confirmation"

- id: REQ-005-AC-003
  ears: >
    When 用户选择无效、损坏或不兼容的 JSON 文件,
    the Linkit shall 拒绝导入并显示英文错误且不修改当前资料库.
  test_type: E2E
  expected:
    ui_state: "A clear English import error is visible"
    side_effects:
      - "The current library remains unchanged"
```

---

### 需求 REQ-006 · 新增书签与入库分析

**来源：** F-BM-01、F-AI-01  
**用户故事：** 作为用户，我希望通过 URL 快速创建书签并审阅分析结果，以便高效积累知识素材。

#### 验收标准

```yaml
- id: REQ-006-AC-001
  ears: >
    When 用户在 New Bookmark 中提交有效的 http 或 https URL,
    the Linkit shall 进入分析与确认流程而不是立即静默写入资料库.
  test_type: E2E
  expected:
    ui_state: "An analysis or manual-entry preview is shown with a Save action"
    side_effects:
      - "No bookmark is persisted before user confirmation"

- id: REQ-006-AC-002
  ears: >
    While 已配置有效 AI 服务且页面内容可获取,
    when Linkit 分析 URL,
    the Linkit shall 返回可编辑的标题、摘要、分类建议和标签建议.
  test_type: API
  expected:
    http_status: 200
    body_schema:
      title: "string, non-empty"
      summary: "string"
      suggestedCategoryId: "string or null"
      suggestedTags: "array of strings"
    side_effects: []

- id: REQ-006-AC-003
  ears: >
    While AI Key 缺失、页面抓取失败或 AI 请求失败,
    when 用户继续新增流程,
    the Linkit shall 显示英文降级提示并允许手动填写后保存.
  test_type: E2E
  expected:
    ui_state: "Manual bookmark fields remain editable with a clear English fallback message"
    side_effects:
      - "No simulated AI result is presented as a real response"

- id: REQ-006-AC-004
  ears: >
    While 入库预览可见,
    when 用户确认保存,
    the Linkit shall 创建一个具有唯一 ID、有效 URL 和当前创建时间的书签.
  test_type: Unit
  expected:
    return_value: "Bookmark, with unique id, normalized URL and valid createdAt"
    side_effects:
      - "The bookmark is added exactly once to the active library"

- id: REQ-006-AC-005
  ears: >
    When 用户在 New Bookmark 中提交的 URL 规范化后已存在于当前资料库,
    the Linkit shall 显示英文 warning 并阻止进入分析、确认或保存的下一步操作.
  test_type: Unit + E2E
  expected:
    ui_state: "A warning says Bookmark URL already exists and the input step remains visible"
    return_value: "BOOKMARK_URL_DUPLICATE when the domain command receives a duplicate normalized URL"
    side_effects:
      - "No duplicate bookmark is created"
      - "No analysis or review step is opened for the duplicate URL"
```

---

### 需求 REQ-007 · 书签查看、编辑与删除

**来源：** F-BM-02、F-BM-03、F-BM-04  
**用户故事：** 作为用户，我希望查看、修订和删除收藏，以便保持资料准确。

#### 验收标准

```yaml
- id: REQ-007-AC-001
  ears: >
    When 用户选择一个书签,
    the Linkit shall 在当前视图或详情面板显示标题、域名、摘要、标签及组织关系.
  test_type: E2E
  expected:
    ui_state: "The selected bookmark details are visible and match the active library data"
    side_effects: []

- id: REQ-007-AC-002
  ears: >
    When 用户保存对标题、描述、备注、标签、分类、主题或阅读状态的修改,
    the Linkit shall 同步更新列表、详情和持久化数据.
  test_type: E2E
  expected:
    ui_state: "List and detail panel show identical updated values"
    side_effects:
      - "The updated bookmark is persisted once"

- id: REQ-007-AC-003
  ears: >
    When 用户请求删除书签,
    the Linkit shall 在删除前显示确认并说明书签将从资料库移除.
  test_type: E2E
  expected:
    ui_state: "A destructive-action confirmation is visible"
    side_effects:
      - "The bookmark remains unchanged before confirmation"

- id: REQ-007-AC-004
  ears: >
    While 删除确认可见,
    when 用户确认删除,
    the Linkit shall 从书签列表及所有主题成员关系中移除该书签并持久化结果.
  test_type: Unit
  expected:
    return_value: "LibraryData without the deleted bookmark or dangling collection references"
    side_effects:
      - "Cloud mode schedules a synchronized save"

- id: REQ-007-AC-005
  ears: >
    When 用户查看任一书签视图或已打开的详情面板,
    the Linkit shall 在每个书签项底部提供可见且带文字标签的 Edit、Move 和 Delete 操作入口.
  test_type: E2E
  expected:
    ui_state: "Edit, Move and Delete actions are visible at the bottom of bookmark items in every view"
    side_effects: []

- id: REQ-007-AC-006
  ears: >
    When 用户选择 Edit,
    the Linkit shall 打开统一编辑对话框并允许修改 URL、标题、描述、备注、分类、标签、主题和阅读状态.
  test_type: E2E
  expected:
    ui_state: "A single edit dialog shows all supported bookmark fields including URL and Notes"
    side_effects:
      - "No bookmark field changes before Save"

- id: REQ-007-AC-007
  ears: >
    While 统一编辑对话框可见,
    when 用户保存有效修改,
    the Linkit shall 原子更新该书签并同步列表、详情和持久化数据.
  test_type: Unit
  expected:
    return_value: "LibraryData containing exactly one updated bookmark"
    side_effects:
      - "The normalized URL and derived domain are persisted"

- id: REQ-007-AC-008
  ears: >
    While 用户已选择多个书签,
    when 用户请求批量删除,
    the Linkit shall 显示包含选中数量的破坏性确认且在确认前保持资料库不变.
  test_type: E2E
  expected:
    ui_state: "A bulk delete confirmation shows the selected bookmark count"
    side_effects:
      - "No bookmark or collection membership changes before confirmation"

- id: REQ-007-AC-009
  ears: >
    While 批量删除确认可见,
    when 用户确认删除,
    the Linkit shall 原子删除全部选中书签、清理所有主题引用并清空选择状态.
  test_type: Unit
  expected:
    return_value: "LibraryData without selected bookmarks or dangling collection references"
    side_effects:
      - "If any selected bookmark is missing, the whole operation fails without mutation"

- id: REQ-007-AC-010
  ears: >
    While 用户未进入批量选择模式,
    the Linkit shall 隐藏书签复选框；when 用户选择 Select，the Linkit shall 显示复选框并允许通过 Done 退出且清空选择.
  test_type: E2E
  expected:
    ui_state: "Bookmark checkboxes are visible only between Select and Done"
    side_effects:
      - "Leaving selection mode clears selected bookmark IDs"
```

---

### 需求 REQ-008 · 书签状态、标记与访问记录

**来源：** F-BM-05、F-BM-06、F-BM-07  
**用户故事：** 作为用户，我希望标记重要内容并记录阅读和访问状态，以便快速找回资料。

#### 验收标准

```yaml
- id: REQ-008-AC-001
  ears: >
    When 用户切换书签的 starred 或 pinned 状态,
    the Linkit shall 立即更新界面与持久化数据.
  test_type: E2E
  expected:
    ui_state: "The bookmark shows the selected starred or pinned state"
    side_effects:
      - "Starred filtering and pinned ordering use the updated value"

- id: REQ-008-AC-002
  ears: >
    When 用户打开一个书签 URL,
    the Linkit shall 使用外部浏览器打开 URL 并将 visitCount 增加一且更新 lastVisitedAt.
  test_type: E2E
  expected:
    ui_state: "The external URL open action is triggered"
    side_effects:
      - "visitCount increases by exactly one"
      - "lastVisitedAt is set to the current time"

- id: REQ-008-AC-005
  ears: >
    When 用户在 Card、List、Masonry、Timeline、Tag Aggregation 或 Theme Space 视图中直接访问书签,
    the Linkit shall 在书签项操作区提供区别于右侧详情 Visit 的直达入口，并复用成功后记录访问的编排.
  test_type: Unit + E2E
  expected:
    ui_state: "Each bookmark item exposes an Open bookmark directly action while the detail panel keeps Open bookmark URL / Visit"
    side_effects:
      - "The direct action opens the bookmark URL"
      - "The direct action does not select the item or open Edit, Move or Delete"

- id: REQ-008-AC-003
  ears: >
    When 用户选择 unread、reading、read 或 archived,
    the Linkit shall 将书签 readStatus 更新为且仅为所选枚举值.
  test_type: Unit
  expected:
    return_value: "Bookmark with readStatus equal to unread, reading, read or archived"
    side_effects: []

- id: REQ-008-AC-004
  ears: >
    When 用户按阅读状态筛选,
    the Linkit shall 仅显示匹配所选状态的书签.
  test_type: Unit
  expected:
    return_value: "Bookmark array where every item matches the selected readStatus"
    side_effects: []
```

---

### 需求 REQ-009 · 排序与组合筛选

**来源：** F-BM-08、MVP 排序与筛选范围  
**用户故事：** 作为用户，我希望按多种条件排序和筛选收藏，以便定位相关内容。

#### 验收标准

```yaml
- id: REQ-009-AC-001
  ears: >
    When 用户选择 recent visit、created、visits 或 title 排序,
    the Linkit shall 按对应字段实际重排结果而不是仅改变控件状态.
  test_type: Unit
  expected:
    return_value: "Deterministically ordered Bookmark array for the selected sort key"
    side_effects: []

- id: REQ-009-AC-002
  ears: >
    While 列表包含 pinned 与普通书签,
    when Linkit 应用任意排序,
    the Linkit shall 将 pinned 书签置于普通书签之前并在各组内保持所选排序.
  test_type: Unit
  expected:
    return_value: "Pinned items first, with selected ordering preserved within each group"
    side_effects: []

- id: REQ-009-AC-003
  ears: >
    When 用户组合选择星标、标签和时间范围筛选,
    the Linkit shall 按交集返回同时满足全部条件的书签.
  test_type: Unit
  expected:
    return_value: "Bookmark array where every item satisfies all active filters"
    side_effects: []

- id: REQ-009-AC-004
  ears: >
    When 用户清除筛选,
    the Linkit shall 恢复当前导航范围内的完整结果集.
  test_type: E2E
  expected:
    ui_state: "Active filter indicators are cleared and all scoped bookmarks are visible"
    side_effects: []
```

---

### 需求 REQ-010 · 多级分类树与 CRUD

**来源：** F-CAT-01、F-CAT-02  
**用户故事：** 作为用户，我希望使用多级分类长期组织收藏，以便维护稳定的知识结构。

#### 验收标准

```yaml
- id: REQ-010-AC-001
  ears: >
    When Linkit 加载具有 parentId 关系的分类,
    the Linkit shall 显示可展开和折叠的多级树且每个分类计数包含其后代书签.
  test_type: Unit
  expected:
    return_value: "Acyclic category tree with correct descendant bookmark counts"
    side_effects: []

- id: REQ-010-AC-002
  ears: >
    When 用户创建或重命名分类,
    the Linkit shall 验证非空名称并立即更新分类树与持久化数据.
  test_type: E2E
  expected:
    ui_state: "The created or renamed category is visible in the tree"
    side_effects:
      - "Category data is persisted"

- id: REQ-010-AC-003
  ears: >
    While 分类包含子分类或书签,
    when 用户请求删除该分类,
    the Linkit shall 提供移动内容后删除、二次确认递归删除和取消三种选择.
  test_type: E2E
  expected:
    ui_state: "A deletion dialog shows all three explicit choices"
    side_effects:
      - "No category or bookmark changes before confirmation"

- id: REQ-010-AC-004
  ears: >
    While 分类删除确认可见,
    when 用户选择移动内容后删除,
    the Linkit shall 将直属书签和子分类移动到被删分类的父级后删除该分类.
  test_type: Unit
  expected:
    return_value: "LibraryData without the deleted category and without orphaned descendants or bookmarks"
    side_effects: []

- id: REQ-010-AC-005
  ears: >
    While 分类删除确认可见,
    when 用户完成递归删除的二次确认,
    the Linkit shall 删除该分类树并将受影响书签移动到未分类状态.
  test_type: Unit
  expected:
    return_value: "LibraryData without the deleted category subtree and with affected categoryId values cleared"
    side_effects: []
```

---

### 需求 REQ-011 · 分类拖拽与书签归类

**来源：** F-CAT-03、F-CAT-04  
**用户故事：** 作为用户，我希望通过拖拽调整分类和书签归属，以便快速重组资料库。

#### 验收标准

```yaml
- id: REQ-011-AC-001
  ears: >
    When 用户将分类拖到另一个合法分类下,
    the Linkit shall 更新 parentId 并持久化新的树层级.
  test_type: E2E
  expected:
    ui_state: "The moved category appears under the new parent after reload"
    side_effects:
      - "The category parentId is updated"

- id: REQ-011-AC-002
  ears: >
    When 用户尝试将分类拖入自身或其后代,
    the Linkit shall 拒绝操作并保持原树结构.
  test_type: Unit
  expected:
    throws: "InvalidCategoryMoveError"
    side_effects:
      - "No parentId is changed"

- id: REQ-011-AC-003
  ears: >
    When 用户将书签拖到分类节点,
    the Linkit shall 更新 categoryId 并显示英文成功提示.
  test_type: E2E
  expected:
    ui_state: "The bookmark is visible in the target category and a success message is shown"
    side_effects:
      - "The bookmark categoryId equals the target category id"

- id: REQ-011-AC-004
  ears: >
    When 用户通过选择框、Ctrl/Cmd 点击或 Shift 点击选择多个书签,
    the Linkit shall 显示选中数量及 Move、Delete、Clear selection 批量操作.
  test_type: E2E
  expected:
    ui_state: "A persistent bulk action bar reflects the exact selection count"
    side_effects: []

- id: REQ-011-AC-005
  ears: >
    While 用户已选择一个或多个书签,
    when 用户选择 Move 并确认目标分类或 Uncategorized,
    the Linkit shall 原子更新全部选中书签的 categoryId 并清空选择状态.
  test_type: Unit
  expected:
    return_value: "LibraryData where every selected bookmark references the requested category or null"
    side_effects:
      - "If the target category or any selected bookmark is invalid, the whole operation fails without mutation"
```

---

### 需求 REQ-012 · 主题 CRUD 与成员关系

**来源：** F-COL-01、F-COL-02  
**用户故事：** 作为用户，我希望创建跨分类主题，并在主题视图内手动加入/移出书签，以便围绕目标组合与调整收藏。

#### 验收标准

```yaml
- id: REQ-012-AC-001
  ears: >
    When 用户创建或编辑主题名称、emoji、颜色和描述,
    the Linkit shall 在侧栏显示最新主题并持久化全部字段.
  test_type: E2E
  expected:
    ui_state: "The collection appears in the sidebar with the saved metadata"
    side_effects:
      - "Collection data is persisted"

- id: REQ-012-AC-002
  ears: >
    When 用户确认删除主题,
    the Linkit shall 删除主题但保留其成员书签.
  test_type: Unit
  expected:
    return_value: "LibraryData without the collection and with all bookmarks retained"
    side_effects:
      - "Deleted collection id is removed from bookmark collectionIds"

- id: REQ-012-AC-003
  ears: >
    When 用户通过拖拽或详情操作将书签加入或移出主题,
    the Linkit shall 同步更新 Collection.bookmarkIds 与 Bookmark.collectionIds.
  test_type: Unit
  expected:
    return_value: "LibraryData with bidirectionally consistent collection membership"
    side_effects: []

- id: REQ-012-AC-004
  ears: >
    When 用户打开主题,
    the Linkit shall 仅显示该主题的现有成员且计数准确.
  test_type: E2E
  expected:
    ui_state: "Collection view shows the exact current member set and count"
    side_effects: []

- id: REQ-012-AC-005
  ears: >
    When 用户在侧栏新建或编辑主题并设置 Emoji,
    the Linkit shall 提供候选图标菜单，允许用户选择不同 Emoji 作为主题图标.
  test_type: Unit + E2E
  expected:
    ui_state: "The collection form shows a candidate icon menu and the sidebar renders the chosen icon after save"
    side_effects:
      - "The selected emoji is submitted with the collection form"
      - "Existing collection fields are not changed before Save"

- id: REQ-012-AC-006
  ears: >
    While 用户正在查看某一收藏主题,
    when 主题工具栏可见,
    the Linkit shall 提供英文入口 “Add bookmarks”.
  test_type: E2E
  expected:
    ui_state: "Collection toolbar shows an Add bookmarks action"
    side_effects: []

- id: REQ-012-AC-007
  ears: >
    While 当前主题的添加书签对话框可见,
    when 用户浏览或搜索候选书签,
    the Linkit shall 仅列出尚未属于该主题的书签，并支持按标题或 URL 搜索与多选.
  test_type: E2E
  expected:
    ui_state: "Picker lists only non-member bookmarks and supports search plus multi-select"
    side_effects:
      - "Library membership is unchanged while the dialog is open"

- id: REQ-012-AC-008
  ears: >
    While 添加书签对话框可见且已选中至少一本非成员书签,
    when 用户确认添加,
    the Linkit shall 将所选书签加入当前主题并同步 Collection.bookmarkIds 与 Bookmark.collectionIds.
  test_type: Unit + E2E
  expected:
    ui_state: "Confirmed bookmarks appear in the collection view with updated count"
    side_effects:
      - "Only confirmed bookmark ids gain membership"
      - "Bidirectional collection membership remains consistent"

- id: REQ-012-AC-009
  ears: >
    While 添加书签对话框可见,
    when 用户取消或关闭对话框,
    the Linkit shall 不修改任何主题成员关系.
  test_type: Unit + E2E
  expected:
    ui_state: "Dialog closes and collection membership is unchanged"
    side_effects: []

- id: REQ-012-AC-010
  ears: >
    When 用户打开成员数为 0 的主题,
    the Linkit shall 在空态区显示英文 CTA “Add bookmarks”，点击后打开与工具栏相同的添加对话框.
  test_type: E2E
  expected:
    ui_state: "Empty collection view shows Add bookmarks CTA that opens the add picker"
    side_effects: []

- id: REQ-012-AC-011
  ears: >
    While 用户正在查看某一收藏主题,
    when 用户对单个成员执行移出，或对多选成员确认移出,
    the Linkit shall 仅解除主题成员关系、保留书签本身，并同步 Collection.bookmarkIds 与 Bookmark.collectionIds.
  test_type: Unit + E2E
  expected:
    ui_state: "Removed bookmarks leave the collection view; bookmark records remain in the library"
    side_effects:
      - "Single-item remove applies immediately"
      - "Multi-select remove applies only after confirmation"
      - "Bidirectional collection membership remains consistent"
```

---

### 需求 REQ-013 · 创建主题组合与 AI 目标主题

**来源：** F-COL-03、F-COL-04、F-AI-04  
**用户故事：** 作为用户，我希望从现有书签或目标描述快速形成主题，以便重新利用已有知识。

#### 验收标准

```yaml
- id: REQ-013-AC-001
  ears: >
    When 用户将多个已选书签拖出并请求创建主题,
    the Linkit shall 显示包含所选成员的主题创建预览.
  test_type: E2E
  expected:
    ui_state: "A new collection preview lists all selected bookmarks"
    side_effects:
      - "No collection is persisted before confirmation"

- id: REQ-013-AC-002
  ears: >
    While 主题创建预览可见,
    when 用户确认创建,
    the Linkit shall 创建主题并建立一致的双向成员关系.
  test_type: Unit
  expected:
    return_value: "Collection and bookmarks with consistent membership references"
    side_effects:
      - "Exactly one new collection is created"

- id: REQ-013-AC-003
  ears: >
    While 已配置有效 AI 服务,
    when 用户提交主题目标描述,
    the Linkit shall 生成可编辑的主题名称、介绍、推荐标签和库内候选书签.
  test_type: API
  expected:
    http_status: 200
    body_schema:
      name: "string, non-empty"
      description: "string"
      suggestedTags: "array of strings"
      bookmarkIds: "array, contains only ids from the current library"
    side_effects: []

- id: REQ-013-AC-004
  ears: >
    While AI 主题预览可见,
    when 用户确认成员与主题信息,
    the Linkit shall 仅将确认后的内容写入资料库.
  test_type: E2E
  expected:
    ui_state: "The confirmed collection and members are visible"
    side_effects:
      - "Rejected suggestions are not persisted"
```

---

### 需求 REQ-014 · 标签管理与筛选

**来源：** F-TAG-01、F-TAG-02、F-TAG-03  
**用户故事：** 作为用户，我希望为书签维护标签并按标签筛选，以便跨分类发现内容。

#### 验收标准

```yaml
- id: REQ-014-AC-001
  ears: >
    When 用户点击侧栏标签,
    the Linkit shall 仅显示包含该标签的书签并显示准确计数.
  test_type: E2E
  expected:
    ui_state: "Every visible bookmark has the selected tag and the count matches"
    side_effects: []

- id: REQ-014-AC-002
  ears: >
    When 用户在详情中添加或移除标签,
    the Linkit shall 立即更新书签、侧栏计数与当前筛选结果.
  test_type: E2E
  expected:
    ui_state: "Tag chips, counts and filtered results reflect the saved change"
    side_effects:
      - "Bookmark tag ids remain unique"

- id: REQ-014-AC-003
  ears: >
    When 用户采纳一个 AI 建议标签,
    the Linkit shall 将对应标签加入书签且不得重复添加已有标签.
  test_type: Unit
  expected:
    return_value: "Bookmark with the accepted tag present exactly once"
    side_effects: []
```

---

### 需求 REQ-015 · 基础浏览视图

**来源：** F-VIEW-01、F-VIEW-02、F-VIEW-03  
**用户故事：** 作为用户，我希望在 Card、List 和 Masonry 间切换，以便按不同信息密度浏览收藏。

#### 验收标准

```yaml
- id: REQ-015-AC-001
  ears: >
    When 用户选择 Card,
    the Linkit shall 以网格卡片显示可读的预览、摘要和标签.
  test_type: E2E
  expected:
    ui_state: "Card view displays bookmark cards in a grid with readable metadata"
    side_effects: []

- id: REQ-015-AC-002
  ears: >
    When 用户选择 List,
    the Linkit shall 以紧凑行展示适合扫描的标题、域名、状态和关键元数据.
  test_type: E2E
  expected:
    ui_state: "List view displays compact aligned rows without hiding core metadata"
    side_effects: []

- id: REQ-015-AC-003
  ears: >
    When 用户选择 Masonry,
    the Linkit shall 使用高度自适应的列布局且与 Card 视图具有可辨识的视觉差异.
  test_type: Manual
  expected:
    checklist:
      - "Masonry items form adaptive columns without overlap"
      - "Baseline and Diff evidence show a layout distinct from Card view"
```

---

### 需求 REQ-016 · Timeline、标签聚合与主题空间

**来源：** F-VIEW-04、F-VIEW-05、F-VIEW-06  
**用户故事：** 作为用户，我希望按时间、标签或主题聚合收藏，以便发现结构和变化。

#### 验收标准

```yaml
- id: REQ-016-AC-001
  ears: >
    When 用户打开 Timeline,
    the Linkit shall 默认按 createdAt 分组并允许切换为 lastVisitedAt 分组.
  test_type: E2E
  expected:
    ui_state: "Timeline groups are chronologically ordered and a time-source control is available"
    side_effects: []

- id: REQ-016-AC-002
  ears: >
    While Timeline 使用 lastVisitedAt,
    when 书签从未被访问,
    the Linkit shall 将其归入 Never Visited 分组.
  test_type: Unit
  expected:
    return_value: "Timeline groups containing all unvisited bookmarks under Never Visited"
    side_effects: []

- id: REQ-016-AC-003
  ears: >
    When 用户打开 Tag Aggregation,
    the Linkit shall 按标签分组书签并显示准确的成员计数.
  test_type: Unit
  expected:
    return_value: "Tag groups with exact bookmark membership and counts"
    side_effects: []

- id: REQ-016-AC-004
  ears: >
    When 用户打开 Theme Space,
    the Linkit shall 以主题为容器展示每个主题的元数据与成员.
  test_type: E2E
  expected:
    ui_state: "Each collection is presented as a browsable container with its members"
    side_effects: []
```

---

### 需求 REQ-017 · Spotlight 关键词搜索与 URL 快捷入库

**来源：** F-SP-01、F-SP-02、F-SP-04  
**用户故事：** 作为用户，我希望通过 Spotlight 搜索或粘贴 URL，以便快速定位和新增收藏。

#### 验收标准

```yaml
- id: REQ-017-AC-001
  ears: >
    When 用户按 Cmd/Ctrl+K,
    the Linkit shall 打开 Spotlight 并将输入焦点置于搜索框.
  test_type: E2E
  expected:
    ui_state: "Spotlight is visible and the search input has focus"
    side_effects: []

- id: REQ-017-AC-002
  ears: >
    When 用户输入关键词,
    the Linkit shall 在标题、描述、域名和备注中执行不区分大小写的匹配.
  test_type: Unit
  expected:
    return_value: "Ranked Bookmark array containing only keyword matches"
    side_effects: []

- id: REQ-017-AC-003
  ears: >
    When 用户选择 Spotlight 搜索结果,
    the Linkit shall 打开或定位对应书签并关闭 Spotlight.
  test_type: E2E
  expected:
    ui_state: "The selected bookmark is visible and Spotlight is closed"
    side_effects: []

- id: REQ-017-AC-005
  ears: >
    When 用户在 Spotlight 搜索结果中按 Enter 确认当前高亮书签,
    the Linkit shall 直接打开该书签网站，并复用访问成功后记录访问的编排.
  test_type: Unit + E2E
  expected:
    ui_state: "Spotlight is closed after the highlighted result is opened directly"
    side_effects:
      - "The highlighted bookmark URL is opened directly"
      - "The highlighted bookmark becomes visited only after the external open succeeds"
      - "The Enter confirmation does not select the bookmark for the detail panel"

- id: REQ-017-AC-004
  ears: >
    When Spotlight 输入为有效 http 或 https URL,
    the Linkit shall 提供 New Bookmark 行为并将 URL 带入入库确认流程.
  test_type: E2E
  expected:
    ui_state: "New Bookmark preview opens with the entered URL"
    side_effects:
      - "No bookmark is saved before confirmation"
```

---

### 需求 REQ-018 · AI 语义搜索

**来源：** F-SP-03、F-AI-03  
**用户故事：** 作为用户，我希望用自然语言搜索已有收藏，以便找回关键词不完全匹配的资料。

#### 验收标准

```yaml
- id: REQ-018-AC-001
  ears: >
    While 已配置有效 OpenAI-compatible 服务,
    when 用户提交语义查询,
    the Linkit shall 仅在当前资料库中返回按相关度排序的书签.
  test_type: API
  expected:
    http_status: 200
    body_schema:
      results: "array of bookmark ids and numeric relevance scores"
    side_effects:
      - "No external URL is added to the result set"

- id: REQ-018-AC-002
  ears: >
    While AI Key 缺失或语义请求失败,
    when 用户执行语义搜索,
    the Linkit shall 显示英文降级提示并允许切换或自动降级为关键词搜索.
  test_type: E2E
  expected:
    ui_state: "A clear English fallback message and keyword results are available"
    side_effects:
      - "No fabricated semantic score is displayed"

- id: REQ-018-AC-003
  ears: >
    When 语义搜索无匹配结果,
    the Linkit shall 显示空状态且不推荐公网上的新 URL.
  test_type: E2E
  expected:
    ui_state: "An empty-result message is visible with no external recommendations"
    side_effects: []
```

---

### 需求 REQ-019 · AI 配置与通用降级

**来源：** F-SET-03、NF-01、NF-03  
**用户故事：** 作为用户，我希望配置自己的 AI 服务并在服务不可用时继续使用核心功能，以便控制成本和可靠性。

#### 验收标准

```yaml
- id: REQ-019-AC-001
  ears: >
    When 用户保存 API Base、Model 和 API Key,
    the Linkit shall 验证必要字段并将配置保存在本机而非云端资料库.
  test_type: E2E
  expected:
    ui_state: "AI settings are saved locally and validation errors are shown in English"
    side_effects:
      - "API Key is not included in cloud synchronization payloads"

- id: REQ-019-AC-002
  ears: >
    When Linkit 调用 AI 服务,
    the AI adapter shall 使用用户配置的 OpenAI-compatible API Base、Model 和 Key.
  test_type: API
  expected:
    http_status: 200
    body_schema:
      result: "object, normalized for the requested Linkit AI capability"
    side_effects:
      - "Authorization credentials are sent only to the configured API Base"

- id: REQ-019-AC-003
  ears: >
    While AI 服务超时、限流或返回错误,
    when Linkit 处理失败响应,
    the Linkit shall 显示清晰英文错误并保持非 AI 操作可用.
  test_type: E2E
  expected:
    ui_state: "The failed AI action reports an English error while manual controls remain enabled"
    side_effects:
      - "No partial AI-generated change is persisted"

- id: REQ-019-AC-004
  ears: >
    When Linkit 记录日志或错误报告,
    the Linkit shall 对 API Key、令牌和个人数据进行脱敏.
  test_type: Manual
  expected:
    checklist:
      - "API keys and authorization headers are absent from logs"
      - "User content is omitted or redacted from diagnostic output"

- id: REQ-019-AC-005
  ears: >
    While 当前 API Base 尚未获得数据发送授权,
    when 用户首次执行会发送收藏内容的 AI 操作,
    the Linkit shall 显示数据发送说明并仅在用户明确确认后继续请求.
  test_type: E2E
  expected:
    ui_state: "A consent dialog explains that selected bookmark content will be sent to the configured AI provider"
    side_effects:
      - "No bookmark content is sent before confirmation"
      - "Confirmed consent is stored locally for the current API Base"

- id: REQ-019-AC-006
  ears: >
    While 用户已授权当前 API Base,
    when 用户将 API Base 修改为不同地址,
    the Linkit shall 使原授权失效并在下一次 AI 请求前重新取得确认.
  test_type: Unit
  expected:
    return_value: "AI consent state marked as not granted for the new API Base"
    side_effects: []
```

---

### 需求 REQ-020 · 重新分析与去重整理

**来源：** F-AI-02、F-AI-05  
**用户故事：** 作为用户，我希望重新生成分析并审阅疑似重复项，以便改善资料质量且避免 AI 自动改库。

#### 验收标准

```yaml
- id: REQ-020-AC-001
  ears: >
    While 已配置有效 AI 服务,
    when 用户对书签执行 Reanalyze,
    the Linkit shall 生成新的摘要和建议标签预览.
  test_type: API
  expected:
    http_status: 200
    body_schema:
      summary: "string"
      suggestedTags: "array of strings"
    side_effects:
      - "Existing saved values remain unchanged until confirmation"

- id: REQ-020-AC-002
  ears: >
    While 重新分析预览可见,
    when 用户确认结果,
    the Linkit shall 更新摘要并仅写入用户采纳的标签.
  test_type: E2E
  expected:
    ui_state: "Confirmed summary and tags appear in the bookmark details"
    side_effects:
      - "Rejected suggestions are not persisted"

- id: REQ-020-AC-003
  ears: >
    When Linkit 检出疑似重复书签,
    the Linkit shall 展示匹配依据与字段差异并等待用户决定.
  test_type: E2E
  expected:
    ui_state: "Duplicate candidates and field differences are visible with Merge, Delete and Cancel actions"
    side_effects:
      - "No library mutation occurs automatically"

- id: REQ-020-AC-004
  ears: >
    While 重复项差异预览可见,
    when 用户确认合并或删除,
    the Linkit shall 仅执行所选操作并保持标签、主题和分类关系一致.
  test_type: Unit
  expected:
    return_value: "LibraryData with the confirmed duplicate action applied and no dangling references"
    side_effects: []
```

---

### 需求 REQ-021 · 库内探索与静态知识网络

**来源：** F-AI-06、F-AI-07  
**用户故事：** 作为用户，我希望发现现有收藏间的关联，以便重新利用已有知识而不是获取公网新链接。

#### 验收标准

```yaml
- id: REQ-021-AC-001
  ears: >
    When 用户请求探索推荐,
    the Linkit shall 仅从当前资料库返回基于相似度、标签或主题关系的候选书签.
  test_type: Unit
  expected:
    return_value: "Ranked Bookmark array containing only ids from the active library"
    side_effects: []

- id: REQ-021-AC-002
  ears: >
    When 推荐算法识别主题覆盖缺口,
    the Linkit shall 将其作为可选建议显示且不得自动修改主题成员.
  test_type: E2E
  expected:
    ui_state: "A theme-gap suggestion is visible with an explicit confirmation action"
    side_effects:
      - "Collection membership is unchanged before confirmation"

- id: REQ-021-AC-003
  ears: >
    When 用户打开某书签的知识网络,
    the Linkit shall 以当前书签为中心显示由共同标签、共同主题或 AI 相关性形成的静态节点和边.
  test_type: E2E
  expected:
    ui_state: "A static graph shows the selected bookmark as the center and labeled relationship edges"
    side_effects: []

- id: REQ-021-AC-004
  ears: >
    When 用户点击知识网络中的书签节点,
    the Linkit shall 定位到对应的现有书签详情.
  test_type: E2E
  expected:
    ui_state: "The clicked bookmark becomes selected and its details are visible"
    side_effects: []
```

---

### 需求 REQ-022 · 洞察报告与链接健康

**来源：** F-AI-08、F-AI-09  
**用户故事：** 作为用户，我希望查看资料库洞察和链接状态，以便发现需要复访或处理的收藏。

#### 验收标准

```yaml
- id: REQ-022-AC-001
  ears: >
    When 用户打开 Insights,
    the Linkit shall 显示基于当前资料库统计或规则生成的洞察卡片和可执行入口.
  test_type: E2E
  expected:
    ui_state: "Insight cards show traceable metrics and actions that open related views"
    side_effects: []

- id: REQ-022-AC-002
  ears: >
    When 用户手动启动链接健康扫描,
    the Linkit shall 检查库内 URL 并将每个已扫描书签分类为 ok、changed 或 broken.
  test_type: E2E
  expected:
    ui_state: "The scan shows completed progress and each scanned bookmark has ok, changed or broken status"
    side_effects:
      - "The health result and comparison metadata are persisted"

- id: REQ-022-AC-003
  ears: >
    While 应用处于空闲或后台,
    when 用户未主动启动健康扫描,
    the Linkit shall 不自动发起链接健康网络请求.
  test_type: E2E
  expected:
    ui_state: "No background scan status or unexpected network activity is shown"
    side_effects:
      - "Stored health values remain unchanged"

- id: REQ-022-AC-004
  ears: >
    When 用户选择 Updated 或 Broken 侧栏入口,
    the Linkit shall 仅显示 health 为 changed 或 broken 的书签并显示准确计数.
  test_type: E2E
  expected:
    ui_state: "The selected health view contains only matching bookmarks and the count is correct"
    side_effects: []
```

---

### 需求 REQ-023 · 设置、外观与国际化

**来源：** F-SET-01、F-SET-02、F-SET-04、F-SET-05、NF-06  
**用户故事：** 作为用户，我希望管理账户、存储、外观和语言，以便按个人环境使用 Linkit。

#### 验收标准

```yaml
- id: REQ-023-AC-001
  ears: >
    When 用户打开 Settings,
    the Linkit shall 提供 General、Storage、AI、Appearance 和 Language 相关设置入口.
  test_type: E2E
  expected:
    ui_state: "All required settings sections are discoverable"
    side_effects: []

- id: REQ-023-AC-002
  ears: >
    When 用户查看 Storage 设置,
    the Linkit shall 显示当前 Local 或 Cloud 模式、当前本地数据目录及可计算的资料库容量信息.
  test_type: E2E
  expected:
    ui_state: "Current storage mode, local data directory and library size information are visible"
    side_effects: []

- id: REQ-023-AC-003
  ears: >
    When 用户选择 Midnight、Ocean、Graphite、Sunset、Daylight 或 Paper,
    the Linkit shall 将对应主题应用到全部主要界面并持久化选择.
  test_type: E2E
  expected:
    ui_state: "The selected theme is applied consistently and restored after restart"
    side_effects:
      - "Theme preference is persisted"

- id: REQ-023-AC-004
  ears: >
    When Linkit 首次启动且不存在语言偏好,
    the Linkit shall 使用 English 作为默认 UI 语言.
  test_type: E2E
  expected:
    ui_state: "Primary navigation and actions are displayed in English"
    side_effects:
      - "Default locale is en"

- id: REQ-023-AC-005
  ears: >
    When 用户在 English 与中文之间切换,
    the Linkit shall 更新界面文案且缺失翻译回退到 English.
  test_type: E2E
  expected:
    ui_state: "Visible UI text matches the selected locale and missing keys use English"
    side_effects:
      - "Locale preference is persisted"

- id: REQ-023-AC-006
  ears: >
    While locale 为 zh,
    when Linkit 显示用户可见错误,
    the Linkit shall 显示对应中文翻译且保留可追踪的英文消息键.
  test_type: Unit
  expected:
    return_value: "Localized Chinese error text with a stable English translation key"
    side_effects: []

- id: REQ-023-AC-007
  ears: >
    When Linkit 应用任一主题皮肤,
    the Linkit shall 使用主题专属颜色令牌统一渲染主要背景、表面、文字、边框、阴影和焦点状态，
    并使 Daylight 与 Paper 使用 light color scheme 且不出现不可读文字或控件.
  test_type: E2E
  expected:
    checklist:
      - "All six themes have distinct workspace and component styling"
      - "Theme-aware surfaces, text, borders, shadows and focus states use the selected palette"
      - "Daylight and Paper use a light color scheme without unreadable text or controls"
    side_effects: []
```

---

### 需求 REQ-024 · 主窗口、快捷键与拖入 URL

**来源：** 信息架构、F-SP-01、全局交互与快捷键  
**用户故事：** 作为桌面用户，我希望通过稳定布局和快捷键操作核心功能，以便高效管理收藏。

#### 验收标准

```yaml
- id: REQ-024-AC-001
  ears: >
    When Linkit 显示主窗口,
    the Linkit shall 提供可折叠 Sidebar、Content Area 和 Detail Panel 以及顶栏核心操作.
  test_type: E2E
  expected:
    ui_state: "The three primary regions and top-bar actions are visible and operable"
    side_effects: []

- id: REQ-024-AC-002
  ears: >
    When 用户按 Cmd/Ctrl+N、Cmd/Ctrl+I 或 Cmd/Ctrl+逗号,
    the Linkit shall 分别打开 New Bookmark、Insights 或 Settings.
  test_type: E2E
  expected:
    ui_state: "Each shortcut opens its corresponding surface"
    side_effects: []

- id: REQ-024-AC-003
  ears: >
    When 用户按 Cmd/Ctrl+1、2、3 或 Cmd/Ctrl+反斜杠,
    the Linkit shall 分别切换 Card、List、Masonry 或 Sidebar 可见性.
  test_type: E2E
  expected:
    ui_state: "The requested view or sidebar state is applied"
    side_effects: []

- id: REQ-024-AC-004
  ears: >
    When 用户按 Esc,
    the Linkit shall 关闭最上层可关闭的浮层或对话框且不提交未确认操作.
  test_type: E2E
  expected:
    ui_state: "The topmost overlay is closed"
    side_effects:
      - "Unconfirmed edits or destructive actions are not applied"

- id: REQ-024-AC-005
  ears: >
    When 用户将有效 http 或 https URL 拖入应用窗口,
    the Linkit shall 打开带有该 URL 的 New Bookmark 确认流程.
  test_type: E2E
  expected:
    ui_state: "New Bookmark preview contains the dropped URL"
    side_effects:
      - "No bookmark is saved before confirmation"

- id: REQ-024-AC-006
  ears: >
    When 用户仅使用键盘操作主要界面,
    the Linkit shall 为核心交互提供可达的焦点顺序、可见焦点样式和可识别的控件名称.
  test_type: E2E
  expected:
    ui_state: "Primary actions are keyboard reachable, visibly focused and exposed with accessible names"
    side_effects: []
```

---

### 需求 REQ-025 · 安全与敏感信息保护

**来源：** NF-01、NF-02、项目宪法  
**用户故事：** 作为用户，我希望凭据和个人收藏受到保护，以便安全使用云端与 AI 能力。

#### 验收标准

```yaml
- id: REQ-025-AC-001
  ears: >
    When Linkit 构建或运行,
    the Linkit shall 从环境变量或本机安全设置读取密钥且不得包含硬编码凭据.
  test_type: Manual
  expected:
    checklist:
      - "Repository and build artifacts contain no real API keys or service-role keys"
      - "Environment files containing secrets are excluded from version control"

- id: REQ-025-AC-002
  ears: >
    When Linkit 保存 AI API Key,
    the Linkit shall 仅保存在本机安全设置中且不得写入 LibraryData、Supabase 或导出文件.
  test_type: Unit
  expected:
    return_value: "Serialized LibraryData and export payload without API credentials"
    side_effects: []

- id: REQ-025-AC-003
  ears: >
    While 用户未认证,
    when 客户端读取 user_bookmarks,
    the cloud API shall 按 Supabase 原生 RLS 返回空结果且不泄露任何用户记录.
  test_type: API
  expected:
    http_status: 200
    body_schema:
      data: "array, empty"
    side_effects: []

- id: REQ-025-AC-004
  ears: >
    When 自建 HTTP API 或 Edge Function 接收超过配置阈值的请求,
    the API shall 拒绝超限请求并返回清晰英文错误.
  test_type: API
  expected:
    http_status: 429
    body_schema:
      message: "string, English rate-limit error"
      retry_after: "number, seconds"
    side_effects:
      - "The rejected request does not mutate user data"

- id: REQ-025-AC-005
  ears: >
    While 用户未认证,
    when 客户端尝试插入、更新或删除 user_bookmarks,
    the cloud API shall 拒绝写入且不得改变任何用户记录.
  test_type: API
  expected:
    http_status: "401 or 403"
    body_schema:
      message: "string, authorization or RLS error"
    side_effects:
      - "No user data is inserted, updated or deleted"

- id: REQ-025-AC-006
  ears: >
    When Linkit 以正式发布身份构建（不启用 Go build tag `dev`）,
    the Linkit shall 使用 AppData 目录名与 OS Keychain 服务名均为 Linkit 的正式身份槽，且发布产物不得嵌入 Linkit-Dev 开发身份或开发者本机用户数据.
  test_type: Unit
  expected:
    return_value: "Release identity constants resolve to Linkit for AppDataDirectoryName, SecretServiceName and AppTitle"
    side_effects:
      - "Dev builds with -tags dev resolve to Linkit-Dev and remain isolated from the release slot"
      - "Release CI rejects binaries that embed the Linkit-Dev identity string"
      - "Installers and packages do not bundle the developer's AppData or Keychain contents"
```

---

### 需求 REQ-026 · 数据模型与引用完整性

**来源：** 数据模型第 6 节  
**用户故事：** 作为用户，我希望收藏、分类、主题和标签关系保持一致，以便数据在编辑、同步和导入后仍可靠。

#### 验收标准

```yaml
- id: REQ-026-AC-001
  ears: >
    When Linkit 创建或加载 LibraryData,
    the data validator shall 验证 bookmarks、categories、collections 和 tags 为结构有效的集合.
  test_type: Unit
  expected:
    return_value: "Validated LibraryData or a structured validation error"
    side_effects: []

- id: REQ-026-AC-002
  ears: >
    When LibraryData 包含不存在的 categoryId、collectionId、bookmarkId 或 tagId,
    the data validator shall 拒绝数据或通过显式修复策略移除悬空引用.
  test_type: Unit
  expected:
    return_value: "Structured validation result listing every invalid reference"
    side_effects:
      - "Invalid data is not silently accepted"

- id: REQ-026-AC-003
  ears: >
    When Linkit 更新主题成员关系,
    the data service shall 保持 Collection.bookmarkIds 与 Bookmark.collectionIds 双向一致且无重复 ID.
  test_type: Unit
  expected:
    return_value: "LibraryData with symmetric and unique collection membership"
    side_effects: []

- id: REQ-026-AC-004
  ears: >
    When Linkit 持久化书签,
    the data service shall 保留 title、url、domain、notes、tags、categoryId、collectionIds、时间、状态、health 和 AI 产物字段.
  test_type: Unit
  expected:
    return_value: "Round-tripped Bookmark equivalent to the validated input"
    side_effects: []
```

---

### 需求 REQ-027 · 跨平台一致性与故障恢复

**来源：** NF-03、NF-05  
**用户故事：** 作为 Windows 或 macOS 用户，我希望核心功能一致且失败可恢复，以便可靠使用桌面应用。

#### 验收标准

```yaml
- id: REQ-027-AC-001
  ears: >
    While Windows 与 macOS 均为目标平台,
    when Linkit 验收发布候选,
    the Linkit shall 在至少一个选定平台通过完整关键桌面旅程并遵循该平台的 Ctrl 或 Cmd 与窗口惯例，同时为另一平台保留成功的 Wails 构建证据.
  test_type: Manual
  expected:
    checklist:
      - "Critical desktop journeys pass on at least one selected target platform"
      - "Shortcuts and window controls follow the selected platform conventions"
      - "A successful Wails build is recorded for the other target platform"
      - "No unexecuted platform journey is reported as PASS"

- id: REQ-027-AC-002
  ears: >
    While AI、网络或云服务不可用,
    when 用户执行不依赖该服务的本地操作,
    the Linkit shall 保持本地浏览、编辑、搜索和组织能力可用.
  test_type: E2E
  expected:
    ui_state: "Local library operations remain enabled while the unavailable service reports an error"
    side_effects:
      - "No local data is discarded because of the external failure"

- id: REQ-027-AC-003
  ears: >
    When 持久化操作失败,
    the Linkit shall 显示英文错误且不得显示误导性的成功状态.
  test_type: E2E
  expected:
    ui_state: "A clear English persistence error is visible and success indicators are absent"
    side_effects:
      - "The last known valid persisted state remains recoverable"

- id: REQ-027-AC-004
  ears: >
    When Linkit 初始化桌面工程骨架,
    the Linkit shall 锁定 Go 1.26 与稳定 Wails v2，使用 ui 作为前端与绑定目录，并统一通过 pnpm 执行前端安装和构建.
  test_type: Unit
  expected:
    return_value: "The Wails project configuration, Go module and pnpm package configuration satisfy the locked toolchain contract"
    side_effects:
      - "The repository contains only the pnpm lockfile for Node.js dependencies"
      - "The existing React source remains under ui"
```

---

### 需求 REQ-028 · 核心路径效率与视觉验收

**来源：** NF-04、已确认需求决策  
**用户故事：** 作为知识管理用户，我希望高频任务步骤明确且界面信息可扫描，以便减少操作成本。

#### 验收标准

```yaml
- id: REQ-028-AC-001
  ears: >
    When 用户从 New Bookmark、拖入 URL 或 Spotlight URL 入口开始新增收藏,
    the Linkit shall 在不超过三次主要操作内完成确认保存且不计算文本输入.
  test_type: E2E
  expected:
    ui_state: "The bookmark is saved within three primary actions after the chosen entry point"
    side_effects:
      - "Exactly one bookmark is created"

- id: REQ-028-AC-002
  ears: >
    When 用户通过 Spotlight 搜索并打开已有书签,
    the Linkit shall 在不超过三次主要操作内完成且不计算文本输入.
  test_type: E2E
  expected:
    ui_state: "The selected bookmark or external URL is opened within three primary actions"
    side_effects: []

- id: REQ-028-AC-003
  ears: >
    When 用户为书签添加标签、分类或主题,
    the Linkit shall 在不超过三次主要操作内完成单项组织操作且不计算文本输入.
  test_type: E2E
  expected:
    ui_state: "The selected organizational relation is visible within three primary actions"
    side_effects:
      - "The saved bookmark relation matches the visible state"

- id: REQ-028-AC-004
  ears: >
    When UI 布局、主题或主要组件发生变更,
    the Linkit shall 通过 Playwright Screenshot 生成 Baseline、实际截图和 Diff 作为视觉验收证据.
  test_type: Manual
  expected:
    checklist:
      - "Baseline image exists for every changed critical screen"
      - "Actual screenshot and Diff are generated"
      - "No unapproved overlap, clipping or unreadable text is present"

- id: REQ-028-AC-005
  ears: >
    While 资料库包含 10,000 个书签且使用基准测试设备,
    when Linkit 执行热启动,
    the Linkit shall 在 2 秒内显示可交互主界面.
  test_type: E2E
  expected:
    ui_state: "The main window becomes interactive within 2 seconds on the reference environment"
    side_effects: []

- id: REQ-028-AC-006
  ears: >
    While 资料库包含 10,000 个书签,
    when 用户执行关键词搜索、筛选或视图切换,
    the Linkit shall 使关键词搜索与筛选的 P95 不超过 100ms，并使视图切换 P95 不超过 150ms.
  test_type: E2E
  expected:
    ui_state: "Search and filter meet a 100ms P95 threshold; view switching meets a 150ms P95 threshold"
    side_effects: []

- id: REQ-028-AC-007
  ears: >
    While 资料库包含 10,000 个书签,
    when Linkit 执行本地资料库保存,
    the Linkit shall 使保存耗时的 P95 不超过 500ms.
  test_type: E2E
  expected:
    ui_state: "Local save measurements meet a P95 threshold of 500ms without blocking interaction"
    side_effects:
      - "The saved document remains valid and recoverable"

- id: REQ-028-AC-008
  ears: >
    When 用户启动 AI、网页抓取、云同步或链接健康网络操作,
    the Linkit shall 在 300ms 内显示可识别的进行中状态.
  test_type: E2E
  expected:
    ui_state: "A progress or loading state appears within 300ms"
    side_effects: []
```

---

### 需求 REQ-029 · 本地存储位置与数据迁移

**来源：** float_task 1.3、F-STORE-01、F-SET-01  
**用户故事：** 作为本地用户，我希望在 Settings → Storage 中选择本机数据目录，并在位置变更时自动迁移应用数据，以便将资料库放在自定义磁盘路径同时保持可恢复性。

#### 验收标准

```yaml
- id: REQ-029-AC-001
  ears: >
    When 用户在 Settings → Storage 中请求更改本地数据目录,
    the Linkit shall 打开原生文件夹选择对话框并在确认前展示源路径、目标路径与将迁移内容摘要.
  test_type: E2E
  expected:
    ui_state: "A folder picker opens and a confirmation shows source path, target path and migration summary"
    side_effects:
      - "No data files are changed before the user confirms migration"

- id: REQ-029-AC-002
  ears: >
    While 目标目录不包含既有 Linkit 应用数据,
    when 用户确认更改本地数据目录,
    the Linkit shall 将默认或当前数据根下除密钥外的全部应用数据文件迁移到目标目录，并持久化新数据根.
  test_type: Unit + E2E
  expected:
    ui_state: "Storage settings show the new data directory and a success state without false success on failure"
    side_effects:
      - "library.json, library.json.bak, settings.json, cloud-draft.json and related temporary/backup files are migrated when present"
      - "Default AppData retains only the bootstrap pointer to the new data root"
      - "OS Keychain secrets are not copied as files"
      - "Subsequent reads and writes use the new data root"

- id: REQ-029-AC-003
  ears: >
    While 目标目录已包含 Linkit 应用数据或非空冲突标记文件,
    when 用户选择该目标目录,
    the Linkit shall 阻止迁移并保持原数据根不变.
  test_type: Unit + E2E
  expected:
    ui_state: "An English error explains that the target already contains Linkit data"
    side_effects:
      - "Original data root and files remain unchanged"
      - "Bootstrap pointer is not updated"

- id: REQ-029-AC-004
  ears: >
    When 本地数据目录迁移在复制、校验或切换指针任一阶段失败,
    the Linkit shall 保持原数据根与原数据不变，清理目标目录中本次迁移产生的残留，并返回可追踪的英文错误.
  test_type: Unit
  expected:
    return_value: "AppError with a stable code and English message; retryable when the failure may be transient"
    side_effects:
      - "Original data root remains active"
      - "Partial target artifacts from the failed attempt are removed"
      - "No false success is reported"

- id: REQ-029-AC-005
  ears: >
    While 本地数据目录迁移已成功,
    when 用户重启应用,
    the Linkit shall 从新数据根加载资料库与设置，并保持 OS Keychain 中的 AI Key 仍然可用.
  test_type: E2E
  expected:
    ui_state: "Main window restores the library and settings from the new directory; AI key status remains configured when previously set"
    side_effects:
      - "Bootstrap pointer in default AppData resolves to the migrated data root"
      - "No Keychain secret is required to be re-entered solely due to the directory change"
```

---

## 非目标

以下能力不属于 Linkit MVP，不得在未更新需求规格的情况下加入当前任务范围：

- 真实网页截图封面。
- 分享到外部应用。
- 多设备实时协同编辑与冲突三方合并界面。
- 从公网搜索或爬取新 URL 的探索推荐。
- 全库可编辑力导向知识大图及社区检测级优化。

---

## 来源追溯映射

| 来源 ID | REQ |
|---------|-----|
| F-AUTH-01、F-AUTH-02、F-AUTH-05 | REQ-001 |
| F-AUTH-03、F-AUTH-04、F-STORE-01 | REQ-002 |
| F-STORE-02 | REQ-003 |
| F-STORE-03 | REQ-004 |
| F-STORE-04 | REQ-005 |
| F-BM-01、F-AI-01 | REQ-006 |
| F-BM-02、F-BM-03、F-BM-04 | REQ-007 |
| F-BM-05、F-BM-06、F-BM-07 | REQ-008 |
| F-BM-08、排序与筛选范围 | REQ-009 |
| F-CAT-01、F-CAT-02 | REQ-010 |
| F-CAT-03、F-CAT-04 | REQ-011 |
| F-COL-01、F-COL-02 | REQ-012 |
| F-COL-03、F-COL-04、F-AI-04 | REQ-013 |
| F-TAG-01、F-TAG-02、F-TAG-03 | REQ-014 |
| F-VIEW-01、F-VIEW-02、F-VIEW-03 | REQ-015 |
| F-VIEW-04、F-VIEW-05、F-VIEW-06 | REQ-016 |
| F-SP-01、F-SP-02、F-SP-04 | REQ-017 |
| F-SP-03、F-AI-03 | REQ-018 |
| F-SET-03、NF-01、NF-03 | REQ-019 |
| F-AI-02、F-AI-05 | REQ-020 |
| F-AI-06、F-AI-07 | REQ-021 |
| F-AI-08、F-AI-09 | REQ-022 |
| F-SET-01、F-SET-02、F-SET-04、F-SET-05、NF-06 | REQ-023 |
| 全局交互、快捷键、主窗口信息架构 | REQ-024 |
| NF-01、NF-02 | REQ-025 |
| 数据模型第 6 节 | REQ-026 |
| NF-03、NF-05 | REQ-027 |
| NF-04 | REQ-028 |
| float_task 1.3、F-STORE-01、F-SET-01 | REQ-029 |

---

## 修订记录

| 版本 | 日期 | 状态 | 说明 |
|------|------|------|------|
| 0.1.0 | 2026-07-16 | 草稿 | 根据 `docs/README.md`、正式宪法和需求访谈确认结果生成 |
| 1.0.0 | 2026-07-16 | 已定稿 | 经用户逐条确认后正式生效 |
| 1.1.0 | 2026-07-16 | 已定稿 | 经用户确认新增云端 revision 冲突处理需求 |
| 1.2.0 | 2026-07-16 | 已定稿 | STEP 4 澄清注册分支、RLS 响应、性能预算与 AI 数据授权，并修正接口字段和测试类型 |
| 1.3.0 | 2026-07-16 | 已定稿 | 用户确认单平台完整桌面旅程加另一平台构建门禁，并新增 Wails/pnpm 工程骨架 AC |
| 1.4.0 | 2026-07-19 | 已定稿 | 用户确认将 10,000 条数据下的视图切换 P95 预算调整为 150ms，搜索与筛选保持 100ms |
| 1.5.0 | 2026-07-19 | 已定稿 | 用户确认统一书签编辑/移动/删除入口，并新增原子批量移动与批量删除能力 |
| 1.6.0 | 2026-07-19 | 已定稿 | 用户确认参考 `ck/project` 优化主题皮肤，并新增 Daylight 与 Paper 浅色主题；业务功能和设置流程保持不变 |
| 1.7.0 | 2026-07-19 | 已定稿 | 新增 REQ-029：可配置本地存储目录，位置变更时自动迁移应用数据（不含密钥） |
| 1.8.0 | 2026-07-19 | 已定稿 | 新增 REQ-008-AC-005：六种书签视图提供区别于右侧详情 Visit 的直接访问入口 |
| 1.9.0 | 2026-07-19 | 已定稿 | 新增 REQ-017-AC-005：Spotlight 搜索结果 Enter 确认直接访问高亮书签网站 |
| 2.0.0 | 2026-07-19 | 已定稿 | 新增 REQ-012-AC-005：侧栏新建/编辑主题时通过候选 Emoji 菜单选择主题图标 |
| 2.1.0 | 2026-07-19 | 已定稿 | 新增 REQ-006-AC-005：创建书签时 URL 规范化后必须唯一，重复时显示 warning 并阻止下一步 |
| 2.2.0 | 2026-07-19 | 已定稿 | 新增 REQ-012-AC-006~011：主题视图手动添加/移出书签（排除已成员、搜索多选、确认前零副作用、空态 CTA） |
| 2.3.0 | 2026-07-20 | 已定稿 | 新增原则 15 与 REQ-025-AC-006：开发/正式本机身份槽隔离，发布产物不得携带开发数据 |
