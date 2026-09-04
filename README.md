# chat-with-doc

一个 **Pi Agent extension + CLI**，实现 "chat with doc" 工作流：

> 以 markdown 为核心产物，像对待代码一样给文档建立工程最佳实践（目录规范、类型、schema、L1/L2/L3 深度），
> 并通过 **git worktree 隔离** 保证中间产物不污染核心产物。

## 核心理念
1. **Markdown 工程化** — `docs/` 按 `patterns/features/decisions/experiments/designs/memory/` 语义化切分
2. **渐进式披露** — Tier-1 发现 (frontmatter) / Tier-2 激活 (正文) / Tier-3 深入 (references)
3. **产物纪律** — `sync: true` 标记核心产物，未标记的随 worktree 回收
4. **多模式隔离** — discuss / design / experiment / produce / maintain 各自有 worktree 策略

## 目录结构
```
chat-with-doc/
├── AGENTS.md              # 入口索引 (瘦文件, 只做路由)
├── settings.json          # Pi 扩展声明
├── bin/cwd.js             # CLI 入口 (node 直接执行)
├── src/                   # Extension + 核心逻辑 (TypeScript)
├── skills/                # 6 个 SKILL.md (5 模式 + doc-sync)
├── docs/
│   ├── doc-standard.md    # markdown 工程规范
│   ├── templates/         # 5 个 doc_type 强制模板
│   ├── patterns|features|decisions|experiments|designs/
│   └── memory/            # MemoryCustodian 协议 (manifest 路由)
└── tests/                 # node --test 测试
```

## 快速开始

### 安装 (作为 Pi Extension)
```bash
pi install git:github.com/floatin/chat-with-doc
```
替换 `floatin` 为实际 GitHub 用户名或组织。安装后命令 `doc` 与工具 `doc_new` /
`doc_sync` 自动可用，技能 `mode-discuss` / `mode-design` / `mode-experiment` /
`mode-produce` / `mode-maintain` / `doc-sync` 自动加载。

### 从源码构建
```bash
git clone https://github.com/floatin/chat-with-doc
cd chat-with-doc
npm install
npm run build       # 编译 src/ → dist/
npm run build:test  # 编译测试 → dist-tests/
```

### 运行测试
```bash
npm test                       # 单元测试
npm run typecheck              # strict TypeScript 检查
npm run validate:docs          # CI: 校验 docs/ 下所有 .md 的 frontmatter
```

### 使用 CLI (无需 Pi)
```bash
# 按模板创建文档
node bin/cwd.js new decision --title "使用 worktree 隔离" --path docs/decisions/0002-isolation.md

# 校验 docs/ 下所有 .md
node bin/cwd.js validate

# 扫描 worktree 产物并按标记分类
node bin/cwd.js scan /path/to/worktree
```

### 作为 Pi Extension 使用
- **命令**: `/doc <mode> <task>` — 进入隔离 worktree
- **工具**: `doc_new` (创建文档) / `doc_sync` (扫描并分类产物)

## 文档标准 (摘要)
每份 markdown 统一 frontmatter:
```yaml
---
doc_type: decision|design|experiment|pattern|feature
title: ...
applies_to: [...]
depth: L1|L2|L3
summary: ...
references: [...]
---
```

产物同步标记:
```yaml
---
sync: true
target: memory|core-file|branch   # 未标记 → 随 worktree 回收
---
```

## 与 Treehouse 的关系
本扩展使用 pi-subagents 的 `isolation: "worktree"` 作为隔离原语。
若需 **worktree 池化复用 + 依赖缓存保留 + 租约追踪**，可在 extension 内改用
`treehouse get --lease` 获取 worktree，再派生子 Agent 到该路径。

## 发布到 pi.dev/packages
本扩展以 **git source** 发布到 pi.dev/packages 的索引（无需 `pi publish`）：
1. `package.json` 的 `keywords` 含 `"pi-package"`（被 pi.dev 索引抓取）
2. `package.json` 的 `pi` manifest 声明 `extensions` + `skills`
3. 仓库公开托管在 GitHub

发布流程：
```bash
npm run prepublishOnly   # 自动 build + test
git tag v0.1.0
git push origin main --tags
```

## License
MIT
