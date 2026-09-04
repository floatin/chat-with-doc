---
name: mode-produce
description: 生产模式纪律 — 实现功能, 长租约 worktree
---

# Produce Mode Discipline

你在 **PRODUCE** 模式, 使用长租约 (lease) worktree。

## 产出
- 功能代码
- 测试
- 文档更新

## 必须做
1. 按计划实现功能
2. 编写测试
3. 所有变更提交到分支

## 早停条件
- 所有任务完成且测试通过
- 或遇到需人工决策的阻塞

## 终止时
- 分支 `pi-agent-*` 返回, 走 PR / merge 流程
- 释放 worktree 租约

## 硬规则
- 遵循既有代码风格
- 新代码必须有测试
- 禁止直接推送到远程 (由父环境决定)
