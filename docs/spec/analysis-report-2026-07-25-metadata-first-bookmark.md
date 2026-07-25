# 规格与代码分析报告：新建书签元数据优先与 AI 后台增强

> 日期：2026-07-25
> 范围：REQ-006-AC-011 / TASK-075
> 结论：已完成规格对齐，可进入验收收尾

## 审查范围

| 文档 | 审查结果 |
|------|----------|
| `docs/spec/requirements.md` | 新增元数据先展示、AI 后台增强、保存与过期请求约束 |
| `docs/spec/design.md` | 更新 AI/网页两阶段时序与模块边界 |
| `docs/spec/api.md` | 新增 `FetchMetadataFast`，保留 `FetchMetadata` 兼容语义 |
| `docs/spec/data.md` | 无数据结构变更 |
| `docs/spec/tasks.md` | 新增并完成 TASK-075 |
| `docs/spec/test_strategy.md` | 增加元数据预览“不等待 AI”测试预算 |
| `docs/spec/traceability.md` | 补齐 REQ/AC/TASK/测试/证据映射 |

## 问题与处理

| 编号 | 发现 | 严重度 | 处理 |
|------|------|:------:|------|
| A-001 | Smart 原流程串行等待 AI，元数据已经可用时仍停留在加载页 | P1 | 拆分元数据阶段与 AI 增强阶段；元数据返回即进入 review |
| A-002 | `FetchMetadata` 同步抓取 favicon 二进制，可能把图标网络延迟叠加到预览延迟 | P1 | 新增 `FetchMetadataFast`；旧接口保留完整行为，前端优先快速接口 |
| A-003 | AI 延迟返回可能覆盖用户编辑或旧会话结果 | P1 | 记录元数据基线；只合并未编辑字段；请求 ID 在返回、关闭、保存时失效 |
| A-004 | 常见 OpenGraph/Twitter 元数据未覆盖，页面标题可能退回不准确的 `<title>` | P2 | 解析并按 `og` > `twitter` > 普通 meta 优先级选择标题和描述 |

## 关键决策

1. 不降低 AI 超时或重试上限，避免以成功率换取表面速度；用户感知延迟通过渐进式预览消除。
2. 不删除 Smart/Enter 的 AI 能力；AI 仍可后台生成摘要、分类和标签，用户可在结果返回前直接保存。
3. 不改变 Bookmark/Tag 数据结构，不新增数据库迁移。
4. 旧 Wails 调用方若没有 `FetchMetadataFast`，前端回退到 `FetchMetadata`，保证兼容。

## 验证计划

- Vitest：元数据阶段独立返回、AI 失败降级、用户编辑保护、保存后忽略迟到结果。
- Go 单测：快速接口不抓 favicon、旧接口仍返回 favicon data URL、OpenGraph 优先级。
- Playwright：延迟 AI 时先看到元数据和 Save，再看到 AI 增强；保存前后不产生伪造结果；生成视觉 Baseline/Actual/Diff。

## 风险与边界

- 真实第三方 AI 仍受 `docs/spec/info.md` 中的环境门禁约束，本任务不以固定替身宣称真实 AI 通过。
- Playwright MCP 当前浏览器缓存路径指向不存在的 `%USERNAME%` 目录；CLI Playwright 可执行，MCP 视觉步骤记录为 BLOCKED，不伪造结果。
