# TASK-060 AC 矩阵

> 任务：Settings→Shortcuts 可配置绑定与冲突检测  
> 日期：2026-07-21

| TASK | REQ / AC | test_type | 期望 | 结果 | 证据 | 备注 |
|------|----------|-----------|------|:----:|------|------|
| TASK-060 | REQ-030-AC-006 | Unit/E2E | Shortcuts 列出九项绑定 | PASS | `shortcuts.test.ts`、`ShortcutsPanel.test.tsx`、`TASK-060-shortcuts-panel.png` | — |
| TASK-060 | REQ-030-AC-007 | Unit | 改绑合并与持久化字段 | PASS | `shortcuts.test.ts`、`AppSettingsSchema` | 保存时调用 SetToggleWindowHotkey |
| TASK-060 | REQ-030-AC-008 | Unit | 冲突拒绝 | PASS | `shortcuts.test.ts` | — |
| TASK-060 | REQ-030-AC-009 | Unit | 恢复默认 | PASS | `shortcuts.test.ts`、`ShortcutsPanel.test.tsx` | — |
| TASK-060 | REQ-023-AC-001 | E2E | Settings 含 Shortcuts 分区 | PASS | `settings-shortcuts.spec.ts` | — |
| TASK-060 | REQ-024-AC-002~003 | Unit | 快捷键读取 settings 映射 | PASS | `use-global-shortcuts.ts` | 桌面态跳过 toggleWindow |
