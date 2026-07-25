# 需求文档（Requirements）

> 文件路径：`docs/spec/requirements.md`
> 版本：{{VERSION}} · 日期：{{DATE}}
> 状态：草稿 / 已定稿（{{STATUS}}）

---

## 介绍

{{PROJECT_OVERVIEW}}

---

## 需求列表

<!-- 复制下方 REQ 块以新增需求 -->

---

### 需求 REQ-001 · {{REQUIREMENT_NAME}}

**用户故事：** 作为 {{ROLE}}，我希望 {{GOAL}}，以便 {{BENEFIT}}。

#### 验收标准

```yaml
# ── API 类型 AC ──────────────────────────────────────────────
- id: REQ-001-AC-001
  ears: >
    When {{TRIGGER}},
    the {{SYSTEM}} shall {{RESPONSE}}.
  test_type: API
  expected:
    http_status: 200
    body_schema:
      {{FIELD}}: "{{TYPE}}, {{CONSTRAINT}}"
    side_effects:
      - "{{SIDE_EFFECT_1}}"

# ── E2E 类型 AC ──────────────────────────────────────────────
- id: REQ-001-AC-002
  ears: >
    While {{PRECONDITION}},
    when {{TRIGGER}},
    the {{SYSTEM}} shall {{RESPONSE}}.
  test_type: E2E
  expected:
    ui_state: "{{EXPECTED_UI_STATE}}"
    url: "{{EXPECTED_URL_OR_OMIT}}"
    side_effects:
      - "{{SIDE_EFFECT}}"

# ── Unit 类型 AC ─────────────────────────────────────────────
- id: REQ-001-AC-003
  ears: >
    When {{TRIGGER}},
    the {{FUNCTION_OR_MODULE}} shall {{RESPONSE}}.
  test_type: Unit
  expected:
    return_value: "{{TYPE}}, {{CONSTRAINT}}"
    throws: "{{ERROR_TYPE_OR_OMIT}}"
    side_effects: []

# ── Manual 类型 AC ───────────────────────────────────────────
- id: REQ-001-AC-004
  ears: >
    When {{TRIGGER}},
    the {{SYSTEM}} shall {{RESPONSE}}.
  test_type: Manual
  expected:
    checklist:
      - "{{CHECK_ITEM_1}}"
      - "{{CHECK_ITEM_2}}"
```

> **expected 字段按 test_type 选用对应结构，删除其余块。**
>
> | test_type | 必填字段 | 可选字段 |
> |-----------|---------|---------|
> | `API` | `http_status`, `body_schema` | `side_effects` |
> | `E2E` | `ui_state` | `url`, `side_effects` |
> | `Unit` | `return_value` 或 `throws` | `side_effects` |
> | `Manual` | `checklist` | — |

---

### 需求 REQ-002 · {{REQUIREMENT_NAME}}

**用户故事：** 作为 {{ROLE}}，我希望 {{GOAL}}，以便 {{BENEFIT}}。

#### 验收标准

```yaml
- id: REQ-002-AC-001
  ears: >
    When {{TRIGGER}},
    the {{SYSTEM}} shall {{RESPONSE}}.
  test_type: Unit
  expected:
    return_value: "{{TYPE}}"
    throws: null
    side_effects: []
```

<!-- 继续添加更多需求 -->
