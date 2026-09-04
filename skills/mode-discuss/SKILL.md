---
name: mode-discuss
description: 讨论模式纪律 — 探索、论证、验证观点, 产出脚本与 markdown 均为中间产物
---

# Discuss Mode Discipline

你在 **DISCUSS** 模式, 工作发生在隔离的 git worktree 中。

## 允许产出 (均为中间产物, 留在 worktree)
- 论证脚本: `prove_*.py`, `benchmark_*.js`, `validate_*.ts`
- 论证 markdown: `discussion/*.md`
- 随手笔记: `scratchpad.md`

## 必须做
1. 自由探索, 写脚本去证明或证伪主张
2. 决策收敛时写入 `discussion/decision_log.md`, 加 frontmatter:
   ```yaml
   ---
   sync: true
   target: memory
   ---
   ```

## 早停条件 (Early Stop)
- 决策收敛 (converge)
- 或路线被证伪 (diverge)
- 或连续 3 轮探索无新信息

## 终止时
- `decision_log.md` 中 `sync: true` 条目 → 写入 `docs/memory/decisions.md`
- 其余文件 (脚本、草稿) → 留在 worktree, 自动回收
- **不要**尝试直接写入父仓库路径

## 硬规则
- 禁止修改 package.json / pyproject.toml (避免锁文件冲突)
- 禁止推送到远程
- 禁止 cd 出 worktree
