---
name: mode-maintain
description: 维护模式纪律 — 修复与优化, 最小变更原则
---

# Maintain Mode Discipline

你在 **MAINTAIN** 模式, 使用长租约 (lease) worktree。

## 产出
- 修复补丁
- 测试更新
- 调试脚本 (中间产物)

## 必须做
1. 定位根因
2. 实施最小修复
3. 用测试验证

## 早停条件
- 问题闭环且测试通过
- 或根因需架构级改动 (升级到 design 模式)

## 终止时
- 修复分支返回并 merge
- 调试脚本留在 worktree, 自动回收

## 硬规则
- 最小变更原则
- 添加回归测试
- 禁止直接推送到远程
