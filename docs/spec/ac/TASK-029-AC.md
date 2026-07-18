# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-029-AC.md`  
> 任务编号：TASK-029  
> 执行日期：2026-07-18  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-029 | REQ-003-AC-005 | Unit + E2E | 冲突三按钮与暂停自动保存；E2E 展示 Use Cloud Copy / Overwrite Cloud / Cancel | PASS | `cloud-conflict.png`、`storage-coordinator` 单测 | — |
| TASK-029 | REQ-004-AC-001 | Unit + E2E | 切换前显示源/目标摘要，确认前不改数据 | PASS | `storage-switch.png`、`prepareSwitch` 单测 | — |
| TASK-029 | REQ-004-AC-002 | Unit + E2E | Use Target 后活动模式与徽章切到目标端 | PASS | E2E Use Target、`confirmSwitch(use_target)` | — |
| TASK-029 | REQ-004-AC-003 | Unit | Overwrite Target 先写入目标再切换；写入失败不切换 | PASS | `confirmSwitch(overwrite_target)` 单测 | E2E 覆盖 Cancel/Use Target；Overwrite 以 Unit 为主 |
| TASK-029 | REQ-004-AC-004 | Unit + E2E | Cancel 与写入失败保持原模式；草稿恢复 Cancel 保持 Local | PASS | Cancel E2E、失败保持原模式单测 | — |
