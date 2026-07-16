# 测试信息（Info）

> 文件路径：`docs/spec/info.md`
> 创建步骤：STEP 1（立规矩）
> ⚠️ 本文件包含测试凭据，**必须加入 `.gitignore`，禁止提交到版本库**

---

## 测试账号

| 角色 | 邮箱 | 密码 | 备注 |
|------|------|------|------|
| 管理员 | {{ADMIN_EMAIL}} | {{ADMIN_PASSWORD}} | 拥有全部权限 |
| 普通用户 | {{USER_EMAIL}} | {{USER_PASSWORD}} | 标准权限 |
| 只读用户 | {{READONLY_EMAIL}} | {{READONLY_PASSWORD}} | 无写权限 |
| 未激活用户 | {{INACTIVE_EMAIL}} | {{INACTIVE_PASSWORD}} | 邮箱未验证 |

> 如需更多角色，在此表追加行。每次 E2E 测试前确认账号可用。

---

## 测试环境

| 环境 | 基础 URL | 数据库 | 说明 |
|------|---------|--------|------|
| dev | `{{DEV_URL}}` | 本地 | 日常开发 |
| staging | `{{STAGING_URL}}` | 已预填数据 | QA 验收 |
| prod | `{{PROD_URL}}` | 真实数据 | 仅冒烟测试，禁止写操作 |

---

## 第三方服务测试凭据

| 服务 | 密钥 / 配置 | 用途 |
|------|------------|------|
| {{SERVICE_NAME}} | `{{KEY_OR_CONFIG}}` | {{PURPOSE}} |

> 所有密钥必须从 `.env.test` 读取，**禁止硬编码在测试代码中**。

---

## 测试数据说明

### 预置种子数据

```
{{SEED_DATA_DESCRIPTION}}
```

### 数据重置方式

```bash
# 重置 staging 数据库到初始状态
{{RESET_COMMAND}}
```

---

## 使用规范

1. 测试账号与测试数据统一从本文件获取，**严禁在测试代码中自行捏造**。
2. 若测试数据发生变更（密码重置、账号删除等），**必须同步更新本文件**。
3. 本文件加入 `.gitignore`；生产环境敏感信息使用 Secret Manager 管理。
