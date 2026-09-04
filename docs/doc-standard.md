---
doc_type: design
title: Markdown 工程规范 (chat-with-doc)
created: 2026-04-15
applies_to: []
depth: L1
status: final
summary: 定义 chat-with-doc 中所有 markdown 文档的目录结构、frontmatter schema、L1/L2/L3 深度与渐进式加载约定
goals: 为所有 markdown 产物建立统一的目录、schema、深度与加载约定
references:
  - templates/decision.md
  - templates/design.md
  - templates/experiment.md
  - templates/pattern.md
  - templates/feature.md
---

# Markdown 工程规范

## 1. 设计原则
把 markdown 当作**一等工程对象**, 对标代码的工程最佳实践:
- 有目录规范 (像 `src/` 分层)
- 有类型 (`doc_type`)
- 有接口 (frontmatter schema)
- 有深度等级 (L1/L2/L3)
- 有引用关系 (`applies_to`, `references`)
- 有加载策略 (Tier-1/2/3 渐进式披露)

## 2. 目录结构 (语义化切分)
```
docs/
├── doc-standard.md     # 本文件
├── templates/          # 各 doc_type 强制模板
├── patterns/           # "怎么做" — 可复用实现模式
├── features/           # "做什么" — 领域上下文
├── decisions/          # 架构决策记录 (ADR)
├── experiments/        # 实验记录
├── designs/            # 设计文档
└── memory/             # 跨会话记忆 (MemoryCustodian 协议)
    ├── manifest.md
    ├── brief.md
    ├── decisions.md
    ├── constraints.md
    └── do-not-use.md
```

**Patterns vs Features 二维切分**:
- `patterns/` 横切 (可跨 feature 复用)
- `features/` 纵向 (领域上下文)

## 3. Frontmatter Schema (所有文档统一)
```yaml
---
doc_type: decision|design|experiment|pattern|feature   # 必填, 文档类型
title: 人类可读标题                                     # 必填
created: 2026-04-15                                    # 建议
applies_to: [feature-a, feature-b]                     # 双向引用
depth: L1|L2|L3                                        # 深度等级
status: draft|final|superseded                         # 建议
summary: 一句话摘要 (< 200 字符, Tier-1 发现层用)        # 建议
references:                                            # Tier-3 深度资源
  - details.md
---
```

## 4. 渐进式披露 (Tier 1/2/3)
| 层级 | 内容 | 加载时机 | Token 预算 |
|---|---|---|---|
| Tier-1 发现 | frontmatter (doc_type, title, summary, applies_to) | 会话启动扫描 | ~100/文档 |
| Tier-2 激活 | 文档正文 (概要, 关键决策) | 任务匹配时 | < 5000 |
| Tier-3 深入 | `references` 指向的文件 | Agent 显式读取 | 无上限 |

## 5. 产物同步标记 (配合 worktree)
在 worktree 内产出的文档, 通过 frontmatter 声明同步目标:
```yaml
---
sync: true
target: memory|core-file|branch
---
```
- `sync: false` 或无标记 → 中间产物, 随 worktree 回收
- `target: memory` → 写入 `docs/memory/`
- `target: core-file` → 作为核心产物 merge 回父仓库
- `target: branch` → 整个 worktree 变更随 `pi-agent-*` 分支回传

## 6. 命名约定
- 文件名 kebab-case, 类型前缀: `decision-`, `design-`, `experiment-`, `pattern-`, `feature-`
- ADR 编号: `0001-短描述.md`
- 日期前缀用于实验: `2026-04-15-session-cache.md`

## 7. 校验
CI 运行 `npm run validate:docs` (即 `cwd validate`), 校验:
- 必须有合法 frontmatter
- 必填字段齐全 (按 doc_type)
- summary 长度 < 200 字符 (warning)
