# 测试策略简报（Test Strategy）

> 文件路径：`docs/spec/test_strategy.md`
> 参考方法论：`phases/qa_engine.md` §第1阶段
> 版本：{{VERSION}} · 日期：{{DATE}}

---

## 项目信息

```yaml
project:
  name: "{{PROJECT_NAME}}"
  type: web-app | api | mobile | library | cli | data-pipeline  # 选一
  languages: [{{LANGUAGES}}]
  frameworks: [{{FRAMEWORKS}}]
```

---

## 风险概况

```yaml
risk_profile:
  data_sensitivity: low | medium | high | critical  # 选一
  # low=内部数据, medium=用户数据, high=PII/金融, critical=医疗/合规
  user_impact: internal | b2b | b2c | life-safety   # 选一
  deployment_frequency: daily | weekly | monthly     # 选一
  regulatory: [none]  # 可选: SOC2, HIPAA, PCI-DSS, GDPR
```

---

## 测试范围

```yaml
test_scope:
  in_scope:
    - "{{FEATURE_OR_SERVICE_1}}"
    - "{{FEATURE_OR_SERVICE_2}}"
  out_of_scope:
    - "{{EXCLUDED_ITEM}}: {{REASON}}"
```

---

## 测试类型决策

> 根据风险概况，参照 `qa_engine.md` §第1阶段「测试类型决策矩阵」填写。

| 测试类型 | 是否执行 | 覆盖目标 | 工具 |
|---------|:-------:|---------|------|
| 单元测试 | ✅ / ❌ | 行覆盖率 {{X}}%，关键路径 100% | Vitest / Jest |
| 集成 / API 测试 | ✅ / ❌ | 所有端点的 happy_path + 异常路径 | curl / Supertest |
| E2E 测试 | ✅ / ❌ | 关键用户旅程：{{JOURNEY_COUNT}} 条 | Playwright / Maestro |
| 性能测试 | ✅ / ❌ | p95 <{{X}}ms，错误率 <{{X}}% | k6 / Locust |
| 安全测试 | ✅ / ❌ | OWASP Top 10 | ZAP / 手动 |
| 无障碍测试 | ✅ / ❌ | WCAG {{AA/AAA}} | axe-core / Lighthouse |

---

## 测试金字塔目标比例

```
单元测试：{{X}}%
集成测试：{{X}}%
E2E 测试：{{X}}%
```

> 反模式警告：E2E > 单元 = 冰淇淋蛋筒反模式，请向下压。

---

## 环境配置

```yaml
environments:
  dev:
    url: "{{DEV_URL}}"
    db: "local"
  staging:
    url: "{{STAGING_URL}}"
    db: "seeded"
  prod:
    url: "{{PROD_URL}}"
    smoke_only: true
```

---

## 测试数据策略

| 测试层级 | 数据来源 | 清理策略 |
|---------|---------|---------|
| 单元测试 | Factory 构建器 | 不需要（内存中） |
| 集成测试 | 预置数据库（脱敏） | 每套件执行后回滚/清理 |
| E2E 测试 | API 在测试前创建 | 每用例执行后删除 |
| 性能测试 | Faker 生成合成数据 | 测试结束后清理 |

> 测试账号与敏感信息统一从 `docs/spec/info.md` 获取，严禁硬编码或捏造。

---

## 质量基线（最低通过标准）

| 指标 | 目标值 |
|------|-------|
| 行覆盖率 | ≥{{X}}% |
| 关键路径覆盖率 | 100% |
| E2E 不稳定率 | <2%（超过立即隔离） |
| CI 总耗时 | <{{X}} 分钟 |
| 缺陷逃逸率 | <5% |
| 质量评分（qa_engine §第8阶段） | ≥61（良好） |
