---
doc_type: design
title: chat-with-doc 扩展主流程设计 (示例)
created: 2026-04-15
applies_to: [EXAMPLE-FEATURE.md]
depth: L1
status: final
summary: 展示 design 文档的标准结构 — 命令 / 工具 / 子 Agent 三层职责切分
goals: 为扩展作者展示 design 文档应包含的章节与粒度
references:
  - ../templates/design.md
  - ../templates/decision.md
---

# Extension Pipeline Design

## Goals
- 展示 `design` 文档的标准章节
- 为新模块的设计评审提供模板

## Non-Goals
- 不替代 ADR（`decisions/0001-*` 才是决策记录）
- 不替代 feature spec（`features/EXAMPLE-*` 描述业务背景）

## Key Decisions
- 命令 (`/doc`) 只负责参数解析与派发，不直接调用 subagent API
- 工具 (`doc_new` / `doc_sync`) 是无副作用的纯函数 + 工作区写
- 子 Agent 由 `harness.ts` 通过 `pi-subagents` 事件总线派发

## Data Flow
```
用户输入 /doc <mode> <task>
   │
   ▼
extension.ts (解析 mode, 构造 SpawnRequest)
   │
   ▼
harness.ts (emitSpawn → pi-subagents 事件总线)
   │
   ▼
isolation: "worktree" 子 Agent (按 mode-<x> skill 纪律工作)
   │
   ▼
doc_sync 工具 (扫描 worktree 产物, 按 frontmatter 分类)
```

## Risks & Mitigations
- **风险**: 子 Agent 派发超时 (30s 默认)
  - **缓解**: `emitSpawn` 暴露 timeoutMs 参数, 模式可按需调整
- **风险**: worktree 隔离 ≠ OS 沙箱
  - **缓解**: 高风险任务叠加容器隔离 (详见 ADR-0001)

## References
- [ADR-0001 采用 git worktree 作为隔离原语](../decisions/0001-example-decision.md)
- [Example Feature](../features/EXAMPLE-FEATURE.md)