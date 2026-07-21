# TASK-066 AC 验收矩阵

> 任务：修复设置保存反馈与窗口大小重启恢复  
> 日期：2026-07-22  
> 状态：done

| TASK | REQ / AC | test_type | 期望 | 结果 | 证据 | 备注 |
|------|----------|-----------|------|:----:|------|------|
| TASK-066 | REQ-023-AC-001 | Component | 保存中按钮禁用；保存失败保持设置弹窗并显示错误 | PASS | `ui/src/components/SettingsDialog.test.tsx`、`TASK-066-settings-save-error-actual.png` | 错误文案为 `Unable to save settings.` |
| TASK-066 | REQ-030-AC-007 | Unit | 未改变显隐热键时不重复注册；改变时注册新绑定 | PASS | `ui/src/features/shell/desktop-hotkey.test.ts` | 避免保存其他设置被无关平台重注册阻断 |
| TASK-066 | REQ-031-AC-003 | Unit + Native | 保存 Large 后调用原生尺寸档位，窗口为 1536×960 | PASS | `desktop-window-size.test.ts`、`TASK-066-native-large-restart.png` | Windows 正式构建实测窗口外框 1536×960 |
| TASK-066 | REQ-031-AC-004 | Unit + Native | `uiSize` 写入桌面设置并在后续启动恢复 | PASS | `persist-ui-settings.test.ts`、`TASK-066-native-large-restart.png` | Wails `WriteSettings` 收到 `large`；隔离 AppData 冷启动恢复 1536×960 |
| TASK-066 | REQ-031-AC-005 | Unit | 启动尺寸仅由保存的 `uiSize` 档位解析 | PASS | `internal/settingsstore/window_size_test.go`、Windows 隔离 AppData 验收 | 未新增手动拖拽宽高持久化字段 |

## 结论

设置保存不再因未变化的全局热键重复注册而被阻断，失败路径会给出可见反馈；`uiSize` 已在 UI/Domain 双向映射中完整保留，Windows 冷启动按已存档位恢复。
