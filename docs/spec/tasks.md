# Linkit 实施计划（Tasks）

> 文件路径：`docs/spec/tasks.md`  
> 版本：1.2.0
> 日期：2026-07-17  
> 状态：已定稿

执行时须严格遵循 `docs/spec/requirements.md` 1.5.0、`docs/spec/design.md` 1.3.0 和 `docs/spec/test_strategy.md` 1.3.0。每项生产代码任务必须执行 TDD 红、绿、重构循环。

AC 范围记法如 `REQ-003-AC-001~005` 表示从 001 到 005 的全部 AC，首尾均包含。

---

## 波次 0 · 工程与测试基础

- [x] **TASK-001 · 建立 Wails 与统一包管理骨架**

  > 依赖：无 · 预计：2–4 小时

  - [x] 创建 Wails v2 根工程、Go module、`wails.json` 和集中 `config/` 目录。
  - [x] 保留 `ui/` 作为前端目录，配置 Wails 构建与生成绑定路径。
  - [x] 在 `package.json` 锁定 pnpm，移除重复 npm 锁文件并统一脚本入口。

  **验证方式：**
  ```powershell
  go test ./...
  wails build
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui build
  ```

  **验收证据：** Wails/React 均可构建，仓库只保留 pnpm 锁文件，命令真实输出归档。

  _需求: REQ-027
  验收标准：REQ-027-AC-004
  _测试类型: Unit + Manual

---

- [x] **TASK-002 · 配置单元、组件、E2E、视觉与 CI 框架**

  > 依赖：TASK-001 · 预计：3–4 小时

  - [x] 配置 Vitest、React Testing Library、V8 Coverage、Playwright 和 axe-core。
  - [x] 配置 Husky 与 lint-staged，通过 pre-commit 和 pre-push 复用项目质量检查脚本。
  - [x] 建立 Windows/macOS GitHub Actions 骨架与安全扫描入口。
  - [x] 创建最小冒烟测试，验证测试框架、截图目录和覆盖率报告可生成。

  **验证方式：**
  ```powershell
  pnpm --dir ui test --run
  pnpm --dir ui test:coverage
  pnpm --dir ui exec playwright test --list
  pnpm --dir ui verify:quality-config
  ```

  **验收证据：** 单元测试、覆盖率报告、Playwright 用例清单和 CI 配置文件。

  _需求: REQ-024、REQ-028  
  验收标准：REQ-024-AC-006、REQ-028-AC-004  
  _测试类型: Unit + E2E

---

- [x] **TASK-003 · 实现版本化数据 Schema 与迁移器**

  > 依赖：TASK-002 · 预计：3–4 小时

  - [x] 使用 Zod 定义 LibraryEnvelope、LibraryData、实体和 AppSettings Schema。
  - [x] 实现 V1 迁移、引用完整性、分类无环和双向主题关系校验。
  - [x] 先编写无效 JSON、悬空引用和版本迁移失败测试。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain
  pnpm --dir ui typecheck
  ```

  **验收证据：** Schema/迁移测试报告及有效、无效、旧版本样本的实际结果。

  _需求: REQ-026  
  验收标准：REQ-026-AC-001~004  
  _测试类型: Unit

---

- [x] **TASK-004 · 建立授权测试 Factory 与性能数据生成器**

  > 依赖：TASK-003 · 预计：2–3 小时

  - [x] 创建与 `info.md` 一致的确定性实体 Factory 和核心旅程 seed。
  - [x] 创建 10,000 条书签性能数据生成器，保证固定 seed 和引用有效。
  - [x] 增加生成数据的 Schema 校验和重复 ID 测试。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run tests/factories tests/performance-data
  ```

  **验收证据：** 生成器测试、10,000 条数据统计与校验结果。

  _需求: REQ-026、REQ-028  
  验收标准：REQ-026-AC-001~004、REQ-028-AC-005~007  
  _测试类型: Unit + Performance

---

- [x] **TASK-005 · 建立领域命令、Zustand slices 与 Repository 接口**

  > 依赖：TASK-003、TASK-004 · 预计：3–4 小时

  - [x] 创建 session、library、sync、ui、settings slices 和细粒度 selector。
  - [x] 定义 LibraryRepository、MemoryRepository、StorageCoordinator 契约。
  - [x] 禁止组件直接修改实体数组，并为命令失败和事件结果编写测试。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/store src/domain/commands src/repositories
  ```

  **验收证据：** Store/Repository 测试、无直接数组修改的代码检查结果。

  _需求: REQ-026、REQ-027  
  验收标准：REQ-026-AC-001~004、REQ-027-AC-002~003  
  _测试类型: Unit

---

## 波次 1 · 本地基础与书签闭环

- [x] **TASK-006 · 实现本地原子资料库与云草稿服务**

  > 依赖：TASK-001、TASK-003 · 预计：3–4 小时

  - [x] 实现 AppData 路径、临时写入、原子替换、`.bak` 和 revision。
  - [x] 实现 cloud-draft 的读写、dirty 状态和清理门禁。
  - [x] 使用临时目录测试写入失败、损坏正式文件和备份恢复。

  **验证方式：**
  ```powershell
  go test ./internal/localstore/... -cover
  ```

  **验收证据：** Go 覆盖率、原子写入/恢复测试输出和测试目录文件快照。

  _需求: REQ-002、REQ-003、REQ-027  
  验收标准：REQ-002-AC-002、REQ-003-AC-004~005、REQ-027-AC-003  
  _测试类型: Unit + API

---

- [x] **TASK-007 · 实现本地设置服务与默认配置**

  > 依赖：TASK-001、TASK-003 · 预计：2–3 小时

  - [x] 实现 settings.json 原子读写、默认值、版本校验和损坏恢复。
  - [x] 保存 storageMode、theme、locale、AI Base/Model、consent 和 lastCloudRevision。
  - [x] API Base 改变时自动清除不匹配 consent。

  **验证方式：**
  ```powershell
  go test ./internal/settingsstore/... -cover
  pnpm --dir ui exec vitest run src/services/settings
  ```

  **验收证据：** 设置往返、默认值、损坏文件和 consent 失效测试报告。

  _需求: REQ-019、REQ-023  
  验收标准：REQ-019-AC-001、REQ-019-AC-006、REQ-023-AC-003~006  
  _测试类型: Unit

---

- [x] **TASK-008 · 实现原生导入导出文件服务**

  > 依赖：TASK-003、TASK-006 · 预计：2–3 小时

  - [x] 实现原生打开/保存对话框、文件大小和 UTF-8 JSON 语法检查。
  - [x] 实现导出信封、取消状态和不泄露设置/密钥的验证。
  - [x] 覆盖有效、损坏、过大和用户取消路径。

  **验证方式：**
  ```powershell
  go test ./internal/platform/... ./internal/localstore/... -cover
  ```

  **验收证据：** 导入导出 Go 测试结果及示例文件 Schema 校验结果。

  _需求: REQ-005、REQ-025  
  验收标准：REQ-005-AC-001~003、REQ-025-AC-002  
  _测试类型: Unit + Manual

---

- [x] **TASK-009 · 实现安全网页元数据与外部 URL 服务**

  > 依赖：TASK-001、TASK-002 · 预计：3–4 小时

  - [x] 实现 HTTP(S) 校验、超时、重定向、大小限制和静态 HTML 解析。
  - [x] 实现系统浏览器打开 URL，只有成功后才允许更新访问计数。
  - [x] 使用本地 HTTP 测试服务器覆盖失败和恶意输入。

  **验证方式：**
  ```powershell
  go test ./internal/metadata/... ./internal/platform/... -cover
  ```

  **验收证据：** HTTP 契约测试、URL 拒绝清单和解析结果样本。

  _需求: REQ-006、REQ-008、REQ-025  
  验收标准：REQ-006-AC-001~003、REQ-008-AC-002、REQ-025-AC-001  
  _测试类型: API + Security

---

- [x] **TASK-010 · 完成本地模式启动、恢复与退出流程**

  > 依赖：TASK-005~007 · 预计：3–4 小时

  - [x] 接入设置和本地 Repository，完成 loading gate 与本地模式入口。
  - [x] 实现重启恢复、退出后保留本地数据和种子恢复二次确认。
  - [x] 为损坏文件、备份可用和无数据状态编写组件/E2E 测试。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/auth src/services/storage
  pnpm --dir ui exec playwright test -g "本地模式|启动恢复"
  ```

  **验收证据：** 本地启动 E2E 截图、重启后数据对比和恢复对话框证据。

  _需求: REQ-001、REQ-002  
  验收标准：REQ-001-AC-005、REQ-002-AC-001~004  
  _测试类型: Unit + E2E

---

- [x] **TASK-011 · 实现书签新增、查看、编辑与删除**

  > 依赖：TASK-005、TASK-009、TASK-010 · 预计：3–4 小时

  - [x] 先实现 create/update/delete 领域命令及引用清理测试。
  - [x] 接入 New Bookmark、详情和删除确认 UI。
  - [x] 支持元数据失败后的手动入库，不使用模拟 AI 冒充真实结果。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain/commands/bookmarks src/features/bookmarks
  pnpm --dir ui exec playwright test -g "书签新增|书签编辑|书签删除"
  ```

  **验收证据：** 红绿重构记录、领域测试、关键 UI 截图和持久化前后数据。

  _需求: REQ-006、REQ-007  
  验收标准：REQ-006-AC-001、REQ-006-AC-003~004、REQ-007-AC-001~004  
  _测试类型: Unit + E2E

---

- [x] **TASK-012 · 实现书签标记、访问与阅读状态**

  > 依赖：TASK-011 · 预计：2–3 小时

  - [x] 实现 starred、pinned、visitCount、lastVisitedAt 和 readStatus 命令。
  - [x] 接入详情与列表交互，保证外部 URL 打开失败不增加计数。
  - [x] 覆盖四种阅读状态和筛选结果。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain/commands/bookmark-state src/features/bookmarks
  pnpm --dir ui exec playwright test -g "星标|置顶|阅读状态|访问计数"
  ```

  **验收证据：** 状态转换测试、外部打开结果和 E2E 截图。

  _需求: REQ-008  
  验收标准：REQ-008-AC-001~004  
  _测试类型: Unit + E2E

---

- [x] **TASK-013 · 实现排序与组合筛选引擎**

  > 依赖：TASK-005、TASK-011、TASK-012 · 预计：2–3 小时

  - [x] 实现 recent visit、created、visits、title 和 pinned 分组排序。
  - [x] 实现星标、标签、时间、阅读状态交集筛选与清除。
  - [x] 使用表驱动测试覆盖稳定顺序和空值。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain/query
  ```

  **验收证据：** 排序筛选用例矩阵和实际返回数组快照。

  _需求: REQ-008、REQ-009  
  验收标准：REQ-008-AC-004、REQ-009-AC-001~004  
  _测试类型: Unit

---

- [x] **TASK-014 · 实现分类树 CRUD 与删除策略**

  > 依赖：TASK-005、TASK-011 · 预计：3–4 小时

  - [x] 实现树构建、后代计数、创建、重命名和无环校验。
  - [x] 实现移动内容后删除、递归删除和取消三种策略。
  - [x] 接入分类树 UI 与破坏性确认对话框。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain/categories src/features/categories
  pnpm --dir ui exec playwright test -g "分类创建|分类删除"
  ```

  **验收证据：** 分类不变量测试、删除前后关系数据及对话框截图。

  _需求: REQ-010  
  验收标准：REQ-010-AC-001~005  
  _测试类型: Unit + E2E

---

- [x] **TASK-015 · 实现分类与书签拖拽**

  > 依赖：TASK-014 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 接入 dnd-kit 分类排序和书签拖入分类。
  - [x] 拒绝分类拖入自身或后代，并持久化合法 parentId。
  - [x] 增加键盘拖拽或等价可访问操作。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/categories/drag
  pnpm --dir ui exec playwright test -g "分类拖拽|书签归类"
  ```

  **验收证据：** 合法/非法拖拽测试、重载后树结构和截图。

  _需求: REQ-011、REQ-024  
  验收标准：REQ-011-AC-001~003、REQ-024-AC-006  
  _测试类型: Unit + E2E

---

## 波次 2 · 组织、视图与本地完整 MVP

- [x] **TASK-016 · 实现主题 CRUD 与双向成员关系**

  > 依赖：TASK-005、TASK-011 · 预计：3–4 小时

  - [x] 实现主题创建、编辑、删除和成员加入/移除命令。
  - [x] 保证 Collection.bookmarkIds 与 Bookmark.collectionIds 双向一致。
  - [x] 接入侧栏、详情和主题成员视图。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain/collections src/features/collections
  pnpm --dir ui exec playwright test -g "主题 CRUD|主题成员"
  ```

  **验收证据：** 双向关系测试、主题 CRUD 截图和重载结果。

  _需求: REQ-012、REQ-026  
  验收标准：REQ-012-AC-001~004、REQ-026-AC-003  
  _测试类型: Unit + E2E

---

- [x] **TASK-017 · 实现手动拖出创建主题组合**

  > 依赖：TASK-016 · 预计：2–3 小时

  - [x] 支持多选书签和拖出创建主题预览。
  - [x] 用户确认后一次创建主题与全部成员关系。
  - [x] 取消时不产生任何持久化副作用。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/collections/compose
  pnpm --dir ui exec playwright test -g "创建主题组合"
  ```

  **验收证据：** 预览/确认/取消三路径测试和截图。

  _需求: REQ-013  
  验收标准：REQ-013-AC-001~002  
  _测试类型: Unit + E2E

---

- [x] **TASK-018 · 实现标签维护、筛选与建议采纳**

  > 依赖：TASK-011、TASK-013 · 预计：2–3 小时

  - [x] 实现标签唯一性、添加、移除和删除引用清理。
  - [x] 接入侧栏计数、筛选和详情标签控件。
  - [x] 实现采纳建议标签且不重复。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain/tags src/features/tags
  pnpm --dir ui exec playwright test -g "标签筛选|标签编辑"
  ```

  **验收证据：** 标签不变量测试、计数结果与交互截图。

  _需求: REQ-014  
  验收标准：REQ-014-AC-001~003  
  _测试类型: Unit + E2E

---

- [x] **TASK-019 · 实现 Card、List、Masonry 基础视图**

  > 依赖：TASK-002、TASK-011、TASK-013 · 预计：3–4 小时

  - [x] 拆分视图组件并接入虚拟化与共享 BookmarkPresenter。
  - [x] 保证三视图元数据一致且 Masonry 布局不重叠。
  - [x] 建立三视图 Baseline 和 Diff。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec playwright test -g "Card|List|Masonry"
  ```

  **验收证据：** 三视图 Baseline、实际截图、Diff 和 DOM 数量记录。

  _需求: REQ-015、REQ-028  
  验收标准：REQ-015-AC-001~003、REQ-028-AC-004  
  _测试类型: E2E + Manual

---

- [x] **TASK-020 · 实现 Timeline、Tag Aggregation、Theme Space**

  > 依赖：TASK-016、TASK-018、TASK-019 · 预计：3–4 小时

  - [x] 实现 createdAt/lastVisitedAt 时间分组和 Never Visited。
  - [x] 实现标签聚合与主题空间容器视图。
  - [x] 使用虚拟化并生成三视图视觉证据。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain/views
  pnpm --dir ui exec playwright test -g "Timeline|Tag Aggregation|Theme Space"
  ```

  **验收证据：** 分组单元测试、三视图截图和 Diff。

  _需求: REQ-016、REQ-028  
  验收标准：REQ-016-AC-001~004、REQ-028-AC-004  
  _测试类型: Unit + E2E

---

- [x] **TASK-021 · 实现 Spotlight 关键词与 URL 流程**

  > 依赖：TASK-011、TASK-013 · 预计：3–4 小时

  - [x] 实现搜索投影、关键词匹配、排序和空状态。
  - [x] 接入 Cmd/Ctrl+K、结果定位、URL 检测和新增流程。
  - [x] 覆盖标题、描述、域名、备注与大小写场景。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain/search src/features/search
  pnpm --dir ui exec playwright test -g "Spotlight 关键词|URL 快捷入库"
  ```

  **验收证据：** 搜索结果矩阵、快捷键 E2E 和 Spotlight 截图。

  _需求: REQ-017  
  验收标准：REQ-017-AC-001~004  
  _测试类型: Unit + E2E

---

- [x] **TASK-022 · 重构主窗口、快捷键、拖入 URL 与可访问性**

  > 依赖：TASK-019~021 · 预计：3–4 小时

  - [x] 将 App.tsx 拆分为 AppShell、Sidebar、Content、Detail 与 Overlay 管理。
  - [x] 实现全部全局快捷键、Esc 层级关闭和窗口 URL 拖入。
  - [x] 增加焦点顺序、可见焦点、accessible name 和 axe 检查。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec playwright test -g "主窗口|快捷键|拖入 URL|键盘可访问"
  ```

  **验收证据：** 主窗口 Baseline/Diff、快捷键矩阵和 axe 报告。

  _需求: REQ-024、REQ-028  
  验收标准：REQ-024-AC-001~006、REQ-028-AC-004  
  _测试类型: E2E + Security

---

- [x] **TASK-023 · 实现设置、四主题与中英国际化**

  > 依赖：TASK-007、TASK-022 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 接入 General、Storage、AI、Appearance、Language 设置页。
  - [x] 实现四主题、默认 English、中文切换和缺失键英文回退。
  - [x] 将现有中文硬编码 UI 和错误逐步替换为稳定 i18n key。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/i18n src/features/settings
  pnpm --dir ui exec playwright test -g "Settings|主题|语言"
  ```

  **验收证据：** 四主题与双语言截图、缺译回退测试和设置重启恢复结果。

  _需求: REQ-023  
  验收标准：REQ-023-AC-001~006  
  _测试类型: Unit + E2E

---

- [x] **TASK-024 · 接入导入导出 UX 与覆盖确认**

  > 依赖：TASK-008、TASK-022、TASK-023 · 预计：2–3 小时 · 状态：done · 2026-07-18

  - [x] 接入原生对话框、导入摘要、覆盖确认和成功/错误状态。
  - [x] 验证无效 JSON 不改变当前 Store 或持久化状态。
  - [x] 为默认 English 和中文翻译生成截图。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec playwright test -g "JSON 导入|JSON 导出"
  ```

  **验收证据：** 导出文件校验、覆盖确认截图和无效导入前后数据对比。

  _需求: REQ-005、REQ-023  
  验收标准：REQ-005-AC-001~003、REQ-023-AC-005~006  
  _测试类型: E2E

---

- [x] **TASK-025 · 完成本地 MVP 关键旅程与视觉回归**

  > 依赖：TASK-010~024 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 串联本地模式、入库、查找、整理、六视图、导入导出和设置旅程。
  - [x] 验证三条核心路径均不超过三次主要操作。
  - [x] 生成关键页面 Baseline、实际截图、Diff 和本地 E2E 报告。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec playwright test tests/e2e/local-mvp
  ```

  **验收证据：** 本地 MVP E2E 报告、操作计数、截图和 Diff。

  _需求: REQ-002、REQ-006~017、REQ-023~024、REQ-028  
  验收标准：REQ-028-AC-001~004 及上述需求的本地 E2E AC  
  _测试类型: E2E

---

## 波次 3 · Supabase Auth 与云同步

- [x] **TASK-026 · 建立 Supabase 本地环境、migration 与 RLS 测试**

  > 依赖：TASK-002、TASK-003 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 将 migration 移至根 `supabase/migrations`，增加 schema_version、revision 和权限基线。
  - [x] 初始化 Supabase CLI 本地环境、生成 Database 类型和 seed/reset 脚本。
  - [x] 真实验证本人 CRUD、跨用户空结果、未认证空 SELECT 和写入拒绝。

  **验证方式：**
  ```powershell
  pnpm --dir ui run supabase:reset
  pnpm --dir ui test:supabase
  ```

  **验收证据：** migration 日志、RLS 实际响应、生成类型和 reset 结果。

  _需求: REQ-003、REQ-025  
  验收标准：REQ-003-AC-002~003、REQ-025-AC-003~005  
  _测试类型: API + Security

---

- [x] **TASK-027 · 实现 Supabase Auth 与注册分支**

  > 依赖：TASK-010、TASK-026 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 实现 signUp、signInWithPassword、getSession、onAuthStateChange 和 signOut Repository。
  - [x] 有 session 时进入主界面；无 session 时显示 `Check your email`。
  - [x] 覆盖无效凭据、会话恢复、loading gate 和退出后本地数据保留。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/auth
  pnpm --dir ui exec playwright test -g "注册|登录|会话恢复|退出登录"
  ```

  **验收证据：** Auth API 实际结果、两种注册路径截图和会话恢复记录。

  _需求: REQ-001、REQ-002  
  验收标准：REQ-001-AC-001~006、REQ-002-AC-003  
  _测试类型: API + E2E

---

- [x] **TASK-028 · 实现 CloudRepository 与 revision 保存**

  > 依赖：TASK-005、TASK-006、TASK-026、TASK-027 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 实现 load/create/save、Zod 校验和 user_id/session 二次检查。
  - [x] 使用 expectedRevision 条件更新并正确映射零行冲突。
  - [x] 云失败保留内存状态和 dirty cloud draft，不显示伪成功。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/repositories/cloud
  pnpm --dir ui test:supabase -- --grep "revision"
  ```

  **验收证据：** revision 并发测试、错误映射和 cloud-draft 文件状态。

  _需求: REQ-003、REQ-027  
  验收标准：REQ-003-AC-001~005、REQ-027-AC-002~003  
  _测试类型: Unit + API

---

- [x] **TASK-029 · 实现存储切换、冲突对话框与草稿恢复**

  > 依赖：TASK-007、TASK-028 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 实现 Local/Cloud 摘要与 Use Target、Overwrite Target、Cancel。
  - [x] 实现 revision 冲突的 Use Cloud Copy、Overwrite Cloud、Cancel。
  - [x] 实现 dirty cloud draft 启动恢复和失败保持原模式。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/services/storage-coordinator
  pnpm --dir ui exec playwright test -g "存储切换|云冲突|云草稿恢复"
  ```

  **验收证据：** 三种切换/冲突路径截图、revision 数据和取消无副作用记录。

  _需求: REQ-003、REQ-004  
  验收标准：REQ-003-AC-005、REQ-004-AC-001~004  
  _测试类型: Unit + E2E

---

- [x] **TASK-030 · 远程 Supabase 云端验收** · 状态：done · 2026-07-18

  > 依赖：TASK-026~029 · 门禁：可访问 staging 项目与测试账号 · 预计：2–3 小时

  - [x] 应用 migration 到授权测试项目并核验表、约束、trigger 与 RLS。
  - [x] 使用 info.md 用户 A/B 执行真实越权和 revision 冲突测试。
  - [x] 保存实际 HTTP 返回、数据库状态和脱敏截图。

  **验证方式：**
  ```powershell
  pnpm --dir ui run test:cloud:remote
  ```

  **验收证据：** 17 PASS 0 FAIL；远程 `linkit` 项目 Schema/RLS/revision 全部核验通过；真实输出归档于 `docs/spec/ac/TASK-030-AC.md`。

  _需求: REQ-001、REQ-003、REQ-004、REQ-025  
  验收标准：REQ-001-AC-001~004、REQ-003-AC-001~005、REQ-004-AC-001~004、REQ-025-AC-003~005  
  _测试类型: API + Security

---

## 波次 4 · AI、洞察与健康

- [x] **TASK-031 · 实现 SecretStore、AI 设置与数据授权**

  > 依赖：TASK-007、TASK-023 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 实现 Windows Credential Manager/macOS Keychain 适配接口及内存测试替身。
  - [x] 前端只读取 configured 状态，不暴露 Key 明文。
  - [x] 实现首次 consent、按 API Base 记忆和地址变化失效。

  **验证方式：**
  ```powershell
  go test ./internal/secretstore/... ./internal/settingsstore/... -cover
  pnpm --dir ui exec vitest run src/features/settings/ai-consent
  ```

  **验收证据：** SecretStore 测试、日志脱敏检查和 consent 对话框截图。

  _需求: REQ-019、REQ-025  
  验收标准：REQ-019-AC-001、REQ-019-AC-004~006、REQ-025-AC-001~002  
  _测试类型: Unit + Security + E2E

---

- [x] **TASK-032 · 实现 OpenAI-compatible 客户端与错误降级**

  > 依赖：TASK-009、TASK-031 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 实现 API Base 规范化、Chat Completions、超时、有限重试和大小限制。
  - [x] 实现 consent/Key 二次检查、严格 JSON 解析和 AppError 映射。
  - [x] 使用本地 HTTP 测试服务器覆盖 401、429、5xx、超时和无效响应。

  **验证方式：**
  ```powershell
  go test ./internal/ai/... -cover
  ```

  **验收证据：** AI 契约测试、重试次数、错误码和无外部请求的 consent 失败证明；覆盖率 80.0%。

  _需求: REQ-019、REQ-027  
  验收标准：REQ-019-AC-002~005、REQ-027-AC-002  
  _测试类型: API + Security

---

- [x] **TASK-033 · 实现 AI 入库分析与重新分析**

  > 依赖：TASK-011、TASK-018、TASK-032 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 实现标题、摘要、分类 ID 和标签建议 DTO 校验。
  - [x] 接入新增和 Reanalyze 预览，确认前不修改资料库。
  - [x] 实现无 Key/失败的英文提示和手动降级。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/ai/bookmark-analysis
  pnpm --dir ui exec playwright test -g "AI 入库分析|重新分析|AI 降级"
  ```

  **验收证据：** 预览/确认/拒绝测试、降级截图 `TASK-033-ai-fallback.png` 和无模拟结果检查。

  _需求: REQ-006、REQ-020  
  验收标准：REQ-006-AC-002~003、REQ-020-AC-001~002  
  _测试类型: API + E2E

---

- [x] **TASK-034 · 实现真实语义搜索适配与关键词降级**

  > 依赖：TASK-021、TASK-032 · 预计：3–4 小时 · 状态：done · 2026-07-18

  - [x] 实现本地候选筛选、最小字段发送和 AI 重排。
  - [x] 校验返回 ID 属于候选集、score 有效且结果仅来自库内。
  - [x] AI 失败或无结果时回退关键词并禁止公网推荐。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/search/semantic
  pnpm --dir ui exec playwright test -g "语义搜索|关键词降级"
  ```

  **验收证据：** 候选/结果 ID 对比、降级截图 `TASK-034-keyword-fallback.png` / `TASK-034-semantic-empty.png`。

  _需求: REQ-018  
  验收标准：REQ-018-AC-001~003  
  _测试类型: API + E2E

---

- [x] **TASK-035 · 实现 AI 主题生成与去重确认**

  > 依赖：TASK-016、TASK-017、TASK-032 · 预计：3–4 小时 · 状态：done · 2026-07-19

  - [x] 实现目标主题名称、描述、标签与库内成员预览。
  - [x] 实现重复候选、匹配理由、字段差异、合并和删除命令。
  - [x] 保证所有建议在用户确认前零副作用。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/ai/collections src/features/ai/duplicates
  pnpm --dir ui exec playwright test -g "AI 创建主题|去重整理"
  ```

  **验收证据：** 建议预览、差异截图和确认前后 LibraryData 对比。

  _需求: REQ-013、REQ-020  
  验收标准：REQ-013-AC-003~004、REQ-020-AC-003~004  
  _测试类型: Unit + API + E2E

---

- [x] **TASK-036 · 实现库内推荐与静态知识网络**

  > 依赖：TASK-016、TASK-018、TASK-032 · 预计：3–4 小时 · 状态：done · 2026-07-19

  - [x] 实现仅返回当前资料库 ID 的推荐和主题缺口建议。
  - [x] 实现同标签、同主题、AI 相关的确定性径向 SVG 图。
  - [x] 实现节点跳转与 AI 失败时的规则关联降级。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/explore src/features/knowledge-graph
  pnpm --dir ui exec playwright test -g "库内推荐|知识网络"
  ```

  **验收证据：** 推荐来源校验、知识图 Baseline/Diff 和节点跳转记录。

  _需求: REQ-021  
  验收标准：REQ-021-AC-001~004  
  _测试类型: Unit + E2E

---

- [ ] **TASK-037 · 真实 AI 服务验收** `BLOCKED`

  > 依赖：TASK-031~036 · 门禁：有效 AI Base/Model/Key 与授权数据 · 预计：2–3 小时

  - [ ] 使用 info.md 配置执行真实摘要、语义、主题和去重请求。
  - [ ] 同时验证无 Key、错误 Key、限流和超时降级路径。
  - [ ] 记录脱敏请求元数据、真实响应结构和用户确认结果。

  **验证方式：**
  ```powershell
  pnpm --dir ui test:ai:real
  ```

  **验收证据：** 真实 AI 调用报告；无凭据时保持 BLOCKED，不得由固定 Mock 代替。

  _需求: REQ-006、REQ-013、REQ-018~021  
  验收标准：REQ-006-AC-002~003、REQ-013-AC-003~004、REQ-018-AC-001~003、REQ-019-AC-002~005、REQ-020-AC-001~004、REQ-021-AC-001~004  
  _测试类型: API + E2E

---

- [x] **TASK-038 · 实现收藏洞察报告**

  > 依赖：TASK-013、TASK-016、TASK-018 · 预计：2–3 小时 · 状态：done · 2026-07-19

  - [x] 实现可追溯的统计与规则洞察卡片。
  - [x] 实现行动项跳转到相关筛选、主题或健康视图。
  - [x] 对空库、少量数据和 10,000 条数据覆盖测试。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/insights
  pnpm --dir ui exec playwright test -g "Insights"
  ```

  **验收证据：** 洞察计算测试、行动跳转和页面截图。

  _需求: REQ-022  
  验收标准：REQ-022-AC-001  
  _测试类型: Unit + E2E

---

- [x] **TASK-039 · 实现手动链接健康扫描与状态入口**

  > 依赖：TASK-009、TASK-013、TASK-022 · 预计：3–4 小时 · 状态：done · 2026-07-19

  - [x] 实现扫描并发限制、取消、事件进度、指纹与 ok/changed/broken 归类。
  - [x] 确保未主动触发时无后台扫描。
  - [x] 接入 Updated/Broken 入口、计数和持久化。

  **验证方式：**
  ```powershell
  go test ./internal/health/... -cover
  pnpm --dir ui exec playwright test -g "链接健康|Updated|Broken"
  ```

  **验收证据：** 本地 HTTP 场景结果、取消事件、无后台请求证明和截图。

  _需求: REQ-022  
  验收标准：REQ-022-AC-002~004  
  _测试类型: API + E2E

---

## 波次 5 · 安全、性能与交付验收

- [x] **TASK-040 · 执行安全与隐私专项测试**

  > 依赖：TASK-026、TASK-031、TASK-032、TASK-039 · 预计：3–4 小时 · 状态：done · 2026-07-19

  - [x] 执行 secret scan、依赖漏洞、RLS、URL、导入和日志脱敏测试。
  - [x] 验证 AI Key 不进入 LibraryData、云、导出、截图或日志。
  - [x] 验证所有破坏性操作和未认证写入均无静默副作用。

  **验证方式：**
  ```powershell
  govulncheck ./...
  pnpm --dir ui audit --audit-level high
  pnpm --dir ui test:security
  ```

  **验收证据：** 安全工具实际输出、RLS/输入 Payload 结果和脱敏检查报告。

  _需求: REQ-003~005、REQ-019~020、REQ-025、REQ-027  
  验收标准：REQ-025-AC-001~005 及相关破坏性操作 AC  
  _测试类型: Security + API

---

- [x] **TASK-041 · 验证 10,000 条性能预算**

  > 依赖：TASK-004、TASK-019~023、TASK-025、TASK-039 · 预计：3–4 小时 · 状态：done · 2026-07-19

  - [x] 在记录的参考环境运行热启动、搜索、筛选、视图切换和本地保存采样。
  - [x] 验证网络操作 300ms 内出现 pending 状态。
  - [x] 输出 P50/P95、样本数、构建模式和原始数据。

  **验证方式：**
  ```powershell
  go test -bench . -benchmem ./internal/...
  pnpm --dir ui test:performance
  ```

  **验收证据：** Benchmark、Playwright timing JSON 和预算对比表。

  _需求: REQ-028  
  验收标准：REQ-028-AC-005~008  
  _测试类型: Performance

---

- [x] **TASK-045 · 优化书签操作入口并实现批量移动删除**

  > 依赖：TASK-011、TASK-013、TASK-015、TASK-016、TASK-018 · 预计：4 小时 · 状态：done · 2026-07-19

  - [x] 在卡片和详情顶部提供可见的 Edit、Move、Delete 入口，统一编辑对话框包含 URL 与全部可编辑字段。
  - [x] 将现有多选提升为通用选择模型，支持选择框、Ctrl/Cmd 与 Shift 范围选择及清空选择。
  - [x] 实现原子批量移动、批量删除、数量确认和主题引用清理。
  - [x] 生成单项与批量操作的 E2E、Baseline、实际截图和 Diff。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/bookmarks src/domain/commands
  pnpm --dir ui exec playwright test tests/e2e/bookmark-actions.spec.ts --workers=1
  ```

  **验收证据：** 领域命令测试、统一编辑/移动/删除旅程、批量原子性、截图与视觉 Diff。

  _需求: REQ-007、REQ-011、REQ-026、REQ-027
  验收标准：REQ-007-AC-005~010、REQ-011-AC-004~005、REQ-026-AC-002~003、REQ-027-AC-002~003
  _测试类型: Unit + E2E

---

- [ ] **TASK-042 · Windows Wails 构建与桌面 E2E**

  > 依赖：TASK-025、TASK-029、TASK-031~041、TASK-045 · 预计：3–4 小时

  - [ ] 在 Windows 构建正式 Wails 应用。
  - [ ] 当 Windows 被选为本发布候选的验收平台时，运行关键桌面旅程并验证 Credential Manager、原生文件对话框、外部浏览器和快捷键。
  - [ ] 始终保存构建产物信息；仅在 Windows 为选定验收平台时保存旅程截图和 Diff。

  **验证方式：**
  ```powershell
  wails build
  pnpm --dir ui exec playwright test tests/e2e/desktop/windows
  ```

  **验收证据：** Windows 构建日志与二进制信息；Windows 为选定验收平台时追加桌面 E2E 和截图。

  _需求: REQ-005、REQ-008、REQ-024、REQ-027、REQ-028  
  验收标准：REQ-027-AC-001、REQ-027-AC-004、REQ-028-AC-004
  _测试类型: E2E + Manual

---

- [ ] **TASK-043 · macOS Wails 构建与桌面 E2E**

  > 依赖：TASK-025、TASK-029、TASK-031~041、TASK-045 · 门禁：可用 macOS runner 或测试设备 · 预计：3–4 小时

  - [ ] 在 macOS 构建正式 Wails 应用。
  - [ ] 当 macOS 被选为本发布候选的验收平台时，执行关键桌面旅程并验证 Keychain、原生对话框、Cmd 快捷键和窗口惯例。
  - [ ] 始终保存构建产物信息；仅在 macOS 为选定验收平台时保存旅程截图和 Diff。

  **验证方式：**
  ```powershell
  wails build
  pnpm --dir ui exec playwright test tests/e2e/desktop/macos
  ```

  **验收证据：** macOS 构建日志与二进制信息；macOS 为选定验收平台时追加桌面 E2E 和截图。

  _需求: REQ-024、REQ-027、REQ-028  
  验收标准：REQ-027-AC-001、REQ-027-AC-004、REQ-028-AC-004
  _测试类型: E2E + Manual

---

- [ ] **TASK-044 · 全量回归、质量评分与发布门禁**

  > 依赖：TASK-040~043、TASK-045 · 预计：3–4 小时

  - [ ] 运行全量 Go、TypeScript、Supabase、E2E、视觉、安全和性能套件。
  - [ ] 确认 Windows 与 macOS 构建均通过，且至少一个选定平台完成完整桌面旅程。
  - [ ] 汇总覆盖率、flaky、BLOCKED、风险和质量评分。
  - [ ] 生成最终 AC 矩阵与测试报告，确认无未解决 P0/P1。

  **验证方式：**
  ```powershell
  go test ./... -coverprofile=coverage/go.out
  pnpm --dir ui test:coverage
  pnpm --dir ui exec playwright test
  pnpm --dir ui build
  ```

  **验收证据：** 全量真实命令输出、Coverage Report、Playwright Report、质量评分和发布结论。

  _需求: REQ-001~028  
  验收标准：全部 130 条 AC
  _测试类型: Unit + API + E2E + Performance + Security + Manual

---

## 进度汇总

| TASK ID | 名称 | 测试类型 | 状态 | 关联需求 |
|---------|------|:--------:|:----:|---------|
| TASK-001 | Wails 与包管理骨架 | Unit/Manual | done | REQ-027 |
| TASK-002 | 测试与 CI 框架 | Unit/E2E | done | REQ-024、028 |
| TASK-003 | 数据 Schema 与迁移 | Unit | done | REQ-026 |
| TASK-004 | 测试 Factory 与性能数据 | Unit/Performance | done | REQ-026、028 |
| TASK-005 | Store、命令与 Repository | Unit | done | REQ-026、027 |
| TASK-006 | 本地原子资料库与云草稿 | Unit/API | done | REQ-002、003、027 |
| TASK-007 | 本地设置服务 | Unit | done | REQ-019、023 |
| TASK-008 | 原生导入导出服务 | Unit/Manual | done | REQ-005、025 |
| TASK-009 | 网页元数据与外部 URL | API/Security | done | REQ-006、008、025 |
| TASK-010 | 本地模式启动恢复 | Unit/E2E | done | REQ-001、002 |
| TASK-011 | 书签核心 CRUD | Unit/E2E | done | REQ-006、007 |
| TASK-012 | 书签状态与访问 | Unit/E2E | done | REQ-008 |
| TASK-013 | 排序与筛选 | Unit | done | REQ-008、009 |
| TASK-014 | 分类 CRUD 与删除 | Unit/E2E | done | REQ-010 |
| TASK-015 | 分类与书签拖拽 | Unit/E2E | done | REQ-011、024 |
| TASK-016 | 主题 CRUD 与成员 | Unit/E2E | done | REQ-012、026 |
| TASK-017 | 手动主题组合 | Unit/E2E | done | REQ-013 |
| TASK-018 | 标签管理 | Unit/E2E | done | REQ-014 |
| TASK-019 | 三种基础视图 | E2E/Manual | 已完成 | REQ-015、028 |
| TASK-020 | 三种聚合视图 | Unit/E2E | 已完成 | REQ-016、028 |
| TASK-021 | Spotlight 关键词与 URL | Unit/E2E | 已完成 | REQ-017 |
| TASK-022 | 主窗口、快捷键与无障碍 | E2E/Security | 已完成 | REQ-024、028 |
| TASK-023 | 设置、主题与 i18n | Unit/E2E | done | REQ-023 |
| TASK-024 | 导入导出 UX | E2E | done | REQ-005、023 |
| TASK-025 | 本地 MVP 回归 | E2E | done | 本地 MVP |
| TASK-026 | Supabase 本地与 RLS | API/Security | done | REQ-003、025 |
| TASK-027 | Supabase Auth | API/E2E | done | REQ-001、002 |
| TASK-028 | CloudRepository | Unit/API | done | REQ-003、027 |
| TASK-029 | 存储切换与冲突 | Unit/E2E | done | REQ-003、004 |
| TASK-030 | 远程 Supabase 验收 | API/Security/E2E | BLOCKED | REQ-001、003、004、025 |
| TASK-031 | SecretStore 与 AI 授权 | Unit/Security/E2E | done | REQ-019、025 |
| TASK-032 | AI 客户端与降级 | API/Security | done | REQ-019、027 |
| TASK-033 | AI 分析与重分析 | API/E2E | done | REQ-006、020 |
| TASK-034 | 语义搜索 | API/E2E | done | REQ-018 |
| TASK-035 | AI 主题与去重 | Unit/API/E2E | done | REQ-013、020 |
| TASK-036 | 推荐与知识网络 | Unit/E2E | done | REQ-021 |
| TASK-037 | 真实 AI 验收 | API/E2E | BLOCKED | REQ-006、013、018~021 |
| TASK-038 | 收藏洞察 | Unit/E2E | done | REQ-022 |
| TASK-039 | 链接健康 | API/E2E | done | REQ-022 |
| TASK-040 | 安全与隐私测试 | Security/API | done | REQ-003~005、019~020、025、027 |
| TASK-041 | 性能预算 | Performance | done | REQ-028 |
| TASK-042 | Windows 桌面验收 | E2E/Manual | 待开始 | REQ-005、008、024、027、028 |
| TASK-043 | macOS 桌面验收 | E2E/Manual | 待开始 | REQ-024、027、028 |
| TASK-044 | 全量回归与发布门禁 | 全类型 | 待开始 | REQ-001~028 |
| TASK-045 | 书签操作与批量移动删除 | Unit/E2E | done | REQ-007、011、026、027 |

---

## 修订记录

| 版本 | 日期 | 状态 | 说明 |
|------|------|------|------|
| 0.1.0 | 2026-07-16 | 草稿 | 按本地优先顺序拆分 44 项任务 |
| 1.0.0 | 2026-07-16 | 已定稿 | 经用户确认后正式生效 |
| 1.1.0 | 2026-07-16 | 已定稿 | 单平台完整桌面旅程加另一平台构建门禁，并将 TASK-001 改绑工程骨架 AC |
| 1.2.0 | 2026-07-17 | 已定稿 | 根据用户指令将 Git Hooks、CI/CD 与配置验收纳入 TASK-002 的工程质量范围 |
| 1.3.0 | 2026-07-19 | 已定稿 | 对齐 REQ-028-AC-006：视图切换 P95 预算调整为 150ms |
| 1.4.0 | 2026-07-19 | 已定稿 | 新增 TASK-045，统一书签操作入口并实现原子批量移动与删除 |
