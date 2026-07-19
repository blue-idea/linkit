# 测试策略简报（Test Strategy）

> 文件路径：`docs/spec/test_strategy.md`  
> 参考方法论：`phases/qa_engine.md` §第1阶段  
> 版本：1.4.0
> 日期：2026-07-19
> 状态：已定稿

---

## 项目信息

```yaml
project:
  name: "Linkit"
  type: desktop-app
  languages: [typescript, go, sql]
  frameworks: [react, wails, supabase]
```

---

## 风险概况

```yaml
risk_profile:
  data_sensitivity: high
  user_impact: b2c
  deployment_frequency: monthly
  regulatory: [none]
```

风险依据：

- 收藏内容、邮箱和云资料库属于用户个人数据。
- 应用处理 Supabase session 和用户自备 AI Key。
- RLS、存储覆盖、导入、删除、去重和云冲突可能造成数据泄露或丢失。
- AI 会在明确授权后向用户配置的第三方服务发送选定收藏内容。

---

## 测试范围

```yaml
test_scope:
  in_scope:
    - "Wails 启动、Go 绑定和 Windows/macOS 构建"
    - "Supabase Auth、RLS、revision 与云冲突"
    - "AppData 原子 JSON、备份、云草稿和导入导出"
    - "Bookmark 单项/批量编辑移动删除、Category、Collection、Tag 领域命令与引用完整性"
    - "六种浏览视图、Spotlight、快捷键、拖拽和 i18n"
    - "OpenAI-compatible AI、授权、降级、语义重排和建议确认"
    - "洞察、手动链接健康和静态知识网络"
    - "10,000 条性能预算、安全、无障碍和视觉回归"
  out_of_scope:
    - "真实网页截图封面：MVP 明确排除"
    - "外部应用分享：MVP 明确排除"
    - "实时多设备协作与三方合并：MVP 明确排除"
    - "公网新 URL 推荐：探索仅限库内"
    - "全库可编辑力导向知识图：MVP 仅静态图"
    - "生产环境写入测试：禁止影响真实用户数据"
```

---

## 测试类型决策

| 测试类型 | 是否执行 | 覆盖目标 | 工具 |
|---------|:-------:|---------|------|
| Go 单元测试 | ✅ | Go Service、文件原子性、URL/错误映射；关键安全路径 100% | `go test` |
| React 单元测试 | ✅ | 领域命令、Zod Schema、迁移、selector、排序筛选；关键路径 100% | Vitest |
| React 组件测试 | ✅ | 主要交互、键盘焦点、错误与降级状态 | React Testing Library + Vitest |
| 集成 / API 测试 | ✅ | Wails DTO、Supabase Auth/RLS/revision、OpenAI-compatible 契约及异常路径 | Go Integration Test、Supabase CLI、实际 HTTP 调用 |
| 桌面 E2E | ✅ | 16 条关键用户旅程在选定目标平台完整执行；另一平台执行 Wails 构建门禁 | Playwright |
| 视觉回归 | ✅ | 登录、主窗口、六视图、详情、设置、冲突与 AI 对话框 | Playwright Screenshot |
| 性能测试 | ✅ | REQ-028：10,000 条数据的启动、交互、保存和进度预算 | Go Benchmark + Playwright 性能采样 |
| 安全测试 | ✅ | RLS、密钥泄露、URL 输入、导入校验、破坏性操作和依赖漏洞 | Supabase 本地测试、`govulncheck`、`pnpm audit`、Secret Scan |
| 无障碍测试 | ✅ | 核心路径达到 WCAG 2.1 AA 自动检查基线 | axe-core + Playwright |
| 人工测试 | ✅ | 选定平台的原生窗口、Keychain/Credential Manager、平台惯例和最终视觉审查 | 记录式检查清单 |

真实云端与真实 AI 用例只有在 `docs/spec/info.md` 对应环境解除 `BLOCKED` 后才能执行。

---

## 关键用户旅程

| ID | 旅程 |
|----|------|
| J-01 | 注册有 session / 无 session 与登录恢复 |
| J-02 | 本地模式启动、编辑、重启恢复与退出登录 |
| J-03 | URL 新增、AI 成功或手动降级、确认入库 |
| J-04 | 书签查看、统一编辑、单项/批量移动删除、星标、置顶、访问和阅读状态 |
| J-05 | 分类树 CRUD、删除策略、拖拽层级和书签归类 |
| J-06 | 主题 CRUD、成员双向关系、拖出组合和 AI 主题确认 |
| J-07 | 标签添加、移除、筛选和采纳 AI 建议 |
| J-08 | Card、List、Masonry、Timeline、Tag Aggregation、Theme Space |
| J-09 | Spotlight 关键词、语义降级、结果定位和 URL 快捷入库 |
| J-10 | JSON 导出、有效导入、无效导入和覆盖确认 |
| J-11 | Local/Cloud 摘要、切换选择、revision 冲突和云草稿恢复 |
| J-12 | Settings、六主题（含 Daylight/Paper 浅色主题）、English/中文切换和英文回退 |
| J-13 | AI consent、重新分析、去重建议、库内推荐和静态知识图 |
| J-14 | Insights、手动健康扫描、取消和 Updated/Broken 筛选 |
| J-15 | 全局快捷键、URL 拖入、Esc 和键盘无障碍 |
| J-16 | 10,000 条性能、选定平台完整桌面旅程与另一平台构建门禁 |

---

## 测试金字塔目标比例

```text
单元测试：65%
集成/API 测试：25%
E2E/视觉/人工测试：10%
```

比例按测试用例的主要责任层统计。性能与安全专项测试单独跟踪，不通过增加 E2E 数量替代底层测试。

---

## 覆盖率目标

| 范围 | 行覆盖率 | 分支覆盖率 | 关键路径 |
|------|:--------:|:----------:|:--------:|
| TypeScript 全局 | ≥85% | ≥80% | 100% |
| Go 全局 | ≥85% | 以显式异常用例审查 | 100% |
| 领域命令、Schema、迁移 | ≥95% | ≥90% | 100% |
| RLS、revision、原子保存、密钥边界 | 100% | 100% | 100% |

覆盖率不能替代断言质量；禁止为提高数字而测试实现细节或添加无意义断言。

---

## 性能预算

| 指标 | 数据基线 | 目标 |
|------|----------|------|
| 热启动至可交互 | 10,000 个书签 | ≤2s |
| 关键词搜索 P95 | 10,000 个书签 | ≤100ms |
| 组合筛选 P95 | 10,000 个书签 | ≤100ms |
| 视图切换 P95 | 10,000 个书签 | ≤150ms |
| 本地保存 P95 | 10,000 个书签 | ≤500ms |
| 网络操作进度提示 | AI、抓取、同步、健康 | ≤300ms |

性能测试必须记录参考硬件、操作系统、构建模式、样本数和原始数据；开发服务器结果不能替代正式构建结果。

---

## 环境配置

```yaml
environments:
  dev_ui:
    url: "http://localhost:5173"
    db: "deterministic fixtures"
  dev_desktop:
    url: "Wails development application"
    db: "isolated AppData test directory"
  local_supabase:
    url: "http://127.0.0.1:54321"
    db: "seeded local Postgres (supabase/seed.sql)"
  staging:
    url: "https://zheqhjsctvkuzmtohrnm.supabase.co"
    db: "linkit staging — schema seeded; full remote AC remains TASK-030"
  prod:
    url: "N/A"
    smoke_only: true
```

---

## 测试数据策略

| 测试层级 | 数据来源 | 清理策略 |
|---------|---------|---------|
| 单元测试 | `info.md` 授权的确定性 Factory | 每用例创建新内存对象 |
| 组件测试 | 固定 fixture + Memory Repository | 每用例卸载并重建 Store |
| Go 文件集成 | 临时隔离目录 | 测试结束后清理；失败时保留诊断路径 |
| Supabase 集成 | `info.md` 测试账号与本地 seed | 每套件事务回滚或删除测试用户行 |
| E2E | 版本控制中的 seed 脚本 | 每用例恢复已知状态 |
| 性能 | 确定性 10,000 条生成器 | 测试后删除生成文件 |
| 真实 AI | `info.md` 环境变量和授权候选数据 | 不持久化外部响应中的敏感信息 |

测试替身仅用于控制外部失败和边界条件；真实 AI、RLS、Keychain 与平台能力的最终验收不得由 Mock 替代。

---

## 视觉与 E2E 证据

- UI 变更必须生成 Baseline、实际截图和 Diff。
- 主题皮肤变更须覆盖六套主题的主窗口，并额外保存 Appearance 设置界面的 Baseline、实际截图与 Diff。
- 每个关键旅程至少保存最终状态截图；破坏性操作、错误、降级和冲突路径保存对话框截图。
- 选定验收平台保存核心窗口、快捷键、Baseline、实际截图与 Diff；另一平台保存 Wails 构建日志。
- 截图不得包含真实 Email、API Key、token 或用户收藏内容。

---

## 质量基线

| 指标 | 目标值 |
|------|-------|
| TypeScript 行覆盖率 | ≥85% |
| TypeScript 分支覆盖率 | ≥80% |
| Go 行覆盖率 | ≥85% |
| 关键路径覆盖率 | 100% |
| E2E 不稳定率 | <2% |
| CI 总耗时 | <20 分钟 / 平台 |
| 高严重度安全问题 | 0 |
| 未解决 P0/P1 缺陷 | 0 |
| 缺陷逃逸率 | <5% |
| 质量评分 | ≥80 / 100 |

---

## BLOCKED 门禁

以下状态不得被报告为 PASS：

| 门禁 | 解除条件 |
|------|----------|
| Supabase Auth/RLS/revision | 可访问本地或远程测试项目、migration 已应用、测试账号已配置 |
| 真实 AI | API Base、Model、Key 已配置并取得测试数据发送授权 |
| 选定平台桌面旅程 | 至少一个目标平台具备可运行 Wails 应用与 Playwright/人工验收环境 |
| 另一平台构建 | 另一个目标平台具备可运行的 Wails 构建 runner；仅要求构建，不重复完整桌面旅程 |
| OS Keychain | 在真实 Windows Credential Manager 与 macOS Keychain 中执行 |

---

## 修订记录

| 版本 | 日期 | 状态 | 说明 |
|------|------|------|------|
| 0.1.0 | 2026-07-16 | 草稿 | 根据风险概况、121 条 AC、性能预算和现有环境状态生成 |
| 1.0.0 | 2026-07-16 | 已定稿 | 经用户确认后正式生效 |
| 1.1.0 | 2026-07-16 | 已定稿 | 用户确认完整桌面旅程任选一个平台执行，另一平台保留 Wails 构建门禁 |
| 1.2.0 | 2026-07-19 | 已定稿 | 用户确认将视图切换 P95 预算调整为 150ms，搜索与筛选继续保持 100ms |
| 1.3.0 | 2026-07-19 | 已定稿 | 增加书签统一编辑入口与批量移动/删除的 Unit、E2E 和视觉回归范围 |
| 1.4.0 | 2026-07-19 | 已定稿 | 将六套主题、两套浅色 color scheme 与主题专属视觉令牌纳入 Unit、E2E 和视觉回归范围 |
