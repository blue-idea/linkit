# TASK-078 AC 验收矩阵

> 任务：fix_task 1.21：完整资料库与可移植设置导入导出
> 日期：2026-07-27
> 状态：done

| TASK | REQ / AC | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|------|----------|:-------:|------------|:----:|------|---------|
| TASK-078 | REQ-034-AC-001 | Unit + Component + E2E | `linkit-backup` 导出包含全部 `LibraryData` 与 `PortableAppSettings`；Settings → General 导出文件名为 `linkit-backup-YYYY-MM-DD.json`，浏览器真实下载结果含书签、分类、主题、标签与可移植设置 | PASS | `ui/src/features/import-export/import-export.test.ts`、`ui/src/components/SettingsDialog.test.tsx`、`ui/tests/e2e/import-export.spec.ts`、`docs/spec/evidence/TASK-024-export-en.png` | — |
| TASK-078 | REQ-034-AC-002 | Unit + Security + Go Unit | 备份构建会排除 `apiKey`、`accessToken`、`refreshToken`、`logs`、`aiConsent` 与 `lastCloudRevision`；原生文件服务允许 `linkit-backup` 信封并继续拒绝敏感字段与无效载荷 | PASS | `ui/src/features/import-export/import-export.test.ts`、`ui/src/domain/library.test.ts`、`internal/platform/native_file_test.go` | — |
| TASK-078 | REQ-034-AC-003 | Component + E2E | 导入有效 `linkit-backup` 时先显示摘要和设置明细，取消前资料库与设置保持原值；确认后一次性恢复书签与可移植设置，主题、默认视图、`uiSize` 和 AI Base/Model 同步生效 | PASS | `ui/src/components/SettingsDialog.test.tsx`、`ui/tests/e2e/import-export.spec.ts`、`docs/spec/evidence/TASK-024-import-confirm-en.png`、`docs/spec/evidence/TASK-078-settings-backup-en-actual.png` | — |
| TASK-078 | REQ-034-AC-004 | Unit + E2E | 旧版 `linkit-library` 仍可导入；导入摘要明确提示“Current settings will be kept”，确认后仅替换资料库，不覆盖当前设置 | PASS | `ui/src/features/import-export/import-export.test.ts`、`ui/tests/e2e/import-export.spec.ts` | — |
| TASK-078 | REQ-034-AC-005 | Unit + Component + E2E | 取消导入、无效文件与设置持久化失败均显示稳定英文/中文反馈；失败后书签和设置保持导入前状态，无部分提交 | PASS | `ui/src/features/import-export/import-export.test.ts`、`ui/src/components/SettingsDialog.test.tsx`、`ui/tests/e2e/import-export.spec.ts`、`docs/spec/evidence/TASK-024-import-invalid-en.png`、`docs/spec/evidence/TASK-024-import-confirm-zh.png` | — |
| TASK-078 | REQ-034-AC-001~005 | Visual | English/中文导入覆盖摘要对话框 Baseline/Actual/Diff 已生成；两组差异像素均为 0，低于 `maxDiffPixelRatio=0.05` 阈值 | PASS | `docs/spec/evidence/TASK-078-settings-backup-en-baseline.png`、`TASK-078-settings-backup-en-actual.png`、`TASK-078-settings-backup-en-diff.png`、`TASK-078-settings-backup-en-diff-metric.txt`、`TASK-078-settings-backup-zh-baseline.png`、`TASK-078-settings-backup-zh-actual.png`、`TASK-078-settings-backup-zh-diff.png`、`TASK-078-settings-backup-zh-diff-metric.txt` | — |

## TDD 记录

- Red：先用 `import-export.test.ts`、`library.test.ts`、`SettingsDialog.test.tsx` 与 `native_file_test.go` 复现“导出缺少设置、敏感字段泄漏、旧格式兼容和失败有副作用”缺口；E2E 骨架覆盖摘要、取消、确认与失败路径。
- Green：新增 `linkit-backup` Schema、可移植设置投影、旧 `linkit-library` 兼容解析、原子设置恢复和原生文件服务新信封支持，使 Vitest、Go 与 Playwright 目标用例全部通过。
- Refactor：将构建、解析、摘要、恢复和设置投影集中到 `ui/src/features/import-export` 与 `ui/src/config/*`；`SettingsDialog` 只保留交互编排和状态展示。

## 结论

REQ-034 五条 AC 及其视觉验收已全部通过。完整备份现在覆盖资料库与可移植设置，同时持续排除凭据、会话和运行态授权字段。
