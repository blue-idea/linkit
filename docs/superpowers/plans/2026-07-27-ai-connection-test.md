# AI 接口连通性测试实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Settings → AI 中对当前 OpenAI-compatible API Base、Model 与 Key 执行无收藏内容的真实连通性测试，并展示耗时、时间和稳定错误状态。

**Architecture:** Go `internal/ai.Client` 增加只验证 HTTP 可用性的连接测试路径，复用现有 URL、Keychain、超时、重试和错误映射；`ai.Service` 只做 DTO 门禁与委派。React 通过独立 `ai-connection.ts` 适配 Wails 绑定并用 Zod 校验响应，Settings 组件只维护交互状态。

**Tech Stack:** Go 1.26、Wails v2、React 18、TypeScript、Zod 4、Vitest、Testing Library、Playwright。

---

## 文件结构

- 修改 `internal/ai/client.go`：连接测试 HTTP 路径、耗时统计和共享响应门禁。
- 修改 `internal/ai/service.go`：公开 `TestConnection` DTO 与服务方法。
- 修改 `internal/ai/client_test.go`、`internal/ai/service_test.go`：Go RED/GREEN 证据。
- 新增 `ui/src/features/settings/ai-connection.ts`：Wails 调用、DTO 校验、稳定错误分类。
- 新增 `ui/src/features/settings/ai-connection.test.ts`：适配器单元测试。
- 修改 `ui/src/components/SettingsDialog.tsx`：按钮、缺失配置、加载、成功和失败状态。
- 新增 `ui/src/components/SettingsDialog.ai-connection.test.tsx`：组件交互测试。
- 修改 `ui/src/i18n/catalogs.ts`：连接测试中英文产品文案。
- 新增 `ui/tests/e2e/settings-ai-connection.spec.ts`：关键用户旅程。
- 新增 `ui/tests/visual/settings-ai-connection.spec.ts`：视觉基线。
- 机械更新 `ui/wailsjs/go/ai/*`、`ui/wailsjs/go/models.ts`：Wails 生成绑定。

### Task 1: Go 客户端与服务 RED

- [ ] **Step 1: 在 `internal/ai/client_test.go` 写失败测试**

新增测试，锚定 REQ-033-AC-001~003：

```go
func TestConnectionUsesMinimalPayloadWithoutConsent(t *testing.T) {
    // 断言路径为 /chat/completions、Authorization 使用 Keychain Key、
    // body 仅含 model/messages/temperature/max_tokens，且不含 bookmark/contentText。
    // 断言 consent checker 调用次数为 0，返回 latencyMs >= 0 与 UTC testedAt。
}

func TestConnectionRejectsMissingConfigurationBeforeNetwork(t *testing.T) {
    // 分别覆盖空 API Base、空 Model、缺失 Key，断言网络命中次数为 0。
}

func TestConnectionMapsUnauthorizedTimeoutAndNetworkFailure(t *testing.T) {
    // 断言 401 -> AI_UNAUTHORIZED，超时 -> AI_TIMEOUT，连接失败 -> AI_REQUEST_FAILED。
}
```

- [ ] **Step 2: 在 `internal/ai/service_test.go` 写失败测试**

```go
func TestServiceTestConnectionDelegatesValidatedContext(t *testing.T) {
    // 使用 capturingConnectionTester，断言 context 原样传递并返回 DTO。
}

func TestServiceTestConnectionRejectsMissingContext(t *testing.T) {
    // 空 API Base 或 Model 返回 INVALID_ARGUMENT，tester 不被调用。
}
```

- [ ] **Step 3: 运行 RED**

Run:

```bash
go test ./internal/ai -run 'Test(Connection|ServiceTestConnection)' -count=1
```

Expected: FAIL，原因是 `Client.TestConnection`、`Service.TestConnection`、DTO 或注入选项尚不存在。

### Task 2: Go GREEN 与 REFACTOR

- [ ] **Step 1: 在 `internal/ai/client.go` 增加连接测试类型与时钟注入**

实现以下稳定接口：

```go
type ConnectionTestResult struct {
    Status    string `json:"status"`
    LatencyMs int64  `json:"latencyMs"`
    TestedAt  string `json:"testedAt"`
}

func WithClock(now func() time.Time) Option
func (client *Client) TestConnection(aiContext AIContext) (ConnectionTestResult, error)
```

连接请求使用最小英文提示，不包含收藏内容，不检查 consent；成功只要求 2xx 和受限响应体，不解析业务 JSON。

- [ ] **Step 2: 提取共享 HTTP 门禁**

将 `doChatOnce` 的请求创建、Header、限长读取和状态映射提取为共享私有函数：

```go
func (client *Client) doRequestOnce(endpoint, apiKey string, body []byte) ([]byte, bool, error)
```

`doChatOnce` 继续在共享函数返回后解析严格 JSON；连接测试忽略正文。不得改变既有重试和错误语义。

- [ ] **Step 3: 在 `internal/ai/service.go` 暴露 Wails 方法**

```go
type ConnectionTester interface {
    TestConnection(context AIContext) (ConnectionTestResult, error)
}

type TestConnectionRequest struct {
    Context AIContext `json:"context"`
}

func WithConnectionTester(tester ConnectionTester) ServiceOption
func (service *Service) TestConnection(request TestConnectionRequest) (ConnectionTestResult, error)
```

`NewDefaultService` 创建一个 Client 实例，并同时注入 `Completer` 与 `ConnectionTester`。

- [ ] **Step 4: 运行 GREEN 与全包回归**

Run:

```bash
go test ./internal/ai -count=1 -cover
```

Expected: PASS，且既有 Chat Completions 测试保持通过。

- [ ] **Step 5: 生成 Wails 绑定并提交 Go 层**

Run:

```bash
wails generate module
git add internal/ai ui/wailsjs/go/ai ui/wailsjs/go/models.ts
git commit -m "feat: add AI connection test service"
```

### Task 3: TypeScript 适配器 RED/GREEN

- [ ] **Step 1: 新增 `ai-connection.test.ts` 并运行 RED**

测试必须覆盖：有效 DTO、负耗时/无效时间拒绝、无 Wails 绑定返回 `AI_REQUEST_FAILED`、错误对象和错误字符串归一化。

Run:

```bash
pnpm --dir ui exec vitest run src/features/settings/ai-connection.test.ts
```

Expected: FAIL，原因是模块不存在。

- [ ] **Step 2: 实现 `ai-connection.ts`**

```ts
export const aiConnectionResultSchema = z.strictObject({
  status: z.literal('ok'),
  latencyMs: z.number().int().nonnegative(),
  testedAt: z.iso.datetime(),
});

export async function testAIConnection(context: AIContext): Promise<AIConnectionResult>;

export type AIConnectionErrorKey =
  | 'missing'
  | 'unauthorized'
  | 'timeout'
  | 'rateLimited'
  | 'unavailable';

export function classifyAIConnectionError(error: unknown): AIConnectionErrorKey;
```

只调用 `window.go.ai.Service.TestConnection({ context })`；无绑定时禁止前端直连或伪造成功。

- [ ] **Step 3: 运行 GREEN**

Run:

```bash
pnpm --dir ui exec vitest run src/features/settings/ai-connection.test.ts
```

Expected: PASS。

### Task 4: Settings 组件与 E2E RED/GREEN

- [ ] **Step 1: 新增组件失败测试**

`SettingsDialog.ai-connection.test.tsx` 覆盖：

```tsx
test('配置缺失时禁用 Test connection 且不调用 Wails', async () => {});
test('完整配置成功时显示 Connected、耗时和 testedAt', async () => {});
test('未授权错误时显示稳定错误且不调用 onSave/onImport', async () => {});
test('修改 Base、Model 或 Key 后清除旧测试结果', async () => {});
```

Run:

```bash
pnpm --dir ui exec vitest run src/components/SettingsDialog.ai-connection.test.tsx
```

Expected: FAIL，原因是按钮和状态区域不存在。

- [ ] **Step 2: 修改 Settings UI 与 i18n**

增加状态 `idle | testing | success | error`。按钮可用条件为 API Base、Model 且 Key 已配置或 Key 草稿非空；若存在 Key 草稿，测试前先通过既有 SecretStore 保存到 Keychain，再调用 AIService。测试不得触发 AI consent，也不得调用 `onSave`。

新增产品键：`settings.ai.testConnection`、`testing`、`missingHint`、`success`、`testedAt`、`unauthorized`、`timeout`、`rateLimited`、`unavailable`。

- [ ] **Step 3: 新增 E2E 骨架并运行 RED**

`settings-ai-connection.spec.ts` 通过 `page.addInitScript` 注入确定性 Wails AI 绑定，覆盖成功、缺失配置、未授权；使用语义化选择器并保存证据截图。

Run:

```bash
pnpm --dir ui exec playwright test tests/e2e/settings-ai-connection.spec.ts --workers=1
```

Expected: 初次运行 FAIL，原因是 `Test connection` 元素不存在。

- [ ] **Step 4: 运行组件与 E2E GREEN**

Run:

```bash
pnpm --dir ui exec vitest run src/features/settings/ai-connection.test.ts src/components/SettingsDialog.ai-connection.test.tsx
pnpm --dir ui exec playwright test tests/e2e/settings-ai-connection.spec.ts --workers=1
```

Expected: PASS。

### Task 5: QA、视觉证据与 SDD 收尾

- [ ] **Step 1: 新增视觉测试并生成基线**

`settings-ai-connection.spec.ts` 固定 1280×800、Midnight、English、成功结果 `42 ms` 和固定 UTC 时间；对 Settings 对话框执行 `toHaveScreenshot`。

Run:

```bash
pnpm --dir ui exec playwright test tests/visual/settings-ai-connection.spec.ts --update-snapshots --workers=1
pnpm --dir ui exec playwright test tests/visual/settings-ai-connection.spec.ts --workers=1
```

Expected: PASS。另用 Playwright MCP 保存 Actual，并用 ImageMagick 生成 Diff。

- [ ] **Step 2: 执行静态检查和回归**

```bash
go test ./internal/ai -cover
pnpm --dir ui typecheck
pnpm --dir ui lint
pnpm --dir ui build
```

Expected: 全部 PASS、零 error。

- [ ] **Step 3: 执行真实第三方连通性检查**

仅从 `docs/spec/info.md` 读取既有测试配置，禁止输出凭据。若配置缺失，报告 `BLOCKED`；不得以 Mock 结果替代真实测试结论。

- [ ] **Step 4: 更新 SDD 证据**

创建：

- `docs/spec/ac/TASK-077-AC.md`
- `docs/spec/evidence/TASK-077-evidence.md`
- `docs/spec/reports/TASK-077-report.md`

同步 `tasks.md`、`traceability.md`，仅在真实验证完成后把 TASK-077 标为 done。

- [ ] **Step 5: 提交并合并**

```bash
git add .
git commit -m "feat: complete AI connection testing"
git checkout main
git merge --ff-only feat/TASK-077-ai-connection
```

