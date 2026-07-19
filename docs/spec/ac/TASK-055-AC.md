# TASK-055 AC 矩阵

> 任务：开发/正式本机身份槽隔离  
> 日期：2026-07-20  
> 状态：done

| TASK | REQ / AC | test_type | 期望 | 结果 | 证据 | 备注 |
|------|----------|-----------|------|:----:|------|------|
| TASK-055 | REQ-025-AC-006 | Unit | 正式身份常量为 `Linkit`；开发（`-tags dev`）为 `Linkit-Dev`；正式产物不含开发身份 | PASS | `config/identity*_test.go`、`scripts/check-identity`、`.github/workflows/ci.yml`、`.github/workflows/release.yml` | 本机探针写入仅影响 `Linkit-Dev`，正式 `data-root.json` 保持不变 |
