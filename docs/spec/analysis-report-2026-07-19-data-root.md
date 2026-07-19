# 规格审查报告 — 本地存储位置与数据迁移

> 日期：2026-07-19  
> 范围：REQ-029 / design 1.5.0 / data 1.3.0 / api 1.2.0 / TASK-047  
> 结论：通过，可进入 STEP 6 执行 TASK-047

---

## 1. 变更摘要

新增「可配置本地存储目录，位置变更时自动迁移应用数据」能力，贯穿需求、设计、数据、接口与任务拆分。

| 文件 | 版本 | 变更 |
|------|------|------|
| `requirements.md` | 1.7.0 | 决策 #14、REQ-023-AC-002 扩展、新增 REQ-029-AC-001~005 |
| `design.md` | 1.5.0 | §7.3 数据根解析与迁移流程；§9.4 安全约束；风险表 |
| `data.md` | 1.3.0 | 引导根 / 有效数据根、`data-root.json`、DATA-INV-012/013 |
| `api.md` | 1.2.0 | `GetDataRoot` / `SelectDataRootDirectory` / `MigrateDataRoot` 与错误码 |
| `tasks.md` | 1.6.0 | 新增 TASK-047 |
| `traceability.md` | 1.24.0 | 追溯行与 REQ 覆盖摘要 |
| `test_strategy.md` | 1.5.0 | 测试范围纳入数据根迁移 |

---

## 2. 一致性检查

| 检查项 | 结果 | 说明 |
|--------|:----:|------|
| 需求决策 ↔ AC | PASS | 文件夹选择、全量应用数据迁移、目标占用阻止、失败回滚、密钥不落盘均有 AC |
| AC ↔ design | PASS | §7.3 覆盖确认、复制、指针切换、失败清理 |
| design ↔ data | PASS | `data-root.json` 字段与两层目录与设计一致 |
| design ↔ api | PASS | 三个绑定方法与 `DATA_ROOT_*` 错误码对齐 |
| api ↔ tasks | PASS | TASK-047 绑定 REQ-029 与相关 Go/UI 验证命令 |
| 宪法「禁止静默迁移」 | PASS | 必须二次确认；目标冲突阻止；失败不改指针 |

---

## 3. 残余风险

| 风险 | 等级 | 缓解 |
|------|:----:|------|
| 大资料库跨盘复制耗时 | P2 | 迁移期间暂停自动保存；失败清理目标残留；E2E 用小样本，Unit 覆盖失败路径 |
| 用户选择源目录子路径造成递归复制 | P1 | `DATA_ROOT_INVALID` 拒绝子路径目标 |
| UI 假成功 | P1 | Wails 错误映射 + AC 禁止 false success |

---

## 4. 建议下一步

进入 **STEP 6**：按 `phases/06_execution.md` 开分支执行 **TASK-047**，严格 TDD，验收证据写入 `docs/spec/ac/TASK-047-AC.md` 与 `docs/spec/evidence/`。
