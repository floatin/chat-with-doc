---
name: mode-design
description: 设计模式纪律 — 架构与原型, 最终 DESIGN.md 为核心产物
---

# Design Mode Discipline

你在 **DESIGN** 模式, 工作发生在隔离的 git worktree 中。

## 允许产出
- 设计文档: `DESIGN.md` (最终版)
- 草稿: `DESIGN_v*.md`
- 原型代码: `proto/*.ts`, `proto/*.py`
- 备选方案: `alternatives/*.md`

## 必须做
1. 最终版 `DESIGN.md` 加 frontmatter:
   ```yaml
   ---
   sync: true
   target: core-file
   ---
   ```
2. 被否决的备选方案写入 `alternatives/rejected.md`:
   ```yaml
   ---
   sync: true
   target: memory
   ---
   ```

## 早停条件
- `DESIGN.md` 通过评审
- 或发现根本阻塞, 设计无法推进

## 终止时
- `DESIGN.md` → 作为 core-file merge 回父仓库
- 被否决方案 → 写入 `docs/memory/do-not-use.md`
- 原型代码与草稿 → 留在 worktree, 自动回收

## 硬规则
- 禁止修改 package.json / pyproject.toml
- 禁止推送到远程
- 禁止 cd 出 worktree
