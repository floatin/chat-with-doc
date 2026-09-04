---
doc_type: decision
title: 采用 git worktree 作为隔离原语 (示例 ADR)
created: 2026-04-15
applies_to: [EXAMPLE-FEATURE.md]
depth: L1
status: accepted
summary: 采用 git worktree 而非容器, 换取轻量与复用性
references: []
---

# ADR-0001: 采用 git worktree 作为隔离原语

## Context
多模式并发工作时需要文件级隔离, 且不希望引入容器开销。

## Decision
使用 `isolation: "worktree"` (pi-subagents) 作为默认隔离原语;
涉及不可信代码执行时再叠加容器级隔离。

## Consequences
- 正: 轻量、复用依赖缓存、与 git 流程天然融合
- 负: worktree 隔离 ≠ OS 沙箱, shell 权限下非强制

## Alternatives Considered
- 容器隔离: 更安全但偏重, 留作高风险场景补充

## References
