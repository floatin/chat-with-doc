---
doc_type: agents-entry
summary: chat-with-doc 项目主指令与文档地图, 会话启动时加载
---

# AGENTS.md

> 本文件是入口索引 (瘦文件), 只放全局约束与文档地图。
> 详情按需加载对应文档正文, 深度内容见各文件 `references`。

## 项目概览
本项目采用 **chat-with-doc** 工作流: 以 markdown 为核心产物,
通过渐进式披露 (Tier-1 发现 / Tier-2 激活 / Tier-3 深入) 组织,
所有产生中间产物的活动都在隔离 worktree 中进行。

## 全局约束 (Always Load)
- 所有核心代码必须通过项目测试 (`npm test`)
- 直接修改生产数据前必须人工确认
- **产物纪律**: 未标记 `sync: true` 的文件视为中间产物, 随 worktree 回收
- 核心产物必须通过 frontmatter 声明同步目标 (memory / core-file / branch)

## 文档地图 (Discovery Layer)
会话启动时扫描以下目录的 frontmatter, 按任务相关性加载正文。

### 入口与规范
- [docs/doc-standard.md](docs/doc-standard.md) — markdown 工程规范 (frontmatter schema, L1/L2/L3, 命名)
- `docs/templates/*.md` — 各 doc_type 的强制模板

### 做什么 (Features)
- `docs/features/*.md` — 领域上下文

### 怎么做 (Patterns)
- `docs/patterns/*.md` — 可复用实现模式

### 决策
- `docs/decisions/*.md` — 架构决策记录 (ADR)
- `docs/memory/decisions.md` — 跨会话沉淀的关键决策
- `docs/memory/do-not-use.md` — 被否决方案与反模式

### 设计
- `docs/designs/*.md` — 设计文档

### 实验
- `docs/experiments/*.md` — 实验记录 (通常只读)

## 工作流入口 (chat-with-doc extension)
通过 `/doc <mode> <task>` 进入隔离 worktree:

| 模式 | worktree 策略 | 核心产物 | 早停 |
|---|---|---|---|
| discuss | 短租 | 结论 → docs/memory/ | 决策收敛 / 证伪 |
| design | 短租 | DESIGN.md → core-file | 评审通过 |
| experiment | 中租 | 可行路线 → 分支 | 可行性明确 |
| produce | 长租 (lease) | 功能代码 → PR | 任务完成 + 测试通过 |
| maintain | 长租 (lease) | 修复 → merge | 问题闭环 |

模式纪律详见 skills/ 下对应 SKILL.md。

## 渐进式加载约定
1. **Tier-1 发现**: 只读 frontmatter (doc_type, title, summary, applies_to)
2. **Tier-2 激活**: 任务相关时加载文档正文
3. **Tier-3 深入**: 显式读取 `references` 指向的文件

> 禁止在一次上下文中无差别加载全部 docs/ 内容。
