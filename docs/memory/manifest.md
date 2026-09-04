---
doc_type: memory
title: Memory Manifest (路由规则)
depth: L1
status: final
summary: 按任务类型按需加载记忆文件, 避免无差别注入全部上下文
---

# Memory Manifest

## 路由规则
根据当前任务类型, 只加载相关文件:

| 任务类型 | 加载文件 |
|---|---|
| 计划 / 讨论 | brief.md, decisions.md, constraints.md |
| 实现 / 调试 | brief.md, constraints.md, do-not-use.md |
| 架构设计 | decisions.md, constraints.md |
| 复盘 / 清理 | inbox.md, do-not-use.md |

## 文件职责
- **brief.md** — 当前项目形态与方向
- **decisions.md** — 已确认的架构与技术决策
- **constraints.md** — 不可违反的技术约束
- **do-not-use.md** — 已废弃路径与反模式
- **inbox.md** — 待确认的候选记忆

> 候选记忆需经证据 (用户确认/仓库文件/测试/issue) 验证后才晋升为活跃记忆。
