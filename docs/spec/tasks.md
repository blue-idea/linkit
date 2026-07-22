# Linkit 实施计划（Tasks）

> 文件路径：`docs/spec/tasks.md`  
> 版本：3.5.0
> 日期：2026-07-22
> 状态：已定稿

执行时须严格遵循 `docs/spec/requirements.md` 2.12.0、`docs/spec/design.md` 1.11.0 和 `docs/spec/test_strategy.md` 2.3.0。每项生产代码任务必须执行 TDD 红、绿、重构循环。

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

- [x] **TASK-056 · 全界面 UI 语言与设置对齐**

  > 依赖：TASK-023 · 预计：3–4 小时 · 状态：done · 2026-07-20

  - [x] Red：新增词典完整性、全局 Provider、代表性组件与硬编码 UI 审计测试，并扩展 Playwright 双语言旅程；确认测试因未覆盖文案或界面仍混合语言而失败。
  - [x] Green：在应用根部接入 locale 驱动的 i18n 上下文，补齐全部系统 UI 翻译键，将导航、视图、对话框、表单、空态、状态、Toast 与无障碍名称切换到统一翻译接口。
  - [x] Refactor：抽取枚举/状态/数量文案映射，消除重复语言分支；保持领域值、持久化格式、用户自定义内容和既有业务回调不变。
  - [x] 执行 Vitest 覆盖率、类型检查、Lint、构建、Playwright E2E 与视觉回归，保存 English/中文 Baseline、Actual、Diff 和自定义内容不变证据。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/i18n src/components src/features --coverage
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui build
  pnpm --dir ui exec playwright test tests/e2e/settings-i18n.spec.ts tests/visual/ui-language-alignment.spec.ts --workers=1
  ```

  **验收证据：** 词典键完整性、硬编码审计、双语言主窗口与代表性对话框 Baseline/Actual/Diff、自定义内容不变断言、`docs/spec/ac/TASK-056-AC.md` 与 `docs/spec/reports/TASK-056-report.md`。

  _需求: REQ-023
  验收标准：REQ-023-AC-004、REQ-023-AC-005、REQ-023-AC-006、REQ-023-AC-008
  _测试类型: Unit + E2E

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

- [x] **TASK-046 · 优化六套主题皮肤并新增浅色主题**

  > 依赖：TASK-002、TASK-007、TASK-023、TASK-025 · 预计：3–4 小时 · 状态：done · 2026-07-19

  - [x] 先编写失败的主题枚举、Schema、本地化和视觉 token 契约测试，验证 Daylight/Paper 尚未被支持。
  - [x] 扩展 ThemeId、AppSettingsSchema、主题元数据和中英文词典，新增 Daylight 与 Paper，保持默认主题和设置接口不变。
  - [x] 参考 `ck/project` 将 Tailwind `ink`/`accent` 色板及玻璃、描边、阴影、滚动条、焦点状态统一改为六主题 CSS 令牌。
  - [x] 为六套主题生成主窗口和 Appearance 设置界面的 Playwright Baseline、实际截图和 Diff，并验证主题选择可持久化。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/services/settings src/features/settings src/themes.test.js
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui build
  pnpm --dir ui exec playwright test tests/visual/theme-skins.spec.ts --workers=1
  ```

  **验收证据：** 六主题 Schema 与本地化测试、主题 token 契约、六套主窗口截图、Appearance 设置截图、Baseline 与 Diff。

  _需求: REQ-023、REQ-028
  验收标准：REQ-023-AC-003、REQ-023-AC-007、REQ-028-AC-004
  _测试类型: Unit + E2E + Manual

---

- [ ] **TASK-042 · Windows Wails 构建与桌面 E2E**

  > 依赖：TASK-025、TASK-029、TASK-031~041、TASK-045~046 · 预计：3–4 小时

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

  > 依赖：TASK-025、TASK-029、TASK-031~041、TASK-045~046 · 门禁：可用 macOS runner 或测试设备 · 预计：3–4 小时

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

  > 依赖：TASK-040~043、TASK-045~048 · 预计：3–4 小时

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

  _需求: REQ-001~029  
  验收标准：全部 AC（含 REQ-029）
  _测试类型: Unit + API + E2E + Performance + Security + Manual

---

- [x] **TASK-047 · 本地存储目录选择与数据迁移**

  > 依赖：TASK-006、TASK-007、TASK-023 · 预计：4–6 小时

  - [x] 在 `config/storage.go` 增加 `data-root.json` 文件名与引导格式常量。
  - [x] 实现引导根解析、有效数据根解析，以及 `GetDataRoot` / `SelectDataRootDirectory` / `MigrateDataRoot`。
  - [x] 先编写失败测试：目标占用阻止、迁移失败回滚、成功切换后读写新根、密钥不落盘。
  - [x] Settings → Storage 显示当前数据目录，提供文件夹选择与确认摘要；成功/失败使用英文错误码。
  - [x] 迁移成功后清理源已迁文件，引导根仅保留指针；重启后从新根恢复资料库与设置。

  **验证方式：**
  ```powershell
  go test ./internal/localstore/... ./internal/platform/... -count=1 -cover
  pnpm --dir ui test -- storage
  pnpm --dir ui exec playwright test tests/e2e/storage-data-root.spec.ts
  ```

  **验收证据：** Go/Vitest/Playwright 真实输出，AC 矩阵与截图（设置页路径展示、冲突阻止、成功迁移后重启）。

  _需求: REQ-023、REQ-025、REQ-027、REQ-029  
  验收标准：REQ-023-AC-002；REQ-029-AC-001~005  
  _测试类型: Unit + E2E

---

- [x] **TASK-048 · 书签项直接访问入口**

  > 依赖：TASK-012、TASK-019、TASK-020、TASK-045 · 预计：1–2 小时 · 状态：done · 2026-07-19

  - [x] 扩展 `BookmarkItemActions`，提供区别于右侧详情 `Visit` 的 `Open bookmark directly` 图标入口。
  - [x] 将 Card、List、Masonry、Timeline、Tag Aggregation、Theme Space 六种视图统一接入直达入口。
  - [x] 让 List 视图复用共享操作组件，避免 Edit、Move、Delete 与直达入口重复实现。
  - [x] 复用 `visitBookmark` 编排，保证外部打开成功后才更新 visitCount 和 lastVisitedAt。
  - [x] 生成 Unit、E2E、Baseline、实际截图和 Diff 证据。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/views src/features/bookmarks/visit.test.ts
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui build
  pnpm --dir ui exec vitest run
  pnpm --dir ui exec playwright test tests/e2e/bookmark-actions.spec.ts --workers=1
  ```

  **验收证据：** 共享操作组件测试、访问编排测试、六视图 E2E、`TASK-048-direct-access-baseline.png`、`TASK-048-direct-access.png`、`TASK-048-direct-access-diff.png`。

  _需求: REQ-008  
  验收标准：REQ-008-AC-005  
  _测试类型: Unit + E2E

---

- [x] **TASK-049 · Spotlight 搜索结果回车直接访问**

  > 依赖：TASK-012、TASK-021、TASK-048 · 预计：1–2 小时 · 状态：done · 2026-07-19

  - [x] 扩展 Spotlight 搜索结果的键盘确认语义：Enter 对当前高亮书签执行 `Open directly`。
  - [x] 保留鼠标点击搜索结果的详情定位行为，避免与直接访问混淆。
  - [x] 复用 `visitBookmark` 编排，保证外部打开成功后才更新 visitCount 和 lastVisitedAt。
  - [x] 覆盖 Unit、E2E 与截图证据。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/components/Spotlight.test.tsx
  pnpm --dir ui exec playwright test tests/e2e/spotlight.spec.ts --workers=1
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui build
  ```

  **验收证据：** Spotlight 组件测试、Spotlight E2E、`TASK-049-spotlight-direct-open.png`。

  _需求: REQ-017、REQ-008
  验收标准：REQ-017-AC-005、REQ-008-AC-002
  _测试类型: Unit + E2E

---

- [x] **TASK-050 · Collection Emoji 候选图标菜单**

  > 依赖：TASK-016 · 预计：1–2 小时 · 状态：done · 2026-07-19

  - [x] 在 `CollectionFormDialog` 中封装候选 Emoji 菜单，支持创建和编辑主题时选择图标。
  - [x] 保留现有 Collection name、color、description 保存语义；编辑时保存前不改变现有主题。
  - [x] 左侧栏创建/编辑路径均使用菜单选择结果并在保存后显示所选 Emoji。
  - [x] 覆盖 Unit、E2E 与截图证据。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/collections/CollectionFormDialog.test.tsx
  pnpm --dir ui exec playwright test tests/e2e/collection-crud.spec.ts --workers=1
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui build
  ```

  **验收证据：** Collection 表单组件测试、左侧栏创建/编辑 E2E、`TASK-050-collection-emoji-menu.png`。

  _需求: REQ-012
  验收标准：REQ-012-AC-005、REQ-012-AC-001
  _测试类型: Unit + E2E

---

- [x] **TASK-051 · 新建书签 URL 唯一性 warning**

  > 依赖：TASK-011、TASK-033 · 预计：— 小时 · 状态：done · 2026-07-19

  - [x] 在书签领域命令中按规范化 URL 检查重复，重复时返回 `BOOKMARK_URL_DUPLICATE`。
  - [x] 在 New Bookmark 输入阶段检测当前资料库已存在的 URL，显示英文 warning 并阻止进入 Analyze/review。
  - [x] 在 App 保存入口保留重复 URL 兜底，防止绕过输入阶段后创建重复书签。
  - [x] 覆盖 Unit、E2E 与截图证据。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain/commands/bookmarks.test.ts
  pnpm --dir ui exec playwright test tests/e2e/bookmark-crud.spec.ts --workers=1
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui build
  ```

  **验收证据：** 书签领域命令测试、书签 CRUD E2E、`TASK-051-duplicate-url-warning.png`。

  _需求: REQ-006
  验收标准：REQ-006-AC-005、REQ-006-AC-004
  _测试类型: Unit + E2E

---

- [x] **TASK-052 · 主题批量成员命令与候选过滤**

  > 依赖：TASK-016 · 预计：1–2 小时 · 状态：done · 2026-07-19

  - [x] 实现 `batchSetBookmarkCollectionMembership`：一次校验全部 bookmarkIds 与 collectionId，任一无效则整批失败且资料库不变；成功返回单一新 LibraryData 并保持双向一致。
  - [x] 实现 `membership-candidates` 纯函数：排除已成员、按 title/URL 不区分大小写搜索、多选集合。
  - [x] 在 `apply-collection-command` 封装 `runBatchSetMembership` 并投影回 UI 实体。
  - [x] 覆盖加入、移出、部分无效 ID、空列表与取消路径零副作用的 Unit 测试。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain/commands/membership.test.ts src/features/collections/membership-candidates.test.ts src/features/collections/apply-collection-command.test.ts
  pnpm --dir ui typecheck
  ```

  **验收证据：** membership / candidates / apply-collection-command Unit 测试 PASS；`docs/spec/ac/TASK-052-AC.md`、`docs/spec/evidence/TASK-052-evidence.md`。

  _需求: REQ-012、REQ-026
  验收标准：REQ-012-AC-008、REQ-012-AC-009、REQ-012-AC-011、REQ-026-AC-003
  _测试类型: Unit

---

- [x] **TASK-053 · 主题视图添加书签入口与挑选器**

  > 依赖：TASK-052 · 预计：2–3 小时 · 状态：done · 2026-07-19

  - [x] 主题视图工具栏增加英文入口 `Add bookmarks`（仅 `selection.kind === 'collection'`）。
  - [x] 实现 `AddBookmarksToCollectionDialog`：排除已成员、搜索、多选；未选中时 Confirm 禁用；打开与 Cancel/关闭期间零副作用。
  - [x] 空主题态显示 `Add bookmarks` CTA，打开与工具栏相同挑选器。
  - [x] 确认后调用 `runBatchSetMembership(member: true)`，刷新成员列表与计数。
  - [x] 覆盖组件测试与 E2E（含截图证据）。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/collections/AddBookmarksToCollectionDialog.test.tsx
  pnpm --dir ui exec playwright test tests/e2e/collection-membership.spec.ts --workers=1
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  ```

  **验收证据：** 挑选器组件测试、E2E、`TASK-053-add-bookmarks-picker.png`、`TASK-053-empty-add-cta.png`；`docs/spec/ac/TASK-053-AC.md`。

  _需求: REQ-012
  验收标准：REQ-012-AC-006、REQ-012-AC-007、REQ-012-AC-008、REQ-012-AC-009、REQ-012-AC-010
  _测试类型: Unit + E2E

---

- [x] **TASK-054 · 主题视图移出成员**

  > 依赖：TASK-052、TASK-045 · 预计：1–2 小时 · 状态：done · 2026-07-19

  - [x] 主题视图书签项增加 `Remove from collection`，立即 `member: false`，不删除书签。
  - [x] 选择模式下主题视图批量栏增加 `Remove from collection`；确认对话框展示数量，确认前零副作用，确认后批量移出。
  - [x] 移出后主题视图与侧栏计数同步；书签仍在资料库。
  - [x] 覆盖组件/Unit 与 E2E（含截图证据）。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/views/BookmarkItemActions.test.tsx src/features/collections/apply-collection-command.test.ts src/features/collections/RemoveFromCollectionDialog.test.tsx
  pnpm --dir ui exec playwright test tests/e2e/collection-membership.spec.ts --workers=1
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui build
  ```

  **验收证据：** 移出相关 Unit、E2E、`TASK-054-remove-from-collection.png`；`docs/spec/ac/TASK-054-AC.md`。

  _需求: REQ-012、REQ-026
  验收标准：REQ-012-AC-011、REQ-026-AC-003
  _测试类型: Unit + E2E

- [x] **TASK-055 · 开发/正式本机身份槽隔离**
  - **绑定：** REQ-025-AC-006；原则 15；DATA-INV-014
  - **目标：** 开发构建使用 `Linkit-Dev` AppData/Keychain，正式构建使用 `Linkit`；发布产物不含开发身份与开发者用户数据。
  - [x] 以失败测试驱动 `config/identity*.go` 身份常量（release /dev）。
  - [x] 迁移 `AppDataDirectoryName`、`SecretServiceName`、`AppTitle` 至身份文件。
  - [x] 提供 `scripts/dev.ps1` / `scripts/dev.sh` 与 `scripts/check-identity`。
  - [x] CI 增加 `go test -tags=dev ./config`；Release 增加正式身份断言与产物扫描。
  - [x] 对齐 `docs/spec` 与 `docs/knowledge/打包.md`。

  **验证方式：**
  ```powershell
  go test ./config -count=1
  go test -tags=dev ./config -count=1
  go run ./scripts/check-identity
  go run -tags=dev ./scripts/check-identity -write-probe
  ```

  **验收证据：** `docs/spec/ac/TASK-055-AC.md`、`docs/spec/evidence/TASK-055-evidence.md`。

  _需求: REQ-025
  验收标准：REQ-025-AC-006
  _测试类型: Unit

---

---

- [x] **TASK-057 · 按变更影响优化 E2E 与发布门禁**

  > 依赖：TASK-002、TASK-044 · 预计：2–3 小时 · 状态：done · 2026-07-21

  - [x] Red：新增影响选择器测试，覆盖功能域、共享基础设施、文档、直接测试文件、视觉与未知生产代码场景。
  - [x] Green：实现集中式路径映射与安全升级规则，输出 PR 可消费的 E2E/视觉测试集合。
  - [x] Refactor：PR 运行 Smoke 与受影响测试，main 运行全量 E2E/视觉，Release 校验同 SHA 主干 CI 并执行关键旅程后再构建。
  - [x] 规定未执行且确认不受影响的用例标记为 `NOT_RUN_UNAFFECTED`，不得标记为 PASS。

  **验证方式：**
  ```powershell
  pnpm --dir ui test:e2e:impact:test
  pnpm --dir ui verify:quality-config
  pnpm --dir ui lint
  pnpm --dir ui typecheck
  pnpm --dir ui build
  ```

  **验收证据：** 影响选择器真实测试输出、CI/Release 工作流、测试策略与追溯矩阵。

  _需求: REQ-024、REQ-028
  验收标准：REQ-024-AC-006、REQ-028-AC-004
  _测试类型: Unit + E2E

---

- [x] **TASK-058 · 合并 Coverage 并减少非必要 E2E**

  > 依赖：TASK-057 · 预计：2–3 小时 · 状态：done · 2026-07-21

  - [x] Red：增加质量配置断言，禁止同一 CI 重复执行普通 Vitest 与 Coverage；增加文档、纯 Go 和浏览器门禁测试。
  - [x] Green：以单次 `test:coverage` 承担 300 项测试及覆盖率报告；PR/main 统一按变更影响选择浏览器测试。
  - [x] Refactor：删除重复影响域；无浏览器影响时跳过 Playwright 安装与执行；定时和手动工作流保留全量 E2E/视觉。

  **验证方式：**
  ```powershell
  pnpm --dir ui verify:quality-config
  pnpm --dir ui test:e2e:impact:test
  pnpm --dir ui test:coverage
  pnpm --dir ui lint
  pnpm --dir ui typecheck
  pnpm --dir ui build
  ```

  **验收证据：** Coverage 单次执行结果、9 项影响选择测试、质量配置契约与远程 CI 日志。

  _需求: REQ-024、REQ-028
  验收标准：REQ-024-AC-006、REQ-028-AC-004
  _测试类型: Unit + E2E

---

- [x] **TASK-059 · 关闭隐藏、系统托盘与窗口显隐全局热键**

  > 依赖：TASK-007、TASK-022 · 预计：3–4 小时 · 状态：done（Unit）；Manual → TASK-061 · 2026-07-21

  - [x] Red：为 `HideWindowOnClose`/`allowQuit`、托盘 Show/Quit 回调、`internal/hotkey` 注册/替换/失败码编写失败的 Go 单元测试；确认因能力缺失而失败。
  - [x] Green：实现 `OnBeforeClose` 隐藏、托盘菜单、`SystemService`（Show/Hide/Quit/SetToggleWindowHotkey/GetDesktopCapability）与系统级默认 `CmdOrCtrl+L`；Linux 失败时降级并返回稳定错误。
  - [x] Refactor：将托盘与热键封装到 `internal/tray`、`internal/hotkey`；桌面态前端不重复绑定 `toggleWindow`。
  - [x] 在选定目标平台执行 Manual 检查清单（OS 关闭隐藏、托盘 Show/Quit、隐藏态全局热键）；另一平台保留 Wails 构建门禁；Linux 记 best-effort。

  **验证方式：**
  ```powershell
  go test ./internal/hotkey ./internal/tray ./internal/platform -count=1
  go test ./config -count=1
  ```

  **验收证据：** Go 测试输出、Manual 检查记录与截图/日志、`docs/spec/ac/TASK-059-AC.md`、`docs/spec/evidence/TASK-059-evidence.md`、`docs/spec/reports/TASK-059-report.md`。

  _需求: REQ-030、REQ-027
  验收标准：REQ-030-AC-001~005、REQ-030-AC-010
  _测试类型: Unit + Manual

---

- [x] **TASK-060 · Settings→Shortcuts 可配置绑定与冲突检测**

  > 依赖：TASK-059、TASK-023、TASK-056 · 预计：3–4 小时 · 状态：done · 2026-07-21

  - [x] Red：扩展 `AppSettingsSchema.shortcuts`、默认合并、冲突检测纯函数与 Shortcuts 分区组件测试，确认因字段/分区缺失而失败。
  - [x] Green：实现 Shortcuts 设置分区、九项 action 列表、改绑保存、恢复默认、本地持久化；保存 `toggleWindow` 时调用 `SetToggleWindowHotkey`；`useGlobalShortcuts` 读取设置且桌面态跳过 `toggleWindow`。
  - [x] Refactor：抽取 accelerator 解析/展示与冲突检测到可复用模块；补齐 en/zh 文案键。
  - [x] E2E：Settings 可见 Shortcuts；列表完整；冲突拒绝；恢复默认；改绑后应用内快捷键按新绑定生效。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/domain src/features/shell src/features/settings src/components/SettingsDialog --coverage
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui exec playwright test -g "Shortcuts|快捷键设置" --workers=1
  ```

  **验收证据：** Vitest/Playwright 真实输出、Shortcuts 分区截图、`docs/spec/ac/TASK-060-AC.md`、`docs/spec/evidence/TASK-060-evidence.md`、`docs/spec/reports/TASK-060-report.md`。

  _需求: REQ-030、REQ-023、REQ-024
  验收标准：REQ-030-AC-006~009、REQ-023-AC-001、REQ-024-AC-002~003
  _测试类型: Unit + E2E

---

- [x] **TASK-061 · 托盘与快捷键跨平台验收（Win/mac + Linux best-effort）**

  > 依赖：TASK-059、TASK-060 · 预计：1–2 小时 · 状态：done · 2026-07-21

  - [x] 在选定验收平台执行 J-17：OS 关闭隐藏、托盘 Show/Quit、全局显隐热键、Shortcuts 改绑后全局热键同步。
  - [x] 记录另一目标平台 Wails 构建门禁结果；Linux 托盘/热键按能力探测记 best-effort 或 BLOCKED，禁止假 PASS。
  - [x] 汇总 TASK-059/060 证据，关闭 `fix_task` 1.8。

  **验证方式：**
  ```powershell
  # 选定平台 Manual J-17 + 另一平台：
  wails build
  ```

  **验收证据：** J-17 检查清单、构建日志、`docs/spec/ac/TASK-061-AC.md`、`docs/spec/reports/TASK-061-report.md`；`fix_task.md` 1.8 勾选。

  _需求: REQ-030、REQ-027
  验收标准：REQ-030-AC-001~010、REQ-027-AC-001
  _测试类型: Manual

---

- [x] **TASK-062 · uiSize 预设、Schema 与 SetMainWindowSize / 冷启动尺寸**

  > 依赖：TASK-007、TASK-059 · 预计：2–3 小时 · 状态：done · 2026-07-21

  - [x] Red：为 `config` 四档预设映射、`AppSettings.uiSize` 缺省合并与非法值拒绝、`SystemService.SetMainWindowSize`（mock `WindowRuntime.SetSize`）、冷启动从 settings 解析 Width/Height 编写失败的单元测试。
  - [x] Green：在 `config/` 与 `ui/src/config/` 落地一致预设；扩展 Zod / Go settings 校验；实现 `SetMainWindowSize` + Wails `WindowSetSize`；`main` 在 `wails.Run` 前按 `uiSize` 设置 `options.App.Width/Height`；不得持久化手动拖拽宽高。
  - [x] Refactor：抽取 `ResolveWindowSize(uiSize)` 供 Go 启动与 API 共用；错误码 `WINDOW_SIZE_INVALID` 进入 `config`。
  - [x] Manual/冒烟：J-18 用户 2026-07-21 确认。

  **验证方式：**
  ```powershell
  go test ./config ./internal/platform ./internal/settingsstore -count=1
  pnpm --dir ui exec vitest run src/domain src/config src/services/settings --coverage
  ```

  **验收证据：** Go/Vitest 真实输出、`docs/spec/ac/TASK-062-AC.md`、`docs/spec/evidence/TASK-062-evidence.md`、`docs/spec/reports/TASK-062-report.md`。

  _需求: REQ-031
  验收标准：REQ-031-AC-002~005
  _测试类型: Unit + Manual

---

- [x] **TASK-063 · Appearance 窗口大小 UI、保存应用与 i18n**

  > 依赖：TASK-062、TASK-023、TASK-056 · 预计：2–3 小时 · 状态：done · 2026-07-21

  - [x] Red：Appearance 四档选项组件测试与 i18n 键测试因缺失失败；E2E 骨架断言 Settings→Appearance 可见 Small/Medium/Large/Extra large（中文：小/中/大/超大）。
  - [x] Green：Appearance 增加 Window size 选择组；保存时写入 `uiSize` 并调用 `SetMainWindowSize`；en/zh 文案对齐；档位枚举值不随语言改变。
  - [x] Refactor：复用主题选择按钮交互模式；文案仅走 catalogs。
  - [x] E2E：四档可发现、语言切换标签正确；截图留证。
  - [x] Manual J-18；`fix_task` 1.9 已关闭。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/components/SettingsDialog src/i18n src/features/settings --coverage
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui exec playwright test -g "Appearance|窗口大小|uiSize" --workers=1
  ```

  **验收证据：** Vitest/Playwright 输出、Appearance 截图、`docs/spec/ac/TASK-063-AC.md`、`docs/spec/evidence/TASK-063-evidence.md`、`docs/spec/reports/TASK-063-report.md`；`fix_task.md` 1.9 勾选。

  _需求: REQ-031、REQ-023
  验收标准：REQ-031-AC-001、REQ-031-AC-006、REQ-023-AC-001
  _测试类型: Unit + E2E + Manual

---

- [x] **TASK-064 · 修复 Windows 托盘 Quit 无法退出**

  > 依赖：TASK-059、TASK-061 · 预计：1–2 小时 · 状态：done · 2026-07-22

  - [x] Red：增加退出前清理顺序与托盘回调非阻塞测试，复现同步 Quit 回调和 Windows 消息线程生命周期问题。
  - [x] Green：Windows 托盘使用锁定 OS 线程的 `systray.Run`；Show/Quit 回调异步派发；Wails Quit 前先停止托盘。
  - [x] Refactor：按 build tag 拆分 Windows 与非 Windows Runner；macOS/Linux 继续使用 `RunWithExternalLoop`。
  - [x] QA：Go 全量测试、`go vet`、Wails Windows 构建通过；Windows 原生 Show 与 Quit 验收通过。
  - [x] 跨平台审查：macOS/Linux 不使用 Windows HWND 消息线程路径；共享退出顺序修复同时生效，原生运行验收保留给对应平台环境。

  **验证方式：**
  ```powershell
  go test ./... -count=1
  go vet ./...
  wails build
  ```

  **验收证据：** `docs/spec/ac/TASK-064-AC.md`、`docs/spec/evidence/TASK-064-evidence.md`、`docs/spec/reports/TASK-064-report.md`；用户于 2026-07-22 确认 Windows 托盘 Quit 可正常退出。

  _需求: REQ-030
  验收标准：REQ-030-AC-002、REQ-030-AC-003、REQ-030-AC-004、REQ-030-AC-010
  _测试类型: Unit + Manual

---

- [x] **TASK-065 · 托盘 Show 替换为 Settings**

  > 依赖：TASK-059、TASK-064 · 预计：1–2 小时 · 状态：done · 2026-07-22

  - [x] Red：Go 菜单测试期望 `Settings`/`OnSettings` 并因能力缺失失败；Vitest 事件订阅测试因模块缺失失败。
  - [x] Green：托盘第一项改为 `Settings`；点击时显示窗口并发送 `linkit:open-settings`，React 订阅后打开现有设置弹窗。
  - [x] Refactor：将既有 Wails 事件订阅器抽到共享 Service，健康扫描保留兼容导出，事件名集中到 `config/`。
  - [x] Quit 保护：未修改 `QuitApplication`、退出前托盘清理或 Windows 消息线程业务；原生第二项 Quit 回归正常退出。
  - [x] Windows 原生验收：关闭隐藏后触发托盘 Settings，窗口恢复且设置弹窗打开；保存脱敏裁剪截图。

  **验证方式：**
  ```powershell
  go test ./... -count=1
  go vet ./...
  pnpm --dir ui test --run
  pnpm --dir ui quality
  wails build
  ```

  **验收证据：** `docs/spec/ac/TASK-065-AC.md`、`docs/spec/evidence/TASK-065-evidence.md`、`docs/spec/evidence/TASK-065-tray-settings.png`、`docs/spec/reports/TASK-065-report.md`。

  _需求: REQ-030
  验收标准：REQ-030-AC-002、REQ-030-AC-003、REQ-030-AC-004
  _测试类型: Unit + Manual

---

- [x] **TASK-066 · 修复设置保存反馈与窗口大小重启恢复**

  > 依赖：TASK-060、TASK-062、TASK-063 · 预计：2–3 小时 · 状态：done · 2026-07-22

  - [x] Red：设置持久化测试复现 `uiSize` 在 UI/Domain 映射中丢失；桌面热键适配测试复现未变更绑定仍重复注册；组件测试复现保存失败时无反馈。
  - [x] Green：完整映射 `uiSize` 与快捷键；仅在显隐热键实际变化时重注册；保存中禁用按钮并在失败时显示本地化错误。
  - [x] Refactor：复用设置提交函数，统一普通保存与 AI consent 保存的异步状态处理。
  - [x] QA：Vitest 相关与全量回归、TypeScript/ESLint、Go 全量测试、Wails 构建；Windows 原生验证冷启动恢复。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/auth/persist-ui-settings.test.ts src/features/shell/desktop-hotkey.test.ts src/components/SettingsDialog.test.tsx
  pnpm --dir ui test --run
  pnpm --dir ui quality
  go test ./... -count=1
  go vet ./...
  wails build
  ```

  **验收证据：** `docs/spec/ac/TASK-066-AC.md`、`docs/spec/evidence/TASK-066-evidence.md`、`docs/spec/reports/TASK-066-report.md`、Windows 原生脱敏截图。

  _需求: REQ-031、REQ-023、REQ-030
  验收标准：REQ-031-AC-003~005、REQ-023-AC-001、REQ-030-AC-007
  _测试类型: Unit + Component + Manual

---

- [x] **TASK-067 · 新建书签图标（元数据图片与文字回退）**

  > 依赖：TASK-009、TASK-033、TASK-011 · 预计：2–3 小时 · 状态：done · 2026-07-22

  - [x] Red：`resolveBookmarkIcon`、Favicon 图片渲染、`buildInboundAnalysis.faviconUrl` 单元测试先失败。
  - [x] Green：入库分析透传 `faviconUrl`；预览与保存统一图标策略；`Favicon` 支持 http(s) 图片与加载失败回退。
  - [x] Refactor：图标逻辑集中于 `ui/src/features/bookmarks/icon.ts`。
  - [x] QA：Vitest 与 typecheck 通过；E2E 回归 `bookmark-crud`（若环境可用）。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/features/bookmarks/icon.test.ts src/components/ui.test.tsx src/features/ai/bookmark-analysis/bookmark-analysis.test.ts
  pnpm --dir ui typecheck
  pnpm --dir ui exec playwright test tests/e2e/bookmark-crud.spec.ts --workers=1
  ```

  **验收证据：** `docs/spec/ac/TASK-067-AC.md`、`docs/spec/evidence/TASK-067-evidence.md`。

  _需求: REQ-006
  验收标准：REQ-006-AC-006
  _测试类型: Unit + E2E

---

- [x] **TASK-068 · 书签图标领域持久化（信封 round-trip）**

  > 依赖：TASK-067、TASK-003 · 预计：2–3 小时 · 状态：done · 2026-07-22

  - [x] Red：`icon-persistence` round-trip、`toCategoryLibrary` 不再丢弃 favicon 的测试。
  - [x] Green：领域 Schema `favicon`（URL/glyph≤8）+ `faviconColor`；映射与迁移；编辑保存写入领域。
  - [x] Green：新建/编辑 `BookmarkIconEditor`；有 favicon 默认网站图标，否则文字+随机色；Go `faviconDataUrl` 与 `FetchFaviconDataURL`。
  - [x] Refactor：图标持久化集中于 `icon-persistence.ts` / `domain/bookmark-icon.ts`；Supabase migration 与远程版本对齐。
  - [x] QA：Go test + Vitest + typecheck；用户 Manual 确认新建书签图标流程。

  **验证方式：**
  ```powershell
  go test ./internal/metadata/... ./config/... -count=1
  pnpm --dir ui exec vitest run src/features/bookmarks src/domain/library.test.ts src/components/ui.test.tsx
  pnpm --dir ui typecheck
  ```

  **验收证据：** `docs/spec/ac/TASK-068-AC.md`、`docs/spec/evidence/TASK-068-evidence.md`。

  _需求: REQ-006
  验收标准：REQ-006-AC-007
  _测试类型: Unit + Integration

---

- [x] **TASK-069 · 修复 AI 新建书签标签匹配与复用**

  > 依赖：TASK-018、TASK-033 · 对齐：fix_task 1.11 · 预计：1–2 小时 · 状态：done · 2026-07-22

  - [x] Red：复现 AI 建议标签因语言翻译或分隔符差异无法映射到现有 Tag，保存后书签标签为空。
  - [x] Green：AI 提示词优先返回候选标签原始 label；前端以 Unicode、大小写和常见分隔符规范化进行保守匹配。
  - [x] Green：仅复用唯一命中的现有标签；未命中建议不在新建书签流程自动创建，避免标签膨胀。
  - [x] Refactor：将标签建议匹配从 `Dialogs.tsx` 抽取为纯函数，复用单次索引，禁止新增网络请求或数据库结构。
  - [x] QA：Go 提示词契约测试、Vitest 关键路径与覆盖率、Playwright 新建书签 AI 成功旅程。

  **验证方式：**
  ```powershell
  go test ./internal/ai -count=1 -cover
  pnpm --dir ui exec vitest run src/features/tags/suggested-tag-matching.test.ts
  pnpm --dir ui exec vitest run src/features/ai/bookmark-analysis src/features/tags
  pnpm --dir ui exec playwright test tests/e2e/ai-bookmark-analysis.spec.ts --workers=1
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  ```

  **验收证据：** `docs/spec/ac/TASK-069-AC.md`、`docs/spec/evidence/TASK-069-evidence.md`、`docs/spec/reports/TASK-069-report.md`。

  _需求: REQ-006、REQ-014
  验收标准：REQ-006-AC-002、REQ-006-AC-004、REQ-014-AC-003
  _测试类型: Unit + API + E2E

---

- [x] **TASK-070 · 限制 AI 书签摘要为 200 字以内**

  > 依赖：TASK-032、TASK-033 · 对齐：fix_task 1.12 · 预计：1 小时 · 状态：done · 2026-07-22

  - [x] Red：提示词缺少长度约束，服务解析 201 个中文字符时原样返回。
  - [x] Green：在 `config` 集中定义摘要上限，提示词显式要求最多 200 个 Unicode 字符。
  - [x] Green：服务解析边界复用 Unicode 安全截断函数，模型忽略指令时仍保证上限。
  - [x] Refactor：不新增网络调用、数据库字段或前端重复截断逻辑。
  - [x] QA：Go 目标测试、包覆盖率、全量测试与 `go vet` 通过。

  **验证方式：**
  ```powershell
  go test ./internal/ai -run "TestBuildAnalyzeBookmarkSystemPromptLocale|TestParseAnalyzeResultEnforcesSummaryRuneLimit|TestAnalyzeAndReanalyzeLimitSummaryWithoutExtraAIRequests" -count=1
  go test ./internal/ai -count=1 -cover
  go test ./config/... -count=1
  go test ./... -count=1
  go vet ./...
  ```

  **验收证据：** `docs/spec/ac/TASK-070-AC.md`、`docs/spec/evidence/TASK-070-evidence.md`、`docs/spec/reports/TASK-070-report.md`。

  _需求: REQ-006
  验收标准：REQ-006-AC-008
  _测试类型: Unit + API

---

- [x] **TASK-071 · 新建书签 Manual 与 Smart 双入口**

  > 依赖：TASK-011、TASK-033、TASK-067 · 对齐：fix_task 1.13 · 预计：1–2 小时 · 状态：done · 2026-07-22

  - [x] Red：组件测试先证明 Manual/Smart 按钮与 Manual 零 AI 行为尚不存在；E2E 骨架先因入口缺失失败。
  - [x] Green：复用元数据手动预览编排，Manual 仅获取元数据；Smart 与 URL Enter 复用原智能分析。
  - [x] Refactor：抽取输入校验与预览状态应用逻辑，避免 Manual/Smart 重复处理 URL、图标与预览字段。
  - [x] QA：Vitest、typecheck、lint、build、Playwright 功能旅程及 Baseline/Actual/Diff。

  **验证方式：**
  ```powershell
  pnpm --dir ui exec vitest run src/components/NewBookmarkDialog.entry-modes.test.tsx src/features/bookmarks/analysis.test.ts
  pnpm --dir ui typecheck
  pnpm --dir ui lint
  pnpm --dir ui build
  pnpm --dir ui exec playwright test tests/e2e/new-bookmark-entry-modes.spec.ts --workers=1
  ```

  **验收证据：** `docs/spec/ac/TASK-071-AC.md`、`docs/spec/evidence/TASK-071-evidence.md`、`docs/spec/reports/TASK-071-report.md`。

  _需求: REQ-006
  验收标准：REQ-006-AC-001、REQ-006-AC-004、REQ-006-AC-009
  _测试类型: Component + E2E

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
| TASK-046 | 六主题皮肤与浅色主题 | Unit/E2E/Manual | done | REQ-023、028 |
| TASK-047 | 本地存储目录与数据迁移 | Unit/E2E | done | REQ-023、025、027、029 |
| TASK-048 | 书签项直接访问入口 | Unit/E2E | done | REQ-008 |
| TASK-049 | Spotlight 搜索结果回车直接访问 | Unit/E2E | done | REQ-017、008 |
| TASK-050 | Collection Emoji 候选图标菜单 | Unit/E2E | done | REQ-012 |
| TASK-051 | 新建书签 URL 唯一性 warning | Unit/E2E | done | REQ-006 |
| TASK-052 | 主题批量成员命令与候选过滤 | Unit | done | REQ-012、026 |
| TASK-053 | 主题视图添加书签入口与挑选器 | Unit/E2E | done | REQ-012 |
| TASK-054 | 主题视图移出成员 | Unit/E2E | done | REQ-012、026 |
| TASK-055 | 开发/正式本机身份槽隔离 | Unit | done | REQ-025 |
| TASK-056 | 全界面 UI 语言与设置对齐 | Unit/E2E | done | REQ-023 |
| TASK-057 | 变更影响 E2E 与发布门禁 | Unit/E2E | done | REQ-024、028 |
| TASK-058 | 合并 Coverage 与精简 E2E | Unit/E2E | done | REQ-024、028 |
| TASK-059 | 关闭隐藏、托盘与显隐全局热键 | Unit/Manual | done | REQ-030、027 |
| TASK-060 | Settings→Shortcuts 可配置绑定 | Unit/E2E | done | REQ-030、023、024 |
| TASK-061 | 托盘与快捷键跨平台验收 | Manual | done | REQ-030、027 |
| TASK-062 | uiSize 预设、Schema 与冷启动尺寸 | Unit/Manual | done | REQ-031 |
| TASK-063 | Appearance 窗口大小 UI 与 i18n | Unit/E2E/Manual | done | REQ-031、023 |
| TASK-064 | 修复 Windows 托盘 Quit 无法退出 | Unit/Manual | done | REQ-030 |
| TASK-065 | 托盘 Show 替换为 Settings | Unit/Manual | done | REQ-030 |
| TASK-066 | 修复设置保存反馈与窗口大小重启恢复 | Unit/Component/Manual | done | REQ-031、023、030 |
| TASK-067 | 新建书签图标（元数据图片与文字回退） | Unit/E2E | done | REQ-006 |
| TASK-068 | 书签图标领域持久化 | Unit/Integration | done | REQ-006 |
| TASK-069 | AI 新建书签标签匹配与复用 | Unit/API/E2E | done | REQ-006、014 |
| TASK-070 | AI 书签摘要 200 字限制 | Unit/API | done | REQ-006 |
| TASK-071 | 新建书签 Manual 与 Smart 双入口 | Component/E2E | done | REQ-006 |

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
| 1.5.0 | 2026-07-19 | 已定稿 | 新增 TASK-046，参考 `ck/project` 优化六主题皮肤并加入 Daylight 与 Paper |
| 1.6.0 | 2026-07-19 | 已定稿 | 新增 TASK-047，覆盖 REQ-029 本地存储目录选择与数据迁移 |
| 1.7.0 | 2026-07-19 | 已定稿 | 新增 TASK-048，六种书签视图提供区别于右侧详情 Visit 的直接访问入口 |
| 1.8.0 | 2026-07-19 | 已定稿 | 新增 TASK-049，Spotlight 搜索结果 Enter 确认直接访问高亮书签网站 |
| 1.9.0 | 2026-07-19 | 已定稿 | 新增 TASK-050，侧栏新建/编辑 Collection 时通过候选 Emoji 菜单选择主题图标 |
| 2.0.0 | 2026-07-19 | 已定稿 | 新增 TASK-051，新建书签 URL 规范化后唯一，重复时 warning 并阻止下一步 |
| 2.1.0 | 2026-07-19 | 已定稿 | 新增 TASK-052~054，主题视图手动添加/移出书签（REQ-012-AC-006~011） |
| 2.2.0 | 2026-07-20 | 已定稿 | 新增 TASK-055，开发/正式本机身份槽隔离（REQ-025-AC-006） |
| 2.3.0 | 2026-07-20 | 已定稿 | 新增 TASK-056，全界面非自定义 UI 文案与无障碍名称跟随设置语言 |
| 2.4.0 | 2026-07-21 | 已定稿 | 新增 TASK-057，PR 按变更影响执行测试，main 全量回归，Release 校验同 SHA 质量门禁 |
| 2.5.0 | 2026-07-21 | 已定稿 | 新增 TASK-058，合并 Vitest/Coverage 重复执行，PR/main 精简非必要浏览器测试，定时保留全量回归 |
| 2.6.0 | 2026-07-21 | 已定稿 | 新增 TASK-059~061，覆盖 REQ-030 关闭隐藏/托盘/全局热键与 Shortcuts 设置 |
| 2.7.0 | 2026-07-21 | 已定稿 | 新增 TASK-062~063，覆盖 REQ-031 Appearance 窗口大小 |
| 2.8.0 | 2026-07-22 | 已定稿 | 新增 TASK-064，修复 Windows 托盘消息线程与 Wails 退出顺序导致的 Quit 无法退出 |
| 2.9.0 | 2026-07-22 | 已定稿 | 新增 TASK-065，将托盘 Show 替换为 Settings 并保持 Quit 业务不变 |
| 3.0.0 | 2026-07-22 | 已定稿 | 完成 TASK-066，修复设置保存无反馈与 uiSize 冷启动恢复回归 |
| 3.1.0 | 2026-07-22 | 已定稿 | 完成 TASK-067，新建书签元数据 favicon 与文字图标稳定背景色 |
| 3.2.0 | 2026-07-22 | 已定稿 | 完成 TASK-068，书签图标与背景色在 library 信封中 round-trip 持久化 |
| 3.3.0 | 2026-07-22 | 已定稿 | 完成 TASK-069，修复 AI 标签候选复用、保守匹配与新建流程标签膨胀风险 |
| 3.4.0 | 2026-07-22 | 已定稿 | 完成 TASK-070，AI 书签摘要提示词与服务结果限制为最多 200 个 Unicode 字符 |
| 3.5.0 | 2026-07-22 | 已定稿 | 完成 TASK-071，New Bookmark 提供 Manual 零 AI 与 Smart/Enter 智能分析双入口 |
