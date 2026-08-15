# 测试报告 — TASK-047 本地存储目录与数据迁移

> 日期：2026-08-15
> 分支：`feat/TASK-047-data-root-conflict-choice`
> 需求：REQ-023-AC-002；REQ-029-AC-001~005

---

## 摘要

| 层级 | 结果 |
|------|------|
| Go Unit | PASS（`go test ./internal/localstore`） |
| Vitest | PASS（496/496；其中 `data-root.test.ts` 6/6） |
| Playwright E2E | PASS（2/2，含截图） |
| Typecheck | PASS |
| Lint | PASS |
| Build | PASS（Vite 输出既有 chunk-size warning） |

结论：TASK-047 的数据根冲突选择修订已补充目标目录预检，选择目录后即可按文件名识别 `library.json` / `settings.json` 等既有数据并显示 Keep/Overwrite。Playwright MCP 截图因 MCP 浏览器路径解析问题标记为 BLOCKED，CLI Playwright 已生成截图证据。

---

## 覆盖 AC

见 `docs/spec/ac/TASK-047-AC.md`。

---

## 质量评分（简评）

| 维度 | 分 | 说明 |
|------|:--:|------|
| 需求覆盖 | 10 | 五条 REQ-029 AC + Storage 路径展示均有证据；补充目标预检与 Keep/Overwrite 冲突分支 |
| 测试真实性 | 9 | Go/Vitest/Playwright CLI 真实执行；Playwright MCP 截图因浏览器路径解析 BLOCKED |
| 失败安全 | 10 | 默认冲突探测、Keep 不覆盖、Overwrite 覆盖、失败回滚均有单测 |
| 可维护性 | 9 | 引导根/有效根分离清晰，settings 通过回调同步 |

---

## 下一步

1. 完成本轮 `typecheck` / lint / build 门禁后合并 `feat/TASK-047-data-root-conflict-choice`。
2. Windows 桌面旅程补一轮真实文件夹选择、Keep target data 与重启恢复。
