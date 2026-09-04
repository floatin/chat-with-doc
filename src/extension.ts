import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { MODES, getMode } from "./modes.js";
import { buildSpawnRequest, emitSpawn } from "./harness.js";
import { randomUUID } from "node:crypto";

/**
 * chat-with-doc 扩展入口。
 *
 * 职责（按关注点分离）:
 *   - 注册 /doc 命令：在指定 mode 下派生子 Agent 进入隔离 worktree
 *   - 注册 doc_sync 工具：扫描 worktree 产物并按 frontmatter 分类同步
 *   - 注册 doc_new 工具：按模板创建符合 schema 的新文档
 *
 * 不负责: worktree 具体实现 (harness.ts) / 产物分类 (sync.ts) / 模式纪律 (skills/*.md)
 */
export default function (pi: ExtensionAPI) {
  // ---------- /doc 命令: 进入某个文档驱动的工作模式 ----------
  pi.registerCommand("doc", {
    description:
      "chat-with-doc: 在隔离 worktree 中进入一个模式工作 (discuss|design|experiment|produce|maintain) <task>",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      if (parts.length < 2) {
        ctx.ui.notify(
          "用法: /doc <discuss|design|experiment|produce|maintain> <task>",
          "error"
        );
        return;
      }
      const [modeName, ...rest] = parts;
      const task = rest.join(" ");
      const cfg = getMode(modeName);
      if (!cfg) {
        ctx.ui.notify(`未知模式: ${modeName}`, "error");
        return;
      }

      const requestId = randomUUID();
      ctx.ui.notify(`[chat-with-doc] 派发 ${modeName} agent: ${task}`, "info");

      const req = buildSpawnRequest(cfg, task, requestId);
      const result = await emitSpawn(pi, req);

      if (!result.success) {
        ctx.ui.notify(`[chat-with-doc] 进入模式失败: ${result.error}`, "error");
        return;
      }
      ctx.ui.notify(
        `[chat-with-doc] 已进入 ${modeName} 模式 (agent ${result.data?.id ?? "unknown"})`,
        "info"
      );
    },
  });

  // ---------- doc_new: 按模板创建文档 ----------
  pi.registerTool({
    name: "doc_new",
    label: "Create Document",
    description:
      "按指定 doc_type 模板创建一份符合 frontmatter schema 的 markdown 文档",
    parameters: {
      type: "object",
      properties: {
        doc_type: {
          type: "string",
          description: "decision|design|experiment|pattern|feature",
        },
        title: { type: "string", description: "文档标题" },
        path: { type: "string", description: "相对仓库根的文件路径, 含 .md" },
        applies_to: {
          type: "array",
          items: { type: "string" },
          description: "双向引用列表",
        },
      },
      required: ["doc_type", "title", "path"],
    },
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const { doc_type, title, path, applies_to = [] } = params as any;
      const ok = await ctx.workspace.writeFile(
        path as string,
        renderTemplate(doc_type as string, {
          title: title as string,
          applies_to: applies_to as string[],
        })
      );
      return {
        content: [
          {
            type: "text",
            text: ok
              ? `已创建 ${path} (doc_type=${doc_type})`
              : `创建失败: ${path}`,
          },
        ],
      };
    },
  });

  // ---------- doc_sync: 扫描并分类 worktree 产物 ----------
  pi.registerTool({
    name: "doc_sync",
    label: "Sync Artifacts",
    description:
      "扫描 worktree 中的 markdown 产物, 按 frontmatter 标记分类 (memory/core-file/branch/discard)",
    parameters: {
      type: "object",
      properties: {
        worktree: { type: "string", description: "worktree 绝对路径" },
      },
      required: ["worktree"],
    },
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const { scanAndClassify } = await import("./sync.js");
      const plan = await scanAndClassify((params as any).worktree as string);
      const { renderSyncPlan } = await import("./sync.js");
      return { content: [{ type: "text", text: renderSyncPlan(plan) }] };
    },
  });
}

// 简单的模板渲染 (避免引入外部依赖)
function renderTemplate(
  doc_type: string,
  opts: { title: string; applies_to: string[] }
): string {
  const ref = opts.applies_to && opts.applies_to.length
    ? `\n  - ${opts.applies_to.join("\n  - ")}`
    : "";
  const now = new Date().toISOString().slice(0, 10);
  return `---
doc_type: ${doc_type}
title: ${opts.title}
created: ${now}
applies_to: [${opts.applies_to.map((a) => `"${a}"`).join(", ")}]
depth: L1
status: draft
summary: ""
references: []
---

# ${opts.title}

> 本文件由 \`doc_new\` 根据 \`templates/${doc_type}.md\` 生成，请补全正文。

## 概要
<!-- TODO: 一句话说明本文档要解决什么 -->

## 正文
<!-- TODO: 按 doc_type 对应的模板章节填充 -->

## References
${ref}
`;
}
