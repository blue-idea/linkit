# 测试报告 - TASK-047 本地存储目录与数据迁移
> 日期：2026-08-15
> 分支：`fix/TASK-047-reload-kept-data-root`
> 需求：REQ-023-AC-002；REQ-029-AC-001~005

---

## 摘要

| 层级 | 结果 |
|------|------|
| Go Unit | PASS（`go test ./internal/localstore`，上一轮 TASK-047 验收） |
| Vitest | PASS（498/498；其中 `data-root.test.ts` 6/6、`browser-adapters.test.ts` 1/1、`SettingsDialog.test.tsx` 4/4） |
| Playwright E2E | PASS（2/2，含 Keep 后目标库已显示截图） |
| Typecheck | PASS |
| Lint | PASS |
| Build | PASS（Vite 输出既有 chunk-size warning） |

结论：TASK-047 的数据根冲突选择已支持目标目录预检，选择目录后即可按文件名识别 `library.json` / `settings.json` 等既有数据并显示 Keep/Overwrite。本轮修复 Keep target data 成功后未实时载入目标目录数据的问题：SettingsDialog 通知 App 重载，App 暂停旧库自动保存并从当前有效数据根重新读取资料库；浏览器 E2E 替身同步支持按 data root 读取目标库。Playwright MCP 截图因 MCP 浏览器路径解析问题标记为 BLOCKED，CLI Playwright 已生成截图证据。

---

## 覆盖 AC

见 `docs/spec/ac/TASK-047-AC.md`。

---

## 质量评分（简评）

| 维度 | 分 | 说明 |
|------|:--:|------|
| 需求覆盖 | 10 | 五条 REQ-029 AC + Storage 路径显示均有证据；补充目标预检、Keep/Overwrite 冲突分支与 Keep 后实时重载目标库 |
| 测试真实性 | 9 | Go/Vitest/Playwright CLI 真实执行；Playwright MCP 截图因浏览器路径解析 BLOCKED |
| 失败安全 | 10 | 默认冲突探测、Keep 不覆盖、Overwrite 覆盖、失败回滚均有单测或 E2E 覆盖 |
| 可维护性 | 9 | 引导根/有效根分离清晰；浏览器替身使用集中配置 key 模拟 data root 作用域 |

---

## 下一步

1. 将 `fix/TASK-047-reload-kept-data-root` 合并回 `main`。
2. Windows 桌面旅程补一轮真实文件夹选择、Keep target data 与重启恢复。
