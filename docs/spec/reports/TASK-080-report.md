# TASK-080 测试报告

> 任务：REQ-035 / TASK-080：浏览器书签导入后 AI 分类与标签整理
> 版本 / Sprint / 发布：TASK-080
> 报告日期：2026-08-09
> 执行人：Codex

## 摘要

- **状态：** ⚠️ 风险通过
- **自动化测试：** AI 整理 Unit 4；浏览器组件 5；全量 Vitest 108 个文件 / 450 个测试；浏览器 E2E 2；视觉 CLI 3；Go 2 个包
- **通过：** 所有已执行自动化用例通过
- **失败：** 0
- **BLOCKED：** 真实第三方 AI 成功态 1 项；Playwright MCP AI toast 视觉路径 1 项
- **覆盖率：** 全局 TypeScript 行 76.86%、分支 78.70%；`browser-import-ai.ts` 行 89.71%、分支 69.84%
- **持续时间：** 全量 Vitest 20.86s（coverage 21.9s）；浏览器 E2E 最终复跑 9.6s；视觉 CLI 最终复跑 14.2s；Vite build 11.32s

确认后的浏览器导入先成功落库，再对本批次新增书签执行既有 AI 元数据/分析链路。AI 不可用、未授权、超时或单条失败时不回滚导入；成功时优先复用已有标签，并将每条书签的唯一标签限制为最多 3 个。异步合并只写分类和 AI 增量标签，不覆盖用户在导入后编辑的标题、描述、分类或标签。

## 质量评分

| 维度 | 权重 | 得分 | 备注 |
|------|:---:|:---:|------|
| 测试覆盖率 | 20% | 15 | 任务模块行覆盖 89.71%，全局行覆盖 76.86% |
| 关键路径覆盖率 | 20% | 20 | REQ-035-AC-004、REQ-006-AC-002、REQ-014-AC-003 自动化路径均覆盖 |
| 缺陷逃逸率 | 15% | 15 | 用户编辑竞态、标签歧义和全重复零副作用均在最终门禁前发现并修复 |
| 测试套件速度 | 10% | 10 | 全量 coverage 21.9s；任务级 E2E/Visual 均小于 1 分钟 |
| 不稳定率 | 10% | 10 | 本轮无 flaky |
| 安全测试覆盖率 | 10% | 7 | AI 失败降级、无授权不请求、标签上限和专有字段边界已覆盖；真实 Keychain/第三方成功态未执行 |
| 文档 | 5% | 5 | TASK、traceability、AC、evidence、报告已同步 |
| 自动化比例 | 10% | 7 | AI 逻辑与降级自动化充分；真实第三方成功态按门禁 BLOCKED |
| **总分** | **100%** | **89** | **良好（真实外部依赖风险通过）** |

## 关键发现

### 🔴 致命

无。

### 🟡 高

1. `docs/spec/info.md` 无可用第三方 AI 测试凭据，无法证明真实成功态；不得用 Mock 替代，解除凭据门禁后需补跑。
2. Playwright MCP 固定访问 `C:\Users\%USERNAME%\...`，无法生成 AI 整理 toast 的 MCP 截图；CLI 视觉入口与摘要回归已通过。

### 🟢 中 / 低

1. Vite chunk size warning 为既有构建提示，与 AI 导入逻辑无关。
2. AI 合并是后台异步路径，生产环境应继续观察真实服务超时与速率限制下的用户提示时序。

## 各层测试结果汇总

| 测试类型 | 用例总数 | 通过 | 失败 | BLOCKED | 结果 |
|---------|:-------:|:---:|:---:|:-------:|------|
| AI Unit / Component | 9（定向） | 9 | 0 | 0 | PASS |
| React 全量 Unit / Component | 450 | 450 | 0 | 0 | PASS |
| E2E | 2 | 2 | 0 | 0 | PASS |
| Visual / Playwright CLI | 3 | 3 | 0 | 0 | PASS |
| Go Unit | 2 个包 | 2 个包 | 0 | 0 | PASS |
| 真实第三方 AI | 1 门禁 | 0 | 0 | 1 | BLOCKED |
| Visual / Playwright MCP | 1 门禁 | 0 | 0 | 1 | BLOCKED |
| 静态门禁 | typecheck + lint + build | 全部 | 0 | 0 | PASS |

## 风险评估

- **未测试区域：** 真实第三方 AI 成功响应、真实 Keychain 授权链路和 MCP AI toast 截图。
- **已知不稳定测试：** 无。
- **安全关注：** 未配置 AI 或 consent 不匹配时不会发起请求；导入完成不依赖 AI 成功；没有凭据写入导出 HTML 或测试证据。

## 发布建议

- [x] ⚠️ 可以合并；使用真实第三方 AI 成功态前补充 `docs/spec/info.md` 凭据，并在 MCP 修复后补视觉证据
- [ ] ✅ 完全通过，可无条件发布
- [ ] ❌ 暂缓合并等待产品代码修复

### 验收证据

- AC 矩阵：`docs/spec/ac/TASK-080-AC.md`
- 证据文档：`docs/spec/evidence/TASK-080-evidence.md`
- AI Unit：`ui/src/features/import-export/browser-import-ai.test.ts`
- 视觉证据：`docs/spec/evidence/TASK-079-settings-browser-bookmarks-*.png`
