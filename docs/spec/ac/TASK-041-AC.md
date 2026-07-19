# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-041-AC.md`  
> 任务编号：TASK-041  
> 执行日期：2026-07-19  
> 执行人：Auto

## 参考环境

| 项目 | 实际环境 |
|------|----------|
| OS | Windows 11 企业版 LTSC 10.0.26100，64 位 |
| CPU | Intel Core i5-13400F，10 核 16 线程 |
| 内存 | 34,193,784,832 bytes（约 31.8 GiB） |
| 构建 | Vite production build + preview |
| 浏览器 | Playwright Chromium，单 worker |
| 数据 | 固定 seed `task-041`，10,000 条书签 |

## 验收结果

| TASK ID | AC ID | 指标 | 样本 | P50 / 实际值 | P95 | 预算 | 状态 |
|---------|-------|------|:----:|--------------|-----|------|:----:|
| TASK-041 | REQ-028-AC-005 | 热启动至可交互 | 5 | 219.31ms | 402.32ms | ≤2000ms | PASS |
| TASK-041 | REQ-028-AC-006 | 关键词搜索 | 15 | 21.05ms | 41.11ms | ≤100ms | PASS |
| TASK-041 | REQ-028-AC-006 | 阅读状态筛选 | 15 | 28.21ms | 34.11ms | ≤100ms | PASS |
| TASK-041 | REQ-028-AC-006 | Card/List 视图切换 | 15 | 81.00ms | 141.50ms | ≤150ms | PASS |
| TASK-041 | REQ-028-AC-007 | 浏览器本地保存 | 15 | 38.00ms | 41.20ms | ≤500ms | PASS |
| TASK-041 | REQ-028-AC-008 | 健康网络 pending | 1 | 117.14ms | — | ≤300ms | PASS |

稳定性复验：连续三轮视图切换 P95 分别为 119.0ms、122.5ms、141.5ms，三轮均 PASS。

## Go Benchmark

```text
BenchmarkUpdateLibraryDocument10000-16
5 次独立 benchmark：10.40–11.15ms/op
吞吐：53.71–57.60 MB/s
内存：约 3.78–3.83 MB/op
分配：39–40 allocs/op
```

## 证据

- `docs/spec/evidence/TASK-041-performance-raw.json`
- `docs/spec/evidence/TASK-041-evidence.md`
- `ui/tests/performance/performance-budget.spec.ts`
- `internal/localstore/performance_test.go`
