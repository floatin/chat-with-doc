---
name: doc-sync
description: 产物同步通用规则 — 所有模式共用, 定义 sync 标记与 Tier 1/2/3 约定
---

# Artifact Sync Rules (所有模式共用)

## 标记协议
每份产出文件的 frontmatter:
```yaml
---
sync: true|false
target: memory|core-file|branch
---
```

## 分类
| 标记 | 行为 |
|---|---|
| `sync: false` 或无标记 | 中间产物 → 留 worktree → 自动回收 |
| `sync: true, target: memory` | 写入 `docs/memory/` |
| `sync: true, target: core-file` | 核心产物 → 返回分支供父环境 merge |
| `sync: true, target: branch` | worktree 全部变更 → 返回分支 |

## 父环境侧流程
1. 子 Agent 完成 → 返回 completion (含分支名)
2. 父环境展示 diff 摘要
3. 用户确认: merge / keep-as-branch / discard
4. memory 条目写入 `docs/memory/`

## 渐进式披露 (Tier 1/2/3)
- **Tier-1 发现**: 只扫描 frontmatter (doc_type, title, summary, applies_to)
- **Tier-2 激活**: 任务相关时加载文档正文
- **Tier-3 深入**: 显式读取 `references` 指向的文件

> 安全原则: 未标记一律按 discard; 有疑问时丢弃; 绝不自动 merge。
