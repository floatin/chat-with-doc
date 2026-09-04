#!/usr/bin/env node
/**
 * cwd (chat-with-doc) CLI
 *
 * 子命令:
 *   cwd new <doc_type> --title "..." --path docs/.../<file>.md [--applies-to a,b]
 *       按模板创建一份符合 schema 的 markdown 文档
 *   cwd validate [目录]
 *       校验 docs/ 下所有 .md 的 frontmatter 结构 (CI 可用)
 *   cwd scan <worktree目录>
 *       扫描 worktree 中的 markdown 产物并按标记分类
 *   cwd help
 */
import { promises as fs } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SRC = resolve(__dirname, "..", "dist");

function parseArgs(argv) {
  const out = { _: [], "--": {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out["--"][key] = val;
    } else {
      out._.push(a);
    }
  }
  return out;
}

function renderTemplate(doc_type, opts) {
  const ref = opts.applies_to && opts.applies_to.length
    ? `\n  - ${opts.applies_to.join("\n  - ")}`
    : "";
  return `---
doc_type: ${doc_type}
title: ${opts.title}
created: ${new Date().toISOString().slice(0, 10)}
applies_to: [${opts.applies_to.map((a) => `"${a}"`).join(", ")}]
depth: L1
status: draft
summary: ""
references: []
---

# ${opts.title}

> 本文件由 \`cwd new\` 根据 \`templates/${doc_type}.md\` 生成。

## 概要
<!-- TODO -->

## 正文
<!-- TODO: 按 doc_type 对应模板章节填充 -->

## References
${ref}
`;
}

async function cmdNew(args) {
  const { _, "--": flags } = args;
  const doc_type = _[1];
  const title = flags.title;
  const path = flags.path;
  if (!doc_type || !title || !path) {
    console.error("用法: cwd new <doc_type> --title \"...\" --path <相对路径.md>");
    process.exit(1);
  }
  const applies_to = (flags["applies-to"] || "").split(",").filter(Boolean);
  const content = renderTemplate(doc_type, { title, applies_to });
  const abs = join(process.cwd(), path);
  await fs.mkdir(dirname(abs), { recursive: true }).catch(() => {});
  await fs.writeFile(abs, content, "utf8");
  console.log(`✅ 已创建 ${path} (doc_type=${doc_type})`);
}

async function cmdValidate(args) {
  const { _ } = args;
  const dir = resolve(_[1] || process.cwd());
  // 动态加载编译后的 validate.js
  const { validateDocs } = await import(join(SRC, "validate.js"));
  const result = await validateDocs(dir);
  for (const issue of result.issues) {
    const tag = issue.severity === "error" ? "❌" : "⚠️";
    console.log(`${tag} ${issue.file}: ${issue.message}`);
  }
  console.log(`\n扫描 ${result.files} 个文件, 发现 ${result.issues.length} 个问题。`);
  if (result.issues.some((i) => i.severity === "error")) process.exit(1);
}

async function cmdScan(args) {
  const { _ } = args;
  const worktree = resolve(_[1] || process.cwd());
  const { scanAndClassify, renderSyncPlan } = await import(join(SRC, "sync.js"));
  const plan = await scanAndClassify(worktree);
  console.log(renderSyncPlan(plan));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || "help";
  switch (cmd) {
    case "new":
      await cmdNew(args);
      break;
    case "validate":
      await cmdValidate(args);
      break;
    case "scan":
      await cmdScan(args);
      break;
    case "help":
    case "--help":
    default:
      console.log(`chat-with-doc (cwd) CLI

用法:
  cwd new <doc_type> --title "<标题>" --path <相对路径.md> [--applies-to a,b]
  cwd validate [项目根目录]
  cwd scan <worktree目录>
  cwd help

doc_type: decision | design | experiment | pattern | feature
`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
