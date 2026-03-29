# Tasks: JSON 一键压缩

**Input**: Design documents from `/Users/ryanwang/personal-workspace/json/specs/002-json-minify/`
**Prerequisites**: [plan.md](/Users/ryanwang/personal-workspace/json/specs/002-json-minify/plan.md), [spec.md](/Users/ryanwang/personal-workspace/json/specs/002-json-minify/spec.md), [research.md](/Users/ryanwang/personal-workspace/json/specs/002-json-minify/research.md), [data-model.md](/Users/ryanwang/personal-workspace/json/specs/002-json-minify/data-model.md), [json-minify-ui-contract.md](/Users/ryanwang/personal-workspace/json/specs/002-json-minify/contracts/json-minify-ui-contract.md), [quickstart.md](/Users/ryanwang/personal-workspace/json/specs/002-json-minify/quickstart.md)

**Tests**: 本特性需要自动化测试。优先为 `lib/json-tools.ts` 添加 Vitest 单元测试，覆盖压缩成功、顶层基础类型、已压缩输入稳定性、隐形字符清理与失败反馈。

**Organization**: 任务按用户故事分组，保证每个故事都能独立实现、独立验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、且不依赖未完成任务）
- **[Story]**: 仅用于用户故事阶段，映射 `spec.md` 中的 US1、US2、US3
- 每条任务都包含明确文件路径，便于直接执行

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立本次功能所需的测试与执行基础设施

- [X] T001 [P] 更新 `package.json` 和 `package-lock.json`，补充 Vitest 所需依赖与测试命令
- [X] T002 [P] 新建 `vitest.config.ts`，为 `tests/unit/json-tools.test.ts` 提供仓库级单元测试配置

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 完成所有用户故事共享的底层能力，未完成前不要开始故事实现

**⚠️ CRITICAL**: 本阶段完成前，不要进入任一用户故事开发

- [X] T003 重构 `lib/json-tools.ts` 中的清理、解析与规范化链路，提取格式化和压缩共用的纯转换基础
- [X] T004 调整 `components/json-studio.tsx` 的结果状态模型，支持区分 `format` 与 `minify` 模式且不覆盖原始输入

**Checkpoint**: 共享转换链路与模式状态就绪，可以开始实现用户故事

---

## Phase 3: User Story 1 - 一键生成压缩结果 (Priority: P1) 🎯 MVP

**Goal**: 用户在现有输入区中执行一次操作，就能得到语义等价的压缩 JSON 结果

**Independent Test**: 在输入区粘贴一段多行合法 JSON，执行压缩后，结果区立即显示一份更紧凑的一行 JSON，且原始输入保持不变

### Tests for User Story 1

- [X] T005 [US1] 在 `tests/unit/json-tools.test.ts` 中添加对象、数组和顶层基础类型的压缩成功用例

### Implementation for User Story 1

- [X] T006 [US1] 在 `lib/json-tools.ts` 中实现 `minifyJsonInput` 的成功结果生成与稳定输出
- [X] T007 [US1] 在 `components/json-studio.tsx` 中新增独立的“压缩 JSON”触发动作与处理函数
- [X] T008 [US1] 在 `components/json-studio.tsx` 中渲染可辨认的压缩结果区域与压缩态文案
- [X] T009 [US1] 在 `app/globals.css` 中补充压缩操作按钮与压缩结果态的样式

**Checkpoint**: User Story 1 完成后，压缩主流程应可单独演示，满足 MVP 目标

---

## Phase 4: User Story 2 - 快速复制压缩结果 (Priority: P2)

**Goal**: 用户能够清楚识别当前结果处于压缩态，并一次复制完整压缩结果

**Independent Test**: 成功压缩后，用户能在结果区域识别“当前是压缩结果”，并通过一次复制操作拿到与界面显示一致的完整压缩文本

### Implementation for User Story 2

- [X] T010 [US2] 在 `components/json-studio.tsx` 中扩展复制状态与 token 逻辑，支持压缩结果的独立复制反馈
- [X] T011 [US2] 在 `components/json-studio.tsx` 中为压缩结果添加专属复制入口、确认文案与辅助说明
- [X] T012 [US2] 在 `app/globals.css` 中完善压缩结果复制控件与反馈态样式

**Checkpoint**: User Story 2 完成后，压缩结果应可被可靠识别并快速复制，不影响现有复制全部/节点/值能力

---

## Phase 5: User Story 3 - 无效输入时获得明确反馈 (Priority: P3)

**Goal**: 非法 JSON 或需清理的输入在压缩流程中得到明确、可理解的反馈，而不是产生错误结果

**Independent Test**: 输入非法 JSON 时，界面不显示新的压缩结果并展示明确错误；输入带 BOM 或零宽字符的样本时，界面继续压缩并展示清理摘要

### Tests for User Story 3

- [X] T013 [US3] 在 `tests/unit/json-tools.test.ts` 中添加非法 JSON、已清理后成功压缩、已清理后仍失败的压缩边界用例

### Implementation for User Story 3

- [X] T014 [US3] 在 `lib/json-tools.ts` 中补充压缩流程的错误结果、清理摘要与失败消息拼装逻辑
- [X] T015 [US3] 在 `components/json-studio.tsx` 中处理压缩失败时的过期结果清除与模式化错误反馈展示
- [X] T016 [US3] 在 `app/globals.css` 中补充压缩错误态与清理摘要态的展示样式

**Checkpoint**: User Story 3 完成后，压缩功能在失败与清理边界上都应具备清晰、可信的用户反馈

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 覆盖影响多个用户故事的收尾工作

- [X] T017 统一 `components/json-studio.tsx` 中格式化/压缩两条路径的帮助文案、状态标签与回退提示
- [X] T018 依据 `specs/002-json-minify/quickstart.md` 执行完整验证，并将最终验证说明补充到 `specs/002-json-minify/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 可立即开始
- **Phase 2 (Foundational)**: 依赖 Phase 1 完成，并阻塞所有用户故事
- **Phase 3 (US1)**: 依赖 Foundational 完成；这是 MVP，建议最先交付
- **Phase 4 (US2)**: 依赖 US1 完成，因为复制压缩结果建立在压缩结果已可见的前提上
- **Phase 5 (US3)**: 依赖 US1 完成；不依赖 US2，但共享同一压缩触发面与结果状态
- **Phase 6 (Polish)**: 依赖所有目标用户故事完成

### User Story Dependencies

- **US1 (P1)**: 无其他用户故事依赖，是最小可交付版本
- **US2 (P2)**: 依赖 US1 的压缩结果展示能力
- **US3 (P3)**: 依赖 US1 的压缩触发入口，但可独立于 US2 验证失败与清理反馈

### Within Each User Story

- 测试任务必须先写，并在实现前处于失败状态
- `lib/json-tools.ts` 的转换能力先于 `components/json-studio.tsx` 的界面接入
- 组件行为完成后，再补充 `app/globals.css` 的视觉收口
- 每个故事完成后都应按独立测试标准先做一次单独验证

### Parallel Opportunities

- Phase 1 中的 T001 与 T002 可并行处理
- 本特性的大多数故事任务集中在 `components/json-studio.tsx`，因此故事内并行空间有限，应以顺序推进为主
- 若多人协作，US3 的测试准备可在 US1 稳定后与 US2 的实现分头推进

---

## Parallel Example: User Story 1

```bash
# User Story 1 以顺序实现最安全，建议按以下顺序推进：
Task: "在 tests/unit/json-tools.test.ts 中添加对象、数组和顶层基础类型的压缩成功用例"
Task: "在 lib/json-tools.ts 中实现 minifyJsonInput 的成功结果生成与稳定输出"
Task: "在 components/json-studio.tsx 中新增独立的压缩 JSON 触发动作与处理函数"
Task: "在 components/json-studio.tsx 中渲染可辨认的压缩结果区域与压缩态文案"
Task: "在 app/globals.css 中补充压缩操作按钮与压缩结果态的样式"
```

---

## Parallel Example: User Story 2

```bash
# User Story 2 同样以顺序实现为主，因为复制状态与入口都集中在 components/json-studio.tsx：
Task: "在 components/json-studio.tsx 中扩展复制状态与 token 逻辑，支持压缩结果的独立复制反馈"
Task: "在 components/json-studio.tsx 中为压缩结果添加专属复制入口、确认文案与辅助说明"
Task: "在 app/globals.css 中完善压缩结果复制控件与反馈态样式"
```

---

## Parallel Example: User Story 3

```bash
# User Story 3 先补失败/清理边界测试，再顺序接入 lib 与 UI：
Task: "在 tests/unit/json-tools.test.ts 中添加非法 JSON、已清理后成功压缩、已清理后仍失败的压缩边界用例"
Task: "在 lib/json-tools.ts 中补充压缩流程的错误结果、清理摘要与失败消息拼装逻辑"
Task: "在 components/json-studio.tsx 中处理压缩失败时的过期结果清除与模式化错误反馈展示"
Task: "在 app/globals.css 中补充压缩错误态与清理摘要态的展示样式"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational
3. 完成 Phase 3: User Story 1
4. 立即按 US1 的独立测试标准验证压缩主流程
5. 通过后即可作为 MVP 演示或继续迭代

### Incremental Delivery

1. 先完成 Setup + Foundational，建立共享基础
2. 交付 US1，验证一键压缩主流程
3. 在不回退 US1 的前提下交付 US2，补齐复制闭环
4. 最后交付 US3，完善失败与清理反馈
5. 进入 Polish，统一文案与完整验证

### Parallel Team Strategy

1. 一名开发先完成 Phase 1 和 Phase 2
2. US1 稳定后：
   - 开发 A: 推进 US2 的复制体验
   - 开发 B: 推进 US3 的失败与清理反馈
3. 两条故事线完成后一起做 Polish 与 quickstart 验证

---

## Notes

- 所有任务都遵循 `- [ ] Txxx ... 文件路径` 格式
- `[P]` 仅用于真正可以并行的任务
- 本次 MVP 建议范围是 **US1 only**
- 避免把压缩逻辑直接塞进 UI 组件；共享转换逻辑应继续收口在 `lib/json-tools.ts`
