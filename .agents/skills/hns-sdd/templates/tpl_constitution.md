# 项目宪法（Constitution）

> 文件路径：`docs/spec/constitution.md`
> 版本：{{VERSION}} · 日期：{{DATE}}

---

## 项目说明

{{PROJECT_DESCRIPTION}}

---

## 技术栈

- **主语言**：{{LANGUAGE}}（版本：{{LANGUAGE_VERSION}}）
- **运行时 / 框架**：{{FRAMEWORK}}
- **包管理器**：{{PACKAGE_MANAGER}}

### TypeScript 规范（如适用）

- 启用严格模式（`strict: true`）
- 禁止使用 `any` 和 `unknown` 类型
- 禁止使用 `as` 断言
- 禁止编写带 `as any` 或 lint 抑制注释的不安全代码
- 任务完成后自动执行 `npx tsc --noEmit` 检查

---

## 包管理规范

1. 使用**稳定版**包版本，禁止使用任何 beta / rc / alpha 版本。
2. 锁文件（`package-lock.json` / `pnpm-lock.yaml`）必须提交到版本控制。
3. {{ADDITIONAL_PACKAGE_RULES}}

---

## 编码安全

### 行级安全（RLS）

{{RLS_POLICY_DESCRIPTION}}

### Rate Limiting

所有 API 路由须限制每 IP 每小时 100 次请求。超限时返回清晰的错误信息。

### API 密钥管理

- 所有密钥存储在 `.env` / `.env.local` 文件中
- 代码中通过 `process.env.XXX` 引用，禁止硬编码
- `.env` 文件必须加入 `.gitignore`

---

## 质量基线

- 代码无明显 Lint 错误和编译错误
- Git Hooks：使用 Husky + lint-staged 在提交前强制检查
- CI/CD：通过 GitHub Actions 实现代码审计和安全扫描
- 测试框架：{{TEST_FRAMEWORK}}（单元）/ {{E2E_FRAMEWORK}}（E2E）

---

## 文档结构

```
docs/spec/
├── requirements.md     # 需求与 EARS 验收标准
├── constitution.md     # 本文件（项目宪法）
├── design.md           # 技术设计概览
├── data.md             # 数据库设计
├── api.md              # API 接口设计
├── tasks.md            # 任务拆分清单
├── info.md             # 测试账号与测试数据
├── traceability.md     # 可追溯性矩阵
└── ac/                 # 各任务 AC 验收矩阵
    └── TASK-XXX-AC.md
```
