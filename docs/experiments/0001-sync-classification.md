---
doc_type: experiment
title: sync 标记分类可行性验证 (示例)
created: 2026-04-15
applies_to: [EXAMPLE-FEATURE.md]
depth: L1
status: draft
summary: 验证 frontmatter sync 标记能否可靠区分产物, 避免中间产物污染父仓库
hypothesis: 仅靠 frontmatter 的 sync/target 字段, 就能把 worktree 产物正确分到 memory/core-file/branch/discard 四组
conclusion: pending
references:
  - ../templates/experiment.md
---

# Sync Marker Classification

## Hypothesis
通过 markdown frontmatter 中的 `sync: true/false` 与 `target: memory|core-file|branch`
两个字段, 即可无歧义地将 worktree 产物映射到四组同步动作, 无需额外元数据。

## Method
1. 准备 10 份测试 markdown:
   - 3 份 `sync: true target: memory`
   - 2 份 `sync: true target: core-file`
   - 1 份 `sync: true target: branch`
   - 4 份无 sync 字段 (预期 discard)
2. 调用 `classifyArtifacts(artifacts)` 并断言分组数量与预期一致
3. 边界场景:
   - 缺 frontmatter
   - 缺 target 字段 (sync: true 但 target 缺)
   - 大小写混用 (`Sync: True`)

## Results
- 已实现: `parseMarker` / `classifyArtifacts` (src/sync.ts)
- 已覆盖: 缺 frontmatter、sync:false、容忍冒号后空格与引号 (tests/sync.test.ts)
- 待补: 大小写混用、空 target 字段的边界

## Conclusion
**pending** — 主流程 (有 sync 标记) 可行, 边界用例需补测试。

## References
- [模板](../templates/experiment.md)
- [示例功能](../features/EXAMPLE-FEATURE.md)