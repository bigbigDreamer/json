# Implementation Plan: JSON 一键压缩

**Branch**: `002-json-minify` | **Date**: 2026-03-30 | **Spec**: [spec.md](/Users/ryanwang/personal-workspace/json/specs/002-json-minify/spec.md)
**Input**: Feature specification from `/Users/ryanwang/personal-workspace/json/specs/002-json-minify/spec.md`

## Summary

在现有 Aura JSON Studio 双栏工作流中补充“一键压缩”能力。实现方式是在现有 JSON 清理与解析链路上复用安全的输入标准化逻辑，新增独立的压缩结果生成路径、结果态文案与复制入口，同时保持原始输入不被覆盖、现有格式化与树视图体验不回退。

## Technical Context

**Language/Version**: TypeScript 5.x on Node-compatible Next.js 15 App Router  
**Primary Dependencies**: Next.js 15, React 19, React DOM 19  
**Storage**: N/A  
**Testing**: 新增 Vitest 单元测试，优先覆盖 `lib/json-tools.ts` 的压缩与清理逻辑  
**Target Platform**: 现代桌面与移动浏览器上的 Next.js Web 应用  
**Project Type**: 单体前端 Web 应用  
**Performance Goals**: 单次压缩应保持即时交互感；常见 JSON 粘贴后触发结果更新应接近当前格式化体验，不引入可感知卡顿  
**Constraints**: 不改变合法 JSON 语义；不覆盖原始输入；保留现有格式化与树视图能力；离线或受限网络环境下构建行为保持稳定  
**Scale/Scope**: 单页面 JSON 处理工作台内的一个新增用户操作，涉及 `app/`、`components/`、`lib/` 与新增测试文件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` 当前仍是模板占位文本，因此本计划按仓库中的实际约束文件 `speckit.constitution` 执行检查。

- **Next.js First**: 通过。改动限制在现有 App Router 页面与组件内，不引入新的运行时架构。
- **Premium Visual Quality**: 通过。新增压缩操作将复用现有输入/输出层级，不打乱主要视觉层次。
- **Formatting Must Be Safe**: 通过。压缩链路必须建立在既有清理与解析成功之后，保证只移除可预测空白，不改动有效 JSON 值。
- **Structure Is The Core Product**: 通过。格式化树视图继续保留；压缩能力作为并行结果路径存在，不替代结构浏览能力。
- **Copying Must Work At Multiple Scopes**: 通过。现有整份复制、节点复制、值复制保留；新增压缩结果复制补齐新的使用场景。
- **Engineering Rules**: 通过。核心转换逻辑继续放在 `lib/`，UI 组件只负责状态编排和展示；不为该功能引入不必要依赖。
- **Testing Standard**: 通过，但需要补足。核心功能变更必须增加自动化测试，优先覆盖纯函数转换与错误反馈边界。

**Post-Design Re-check**: 通过。Phase 1 设计保持逻辑与 UI 分层，引入的测试与契约文档均符合现有产品原则，没有发现需要记录的例外项。

## Project Structure

### Documentation (this feature)

```text
specs/002-json-minify/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── json-minify-ui-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── layout.tsx
├── page.tsx
└── globals.css

components/
└── json-studio.tsx

lib/
└── json-tools.ts

tests/
└── unit/
    └── json-tools.test.ts
```

**Structure Decision**: 继续沿用当前单体 Next.js 应用结构。页面组合保留在 `app/`，交互编排集中在 `components/json-studio.tsx`，纯 JSON 处理逻辑继续收口到 `lib/json-tools.ts`，新增自动化测试放入 `tests/unit/`，避免把转换细节塞回 UI 组件。

## Complexity Tracking

当前设计无宪法违规项，无需额外复杂度豁免。
