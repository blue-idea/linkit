# 实施计划（Tasks）

> 文件路径：`docs/spec/tasks.md`
> 版本：{{VERSION}} · 日期：{{DATE}}

执行时须严格遵循 `docs/spec/requirements.md` 中对应需求的验收标准。
每项任务通过 `_需求:` 引用相关需求编号，通过 `_测试类型:` 关联 QA 执行章节，不在任务中重复需求细节。

---

## 任务清单

<!-- 复制下方 TASK 块以新增任务 -->

---

- [ ] **TASK-001 · {{TASK_NAME}}**

  > 依赖：{{DEPENDS_ON | 无}}

  - [ ] {{SUB_STEP_1}}
  - [ ] {{SUB_STEP_2}}
  - [ ] {{SUB_STEP_3}}

  **验证方式：**
  ```bash
  # {{VERIFICATION_COMMAND}}
  ```

  **验收证据：** {{EVIDENCE_DESCRIPTION}}

  _需求: `requirements.md` 中 {{REQ_ID}}
  验收标准：{{AC_ID_1}}, {{AC_ID_2}}
  _测试类型: {{Unit | API | E2E | Performance | Security | Manual}}

---

- [ ] **TASK-002 · {{TASK_NAME}}**

  > 依赖：TASK-001

  - [ ] {{SUB_STEP_1}}
  - [ ] {{SUB_STEP_2}}

  **验证方式：**
  ```bash
  # {{VERIFICATION_COMMAND}}
  ```

  **验收证据：** {{EVIDENCE_DESCRIPTION}}

  _需求: `requirements.md` 中 {{REQ_ID}}
  验收标准：{{AC_ID_1}}
  _测试类型: {{Unit | API | E2E | Performance | Security | Manual}}

<!-- 继续添加更多任务 -->

---

## 进度汇总

| TASK ID | 名称 | 测试类型 | 状态 | 关联需求 |
|---------|------|:-------:|:----:|---------|
| TASK-001 | {{TASK_NAME}} | {{TYPE}} | ⬜ 待开始 | {{REQ_ID}} |
| TASK-002 | {{TASK_NAME}} | {{TYPE}} | ⬜ 待开始 | {{REQ_ID}} |
