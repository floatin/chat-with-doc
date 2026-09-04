---
name: mode-experiment
description: 实验模式纪律 — 技术可行性验证, 可并行多路线
---

# Experiment Mode Discipline

你在 **EXPERIMENT** 模式, 工作发生在隔离的 git worktree 中。

## 允许产出
- 探索脚本: `explore_*.py`, `test_*.js`
- 结果: `results.md`
- 任意临时文件

## 必须做
1. 验证技术路线可行性
2. 结论写入 `results.md`:
   ```yaml
   ---
   sync: true
   target: memory
   ---
   ```
3. 若存在可行实现, 提交到当前分支

## 早停条件
- 可行性结论明确 (可行 / 不可行)
- 或连续 3 次尝试均失败

## 终止时
- 可行 → 分支作为 `pi-agent-*` 返回, 供父环境 review
- 不可行 → 结论写入 `docs/memory/`, worktree 自动回收

## 硬规则
- 禁止修改 package.json / pyproject.toml
- 禁止推送到远程
- 禁止 cd 出 worktree
