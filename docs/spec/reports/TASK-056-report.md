# TASK-056 报告

## 摘要

- **目标：** 让全部非自定义 UI 文案、状态与无障碍名称跟随设置语言，用户自定义内容保持原样。
- **状态：** 风险通过。
- **规格对齐：** REQ-023-AC-004、REQ-023-AC-005、REQ-023-AC-006、REQ-023-AC-008。
- **AC 结果：** `docs/spec/ac/TASK-056-AC.md` 全部 PASS。

## 测试结果

| 测试类型 | 命令 | 结果 | 耗时 |
|---------|------|------|------|
| E2E | `pnpm --dir ui exec playwright test tests/e2e --workers=1 --reporter=json` | 87 passed / 6 skipped / 0 failed | 643.575s |
| Quality | `pnpm --dir ui quality` | lint、typecheck、build 全部退出码 0 | 30.7s |
| Unit + Coverage | `pnpm --dir ui test:coverage` | 76 files / 300 tests passed | 72.94s |
| Visual | `pnpm --dir ui exec playwright test tests/visual/ui-language-alignment.spec.ts --workers=1` | 2 passed | 28.3s |
| MCP Screenshot | Playwright MCP tab + screenshot | `TASK-056-mcp-login.png` 已保存 | — |

## 覆盖率

| 范围 | Lines | Branches | Functions | Statements |
|------|------:|---------:|----------:|-----------:|
| 全项目 | 78.83% | 78.32% | 81.69% | 78.83% |
| `src/i18n` | 100% | 100% | 100% | 100% |

全项目覆盖率仍低于 `test_strategy.md` 的 85% lines / 80% branches 目标；该差距来自既有大面积 UI/适配层文件，本任务直接变更的 i18n 关键路径已达到 100%。

## 质量评分

| 维度 | 权重 | 得分 | 备注 |
|------|:---:|:---:|------|
| 测试覆盖率 | 20 | 10 | 全局行覆盖率 78.83% |
| 关键路径覆盖率 | 20 | 20 | TASK-056 关键路径 Unit/E2E/Visual 全覆盖 |
| 缺陷逃逸率 | 15 | 15 | 本轮验收 0 failed |
| 测试套件速度 | 10 | 7 | 主要门禁约 13 分钟 |
| 不稳定率 | 10 | 10 | 0 flaky |
| 安全测试覆盖率 | 10 | 3 | 本任务非安全变更，未重跑专项安全测试 |
| 文档 | 5 | 5 | AC、evidence、report 已补齐 |
| 自动化比例 | 10 | 10 | 全部验收自动化，MCP 截图为补充证据 |
| **总分** | **100** | **80** | 良好 |

## 已知风险

- 全局覆盖率未达到规格目标，需后续以专项覆盖率任务补齐既有 UI/适配层测试。
- `pnpm --dir ui quality` 中 Vite build 仍提示 chunk 大小与动态/静态混用导入警告；当前为 warning，不阻塞构建。
- Playwright MCP 本轮只完成页面打开与截图，完整交互验收由 Playwright CLI 覆盖。

## 结论

TASK-056 满足当前 AC、E2E、视觉回归和文档收尾要求，可合并回主分支。建议下一步处理全局覆盖率缺口和 Vite build warning。
