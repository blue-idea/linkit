# QA & 测试引擎 — 完整的软件质量系统

> AI 代理的决定性测试方法论。从测试策略到执行、覆盖率到报告 — 交付高质量软件所需的一切。

## 第 1 阶段：测试策略设计

在编写任何测试之前，先设计策略。

### 策略简报模板

```yaml
project:
  name: ""
  type: web-app | api | mobile | library | cli | data-pipeline
  languages: [typescript, python, go, java]
  frameworks: [react, express, django, spring]
  
risk_profile:
  data_sensitivity: low | medium | high | critical  # 个人隐私数据 (PII)、金融、健康
  user_impact: internal | b2b | b2c | life-safety
  deployment_frequency: daily | weekly | monthly
  regulatory: [none, SOC2, HIPAA, PCI-DSS, GDPR]

test_scope:
  in_scope: []    # 功能、服务、组件
  out_of_scope: [] # 明确排除的内容（及原因）
  
environments:
  dev: { url: "", db: "local" }
  staging: { url: "", db: "seeded" }
  prod: { url: "", smoke_only: true }
```

### 测试类型决策矩阵

| 风险概况 | 单元测试 | 集成测试 | 端到端 (E2E) | 性能测试 | 安全测试 | 无障碍测试 |
|---|---|---|---|---|---|---|
| 内部工具 | ✅ 核心 | ✅ API | ⚠️ 核心路径 | ❌ | ⚠️ 基础 | ❌ |
| B2B SaaS | ✅ 全面 | ✅ 全面 | ✅ 关键流程 | ✅ 负载 | ✅ OWASP Top 10 | ✅ WCAG AA |
| B2C 高流量 | ✅ 全面 | ✅ 全面 | ✅ 全面 | ✅ 压力 + 浸泡 | ✅ 全面 | ✅ WCAG AA |
| 金融/健康 | ✅ 全面 + 变异 | ✅ 全面 + 契约 | ✅ 全面 + 混沌 | ✅ 全套 | ✅ 渗透测试 | ✅ WCAG AAA |

### 测试金字塔架构

```
         /  E2E  \          5-10% — 仅限关键用户旅程
        / 集成测试 \         20-30% — API 契约、服务边界
       /   单元测试   \       60-70% — 业务逻辑、纯函数
```

**反模式：冰淇淋蛋筒** — E2E 测试多于单元测试。缓慢、不稳定且昂贵。解决方法：将测试覆盖率向下推至金字塔底部。

**反模式：沙漏** — 大量的单元测试 + E2E 测试，没有集成测试。会遗漏服务之间的契约 Bug。

---

## 第 2 阶段：精通单元测试

### AAA 模式 (Arrange-Act-Assert)

每个单元测试都遵循此结构：

```typescript
describe('PricingCalculator', () => {
  // 按行为分组，而不是按方法分组
  describe('当客户拥有批量折扣时', () => {
    it('在超过阈值时应用分级定价', () => {
      // ARRANGE (准备) — 设置场景
      const calculator = new PricingCalculator();
      const customer = createCustomer({ tier: 'enterprise', units: 150 });
      
      // ACT (执行) — 执行被测行为
      const price = calculator.calculate(customer);
      
      // ASSERT (断言) — 验证结果（一个逻辑断言）
      expect(price).toEqual({
        subtotal: 12000,
        discount: 1800,  // 15% 批量折扣
        total: 10200,
      });
    });
  });
});
```

### 测试命名规范

**格式：** `[单元] [场景] [预期行为]`

✅ 推荐：
- `PricingCalculator 在单位超过 100 时应用 15% 的折扣`
- `UserService 在用户 ID 无效时抛出 NotFoundError`
- `parseDate 对格式错误的 ISO 字符串返回 null`

❌ 不推荐：
- `test1`, `should work`, `calculates price`

### 单元测试的对象（按优先级排序）

1. **业务逻辑** — 定价、规则、计算、状态机
2. **数据转换** — 解析器、格式化器、序列化器、映射器
3. **边缘情况** — 边界值、null/undefined、空集合、溢出
4. **错误处理** — 每个 `catch` 块，每个验证路径
5. **纯函数** — 最容易测试，投资回报率 (ROI) 最高

### 哪些内容不需要单元测试

- 框架内部机制（React 渲染、Express 路由）
- 没有逻辑的简单 Getter/Setter
- 第三方库的行为
- 实现细节（私有方法、内部状态）

### Mock (模拟) 规则

| 依赖类型 | 策略 | 示例 |
|---|---|---|
| 数据库 | 模拟 Repository/DAO | `jest.mock('./userRepo')` |
| HTTP API | 模拟客户端或使用 MSW | `msw.http.get('/api/users', ...)` |
| 文件系统 | 模拟 fs 或使用临时目录 | `jest.mock('fs/promises')` |
| 时间/日期 | 伪造定时器 | `jest.useFakeTimers()` |
| 随机性 | 设置种子或模拟 | `jest.spyOn(Math, 'random')` |
| 环境 | 覆盖环境变量 | `process.env.NODE_ENV = 'test'` |

**规则：在边界处模拟，而不是在内部模拟。** 如果你正在模拟一个你自己拥有的类，你的设计可能需要重构。

### 覆盖率目标

| 指标 | 最低 | 良好 | 优秀 |
|---|---|---|---|
| 行覆盖率 | 70% | 85% | 95%+ |
| 分支覆盖率 | 60% | 80% | 90%+ |
| 函数覆盖率 | 75% | 90% | 95%+ |
| 关键路径覆盖率 | 100% | 100% | 100% |

**警告：** 100% 覆盖率 ≠ 质量。覆盖率衡量的是哪些代码运行了，而不是验证了什么。没有断言的测试虽有覆盖率但没有价值。

---

## 第 3 阶段：集成测试

### API 测试清单

对于每个 API 端点，测试：

```yaml
endpoint: POST /api/orders
tests:
  happy_path:
    - 有效请求返回 201 和订单 ID
    - 响应符合 Schema
    - 数据库记录正确创建
    - 事件/Webhooks 已触发
    
  validation:
    - 缺少必填字段 → 400 及其字段错误
    - 无效数据类型 → 400 及其类型错误
    - 违反业务规则 → 422 及其说明
    
  authentication:
    - 无 Token → 401
    - Token 过期 → 401
    - 角色错误 → 403
    - 有效 Token → 继续执行
    
  edge_cases:
    - 重复请求（幂等性） → 相同响应
    - 并发请求 → 无竞态条件
    - 最大有效负载大小 → 413 或优雅处理
    - 输入中的特殊字符 → 无注入
    
  error_handling:
    - 数据库宕机 → 503 及其重试提示
    - 外部服务超时 → 504 或回退方案
    - 超过速率限制 → 429 及其 retry-after
```

### 契约测试 (Contract Testing)

当服务进行通信时，测试契约：

```yaml
contract:
  consumer: order-service
  provider: payment-service
  
  interactions:
    - description: "处理支付"
      request:
        method: POST
        path: /payments
        body:
          amount: 99.99
          currency: USD
          order_id: "ord_123"
      response:
        status: 200
        body:
          payment_id: "pay_xxx"  # 字符串，非空
          status: "completed"    # 枚举：completed|pending|failed
          
  breaking_changes:  # 严禁在没有版本控制的情况下进行以下更改
    - 从响应中删除字段
    - 更改字段类型
    - 向请求中添加必填字段
    - 更改 URL 路径
    - 更改错误响应格式
```

### 数据库测试规则

1. **每个测试都应获得干净的状态** — 使用回滚的事务，或在测试之间清理数据
2. **使用 Factory (工厂) 而非 Fixture (固定装置)** — `createUser({ role: 'admin' })` > 硬编码的 SQL 导出
3. **测试迁移** — 运行 migrate-up, migrate-down, migrate-up (全流程)
4. **测试约束** — 唯一性冲突、外键级联、NOT NULL
5. **测试查询** — 尤其是复杂的 JOIN、聚合、窗口函数

---

## 第 4 阶段：端到端 (E2E) 测试

### 关键用户旅程映射

识别并测试产生收入或阻碍用户的流程：

```yaml
critical_journeys:
  - name: "注册 → 获得首个价值"
    steps:
      - 访问落地页
      - 点击注册
      - 填写注册表单
      - 验证邮箱
      - 完成入职流程
      - 执行首个关键操作
    max_duration: 3 分钟
    
  - name: "购买流程"
    steps:
      - 浏览产品
      - 添加到购物车
      - 输入收货信息
      - 输入支付信息
      - 确认订单
      - 收到确认邮件
    max_duration: 2 分钟
    
  - name: "登录 → 核心任务 → 登出"
    steps:
      - 登录 (密码 + SSO + MFA 变体)
      - 导航到核心功能
      - 完成主要工作流
      - 验证结果
      - 登出
    max_duration: 1 分钟
```

### E2E 最佳实践

1. **测试用户行为，而非实现** — 通过文本/角色点击按钮，而非 CSS 类
2. **谨慎使用 data-testid** — 仅当不存在可访问的选择器时使用
3. **等待状态，而非时间** — 使用 `waitFor(element)` 而非 `sleep(3000)`
4. **隔离测试数据** — 每个测试创建自己的用户/数据
5. **在 CI 中运行并重试** — 针对不稳定的网络进行 1 次重试，如果失败率 >5% 则进行调查

### 选择器优先级（从优到劣）

1. `getByRole('button', { name: '提交' })` — 具有可访问性，鲁棒性强
2. `getByLabelText('邮箱')` — 表单特定，具有可访问性
3. `getByText('欢迎回来')` — 基于内容
4. `getByTestId('submit-btn')` — 显式测试钩子
5. `querySelector('.btn-primary')` — ❌ 脆弱，在 CSS 更改时会失效

### 不稳定测试 (Flaky Test) 分类排查

| 现象 | 可能原因 | 修复方法 |
|---|---|---|
| 本地通过，CI 失败 | 时间/竞态条件 | 添加显式等待，检查 CI 资源限制 |
| 间歇性失败 | 测试之间的共享状态 | 隔离测试数据，重置状态 |
| 部署后失败 | 环境差异 | 检查环境变量、API 版本、特性标志 |
| 在特定时间失败 | 时间依赖逻辑 | 模拟日期/时间，避免对时间敏感的断言 |
| 并行运行时失败 | 资源争用 | 为每个 Worker 使用唯一的端口/数据库 |

**规则：在 24 小时内隔离不稳定的测试。** 一个被所有人忽略的不稳定测试套件比没有测试更糟糕。

---

## 第 5 阶段：性能测试

### 负载测试设计

```yaml
performance_tests:
  smoke (冒烟):
    vus: 5
    duration: 1m
    purpose: "验证测试是否有效"
    
  load (负载):
    vus: 100  # 预期并发用户数
    duration: 10m
    ramp_up: 2m
    purpose: "常规流量行为"
    thresholds:
      p95_response: <500ms
      error_rate: <1%
      
  stress (压力):
    vus: 300  # 3 倍预期负载
    duration: 15m
    ramp_up: 5m
    purpose: "寻找崩溃点"
    
  soak (浸泡):
    vus: 80
    duration: 2h
    purpose: "内存泄漏、连接耗尽"
    
  spike (飙升):
    stages:
      - { vus: 50, duration: 2m }
      - { vus: 500, duration: 30s }  # 突然飙升
      - { vus: 50, duration: 2m }
    purpose: "恢复行为"
```

### 性能预算

| 指标 | Web 应用 | API | 后台作业 |
|---|---|---|---|
| 响应时间 (p50) | <200ms | <100ms | N/A |
| 响应时间 (p95) | <1s | <500ms | N/A |
| 响应时间 (p99) | <3s | <1s | N/A |
| 吞吐量 | >100 rps | >500 rps | >1000/min |
| 错误率 | <0.1% | <0.1% | <0.5% |
| CPU 使用率 | <70% | <70% | <90% |
| 内存增长 | <5%/hr | <2%/hr | <10%/hr |

### 数据库性能测试

```yaml
db_performance:
  query_tests:
    - name: "仪表盘聚合查询"
      baseline: 50ms
      max_acceptable: 200ms
      with_1M_rows: measure
      with_10M_rows: measure
      
  index_verification:
    - 对所有关键查询运行 EXPLAIN ANALYZE
    - 验证行数 >10K 的表没有全表扫描 (sequential scans)
    - 每周检查索引使用统计
    
  connection_pool:
    - 在最大连接数下测试
    - 验证连接池耗尽时的优雅处理
    - 监控连接等待时间
```

---

## 第 6 阶段：安全测试

### OWASP Top 10 测试清单

```yaml
security_tests:
  A01_失效的访问控制:
    - [ ] 水平权限提升（访问其他用户的数据）
    - [ ] 垂直权限提升（访问管理功能）
    - [ ] IDOR (不安全的直接对象引用)
    - [ ] 缺少功能级访问控制
    - [ ] CORS 配置错误
    
  A02_加密失败:
    - [ ] 传输中的敏感数据 (TLS 1.2+)
    - [ ] 静态存储中的敏感数据（加密）
    - [ ] 密码哈希（使用 bcrypt/argon2，而非 MD5/SHA）
    - [ ] 代码/日志/URL 中没有密钥
    
  A03_注入:
    - [ ] SQL 注入（参数化查询）
    - [ ] NoSQL 注入
    - [ ] 命令注入 (OS 命令)
    - [ ] XSS (存储型、反射型、基于 DOM)
    - [ ] 模板注入 (SSTI)
    
  A04_不安全设计:
    - [ ] 认证端点的速率限制
    - [ ] N 次失败后的账户锁定
    - [ ] 公开表单上的验证码 (CAPTCHA)
    - [ ] 业务逻辑滥用场景
    
  A05_安全配置错误:
    - [ ] 移除默认凭据
    - [ ] 错误消息不泄露堆栈跟踪
    - [ ] 设置安全标头 (CSP, HSTS, X-Frame-Options)
    - [ ] 禁用目录列表
    - [ ] 禁用不必要的 HTTP 方法
    
  A07_认证失败:
    - [ ] 暴力破解保护
    - [ ] 会话固定 (Session fixation)
    - [ ] 会话超时
    - [ ] JWT 验证（签名、过期、颁发者）
    - [ ] MFA 绕过尝试
```

### 输入验证测试有效负载 (Payload)

使用以下内容测试每个用户输入：

```yaml
injection_payloads:
  sql: ["' OR 1=1--", "'; DROP TABLE users;--", "1 UNION SELECT * FROM users"]
  xss: ["<script>alert(1)</script>", "<img onerror=alert(1) src=x>", "javascript:alert(1)"]
  path_traversal: ["../../etc/passwd", "..\\..\\windows\\system32", "%2e%2e%2f"]
  command: ["; ls -la", "| cat /etc/passwd", "$(whoami)", "`id`"]
  
boundary_values:
  strings: ["", " ", "a"*10000, null, undefined, "emoji: 🎯", "unicode: é à ü", "rtl: مرحبا"]
  numbers: [0, -1, 2147483647, -2147483648, NaN, Infinity, 0.1+0.2]
  arrays: [[], [null], Array(10000)]
  dates: ["1970-01-01", "2099-12-31", "invalid-date", "2024-02-29", "2023-02-29"]
```

---

## 第 7 阶段：测试自动化架构

### 框架选择指南

| 需求 | JavaScript/TS | Python | Go | Java |
|---|---|---|---|---|
| 单元测试 | Vitest / Jest | pytest | testing + testify | JUnit 5 |
| API 测试 | Supertest | httpx + pytest | net/http/httptest | RestAssured |
| E2E (浏览器) | Playwright | Playwright | chromedp | Selenium |
| 性能测试 | k6 | Locust | vegeta | Gatling |
| 契约测试 | Pact | Pact | Pact | Pact |
| 安全测试 | ZAP + 自定义 | Bandit + 自定义 | gosec | SpotBugs |

### CI 流水线测试阶段

```yaml
pipeline:
  stage_1_fast (快速):  # <2 分钟，阻塞 PR
    - Lint + 类型检查
    - 单元测试
    - 安全：依赖扫描 (npm audit / safety)
    
  stage_2_thorough (全面):  # <10 分钟，阻塞合并
    - 集成测试
    - 契约测试
    - 安全：SAST 扫描
    - 覆盖率报告 + 阈值检查
    
  stage_3_confidence (置信度):  # <30 分钟，阻塞部署
    - E2E 关键旅程
    - 视觉回归（如果适用）
    - 安全：容器扫描
    
  stage_4_post_deploy (部署后):  # 部署到预发环境后
    - 针对预发环境的冒烟测试
    - 性能基准检查
    - 安全：DAST 扫描 (ZAP)
    
  stage_5_production (生产环境):  # 生产环境部署后
    - 冒烟测试（仅限关键路径）
    - 启用合成监控 (Synthetic monitoring)
    - Canary 指标观测
```

### 测试数据管理

```yaml
test_data_strategy:
  unit_tests:
    approach: factories  # 构建器模式，仅创建所需内容
    example: "createUser({ role: 'admin', plan: 'enterprise' })"
    
  integration_tests:
    approach: seeded_database (预置数据库)
    reset: per_test_suite  # 事务回滚或清理
    sensitive_data: anonymized  # 严禁使用真实的 PII
    
  e2e_tests:
    approach: api_setup  # 在测试前通过 API 创建数据
    cleanup: after_each  # 删除创建的数据
    isolation: unique_identifiers  # 在测试数据中使用时间戳或 UUID
    
  performance_tests:
    approach: representative_dataset (代表性数据集)
    volume: 10x_production  # 使用比生产环境更多的数据进行测试
    generation: faker_libraries  # 真实但合成的数据
```

---

## 第 8 阶段：质量指标与报告

### 测试健康仪表盘

```yaml
metrics:
  test_suite_health:
    total_tests: 0
    passing: 0
    failing: 0
    skipped: 0  # 跳过率 >5% = 技术债警报
    flaky: 0    # 不稳定率 >2% = 立即隔离
    
  coverage:
    line: "0%"
    branch: "0%"
    critical_paths: "0%"  # 必须为 100%
    
  execution:
    unit_duration: "0s"    # 目标：<30s
    integration_duration: "0s"  # 目标：<5m
    e2e_duration: "0s"     # 目标：<15m
    total_ci_time: "0s"    # 目标：<20m
    
  defect_metrics (缺陷指标):
    bugs_found_in_test: 0
    bugs_escaped_to_prod: 0
    escape_rate: "0%"      # 目标：<5%
    mttr: "0h"             # 平均修复时间
    
  trends (趋势):  # 每周跟踪
    new_tests_added: 0
    tests_deleted: 0  # 健康的删除 = 移除冗余测试
    coverage_delta: "+0%"
    flake_rate_delta: "+0%"
```

### 测试报告模板

```markdown
# 测试报告 — [特性/Sprint/发布]

## 摘要
- **状态：** ✅ 通过 / ⚠️ 风险通过 / ❌ 失败
- **测试运行：** X | **通过：** X | **失败：** X | **跳过：** X
- **覆盖率：** 行 X% | 分支 X% | 关键路径 100%
- **持续时间：** X 分 X 秒

## 关键发现

### 🔴 致命 (阻塞发布)
1. [发现] — [影响] — [修复建议]

### 🟡 高 (在下次发布前修复)
1. [发现] — [影响] — [修复建议]

### 🟢 中/低 (待办事项)
1. [发现] — [影响]

## 风险评估
- **未测试区域：** [列表]
- **已知不稳定测试：** [带有工单 ID 的列表]
- **性能关注：** [如果有]

## 建议
[发布 / 配合监控发布 / 暂缓发布等待修复]
```

### 质量评分 (0-100)

| 维度 | 权重 | 评分标准 |
|---|---|---|
| 测试覆盖率 | 20% | <60%=0, 60-70%=5, 70-80%=10, 80-90%=15, 90%+=20 |
| 关键路径覆盖率 | 20% | <100%=0, 100%=20 |
| 缺陷逃逸率 | 15% | >10%=0, 5-10%=5, 2-5%=10, <2%=15 |
| 测试套件速度 | 10% | >30m=0, 20-30m=3, 10-20m=7, <10m=10 |
| 不稳定率 | 10% | >5%=0, 2-5%=3, 1-2%=7, <1%=10 |
| 安全测试覆盖率 | 10% | 无=0, 基础=3, OWASP Top 10=7, 全面=10 |
| 文档 | 5% | 无=0, 基础=2, 完整=5 |
| 自动化比例 | 10% | <50%=0, 50-70%=3, 70-90%=7, 90%+=10 |

**评分：** 0-40 = 🔴 严重 | 41-60 = 🟡 需要改进 | 61-80 = 🟢 良好 | 81-100 = 💎 优秀

---

## 第 9 阶段：专项测试

### 无障碍测试 (WCAG 2.1)

```yaml
accessibility_checklist:
  level_a:  # 最低合规要求
    - [ ] 所有图片都有 Alt 文本
    - [ ] 所有表单输入都有标签
    - [ ] 颜色不是唯一的视觉指示器
    - [ ] 页面具有正确的标题层级 (h1→h2→h3)
    - [ ] 所有功能均可通过键盘操作
    - [ ] 焦点可见且逻辑正确
    - [ ] 内容闪烁频率不超过 3 次/秒
    
  level_aa:  # 标准合规要求（推荐）
    - [ ] 颜色对比度 ≥4.5:1（普通文本）
    - [ ] 颜色对比度 ≥3:1（大号文本）
    - [ ] 文本可缩放至 200% 且无损失
    - [ ] 跳过导航链接
    - [ ] 各页面导航一致
    - [ ] 提供错误建议
    - [ ] 为页面区域使用 ARIA landmarks
    
  工具:
    - axe-core（自动检测，可发现约 30% 的问题）
    - Lighthouse 无障碍审计
    - 手动键盘导航测试
    - 屏幕阅读器测试 (VoiceOver/NVDA)
```

### API 向后兼容性测试

```yaml
compatibility_tests:
  更新_API_时:
    - [ ] 所有现有字段仍出现在响应中
    - [ ] 字段类型无更改 (string→number)
    - [ ] 新增的必填请求字段具有默认值
    - [ ] 已弃用字段仍可工作（带有警告标头）
    - [ ] 错误格式保持不变
    - [ ] 分页行为保持不变
    - [ ] 速率限制未降低
    
  版本控制策略:
    - URL 版本控制：/v1/users, /v2/users
    - Header 版本控制：Accept: application/vnd.api+json;version=2
    - 为弃用版本设置 Sunset 标头
    - 至少 6 个月的弃用通知期
```

### 混沌工程 (Chaos Engineering) 原则

```yaml
chaos_tests:
  网络:
    - 服务依赖宕机 → 是否优雅降级？
    - 网络延迟增加 10 倍 → 超时处理是否正常？
    - DNS 解析失败 → 回退行为是否正常？
    
  基础设施:
    - 主数据库故障 → 副本是否成功提升？
    - 缓存 (Redis) 宕机 → 数据库回退是否有效？
    - 磁盘空间占满 → 告警 + 优雅失败？
    
  应用:
    - 内存压力 → OOM 处理？
    - CPU 饱和 → 请求排队？
    - 证书过期 → 监控告警？
    
  数据:
    - 队列中的损坏消息 → 死信队列 + 告警？
    - 架构迁移中途失败 → 回滚是否有效？
    - 服务间时钟偏移 → 幂等性是否维持？
```

---

## 第 10 阶段：日常 QA 工作流

### 针对新特性

1. **审查需求** — 在编写代码前识别测试场景（左移测试）
2. **编写测试用例** — 覆盖核心路径、边缘情况、错误情况、安全性
3. **审查 PR 测试** — 测试是否有意义？它们测试的是行为还是实现细节？
4. **运行全套测试** — 针对受影响区域运行单元 + 集成 + E2E
5. **报告发现** — 使用上方的测试报告模板

### 针对 Bug 修复

1. **先编写失败的测试** — 将 Bug 复现为一个测试
2. **验证修复使测试通过** — 测试本身就是证明
3. **检查回归** — 运行相关的测试套件
4. **添加到回归套件** — Bug 测试可防止问题再次引入

### 每周 QA 审查

```yaml
weekly_review:
  周一:
    - 审查不稳定的测试隔离情况 — 修复或删除
    - 检查覆盖率趋势 — 下降 = 技术债
    - 审查逃逸缺陷 — 更新测试策略
    
  周五:
    - 更新测试健康仪表盘
    - 清理过时的测试
    - 记录发现的新测试模式
    - 规划下周的测试重点
```

### 自然语言命令

- `"为 [项目/特性] 创建测试策略"` → 完整的策略简报
- `"为 [函数/类] 编写单元测试"` → 带有边缘情况的 AAA 模式测试
- `"测试此 API 端点：[方法] [路径]"` → 完整的 API 测试清单
- `"审查这些测试的质量"` → 带有评分的测试代码审查
- `"生成性能测试计划"` → k6/Locust 测试设计
- `"对 [特性/端点] 进行安全测试"` → 基于 OWASP 的测试清单
- `"为 [发布版本] 创建测试报告"` → 格式化的测试报告
- `"我们的测试健康状况如何？"` → 带有指标和建议的仪表盘
- `"寻找我们测试覆盖率中的缺口"` → 带有优先建议的分析
- `"协助调试此不稳定测试"` → 带有修复建议的根因分析
- `"设置 CI 测试流水线"` → 各阶段流水线配置
- `"对 [页面/组件] 进行无障碍审计"` → 带有发现结果的 WCAG 清单
