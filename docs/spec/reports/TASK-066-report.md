# TASK-066 测试报告

> 日期：2026-07-22  
> 结果：PASS

## 摘要

- 修复设置保存无反馈：保存中禁用重复提交，失败时显示本地化错误并保持弹窗。
- 修复桌面保存链路：显隐热键未变化时跳过无关重注册。
- 修复窗口大小持久化：`uiSize` 与快捷键在 UI/Domain 设置之间完整双向映射。
- Windows 正式构建在隔离 AppData 下按 `large` 冷启动为 1536×960。

## 测试结果

| 测试类型 | 用例 | 结果 | 说明 |
|---------|:----:|:----:|------|
| 定向 Unit / Component | 6 | PASS | 持久化、启动恢复、热键跳过、保存失败和保存中状态 |
| React 全量 | 329 | PASS | 87 个测试文件，无失败或跳过 |
| Go 全量 / Vet | 全包 | PASS | settingsstore、platform、hotkey、tray 等全部通过 |
| Visual | 1 | PASS | Baseline/Actual 对比通过；Diff 0.46419% |
| Static / Build | 4 项 | PASS | ESLint、TypeScript、Vite、Wails Windows build |
| Windows Native | 1 | PASS | `uiSize=large` 冷启动原生窗口 1536×960 |
| Playwright MCP | 1 | BLOCKED | MCP 浏览器可执行文件路径包含字面量 `%USERNAME%`；已由项目 Playwright CLI 执行真实替代验收 |
| macOS/Linux Native | 0 | BLOCKED | 当前仅有 Windows 原生环境；本次 TypeScript 映射与错误处理为平台无关代码 |

## 质量评分

| 维度 | 得分 | 说明 |
|------|:---:|------|
| 测试覆盖率 | 15/20 | 关键映射与热键模块行覆盖率均超过 85%；SettingsDialog 为大型组件 |
| 关键路径覆盖率 | 20/20 | 保存、失败反馈、持久化与冷启动链路全部覆盖 |
| 缺陷逃逸率 | 10/15 | 本次为用户发现的回归，已增加防回归测试 |
| 测试套件速度 | 10/10 | 全量前端约 15 秒，分层验收均在预算内 |
| 不稳定率 | 10/10 | 两次视觉运行及全量回归无 flaky |
| 安全测试覆盖率 | 3/10 | 本任务不改变安全边界；隔离 AppData 且截图脱敏 |
| 文档 | 5/5 | TASK、追溯、AC、证据和报告完整 |
| 自动化比例 | 10/10 | 除无对应平台环境外均自动化执行 |
| **总分** | **83/100** | 💎 优秀 |

## 风险与建议

- Vite 仍报告既有动态/静态混合导入与大 chunk 警告，本次无新增构建错误。
- macOS/Linux 的原生窗口恢复建议在对应 runner 上补充构建与启动冒烟；平台无关映射逻辑已由 Vitest 覆盖。
- 建议修复 Playwright MCP 的 `%USERNAME%` 浏览器路径配置，恢复 MCP 截图门禁。

## 发布建议

- [x] 可以发布
