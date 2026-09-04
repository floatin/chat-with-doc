import type {
  ArtifactMarker,
  ClassifiedArtifact,
  DocType,
  SyncPlan,
  SyncTarget,
} from "./types.js";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const MEMORY_DIR = "docs/memory";

/** 解析 markdown frontmatter 的 sync 标记 */
export function parseMarker(content: string): ArtifactMarker {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*(\n|$)/);
  if (!fmMatch) return { sync: false, target: "discard" };

  const fm = fmMatch[1];
  const syncLine = fm.match(/^\s*sync:\s*(true|false)\s*$/m);
  if (!syncLine || syncLine[1] !== "true") return { sync: false, target: "discard" };

  const targetLine = fm.match(/^\s*target:\s*(memory|core-file|branch)\s*$/m);
  const target: SyncTarget = targetLine ? (targetLine[1] as SyncTarget) : "discard";

  return { sync: true, target };
}

/** 将产物按标记分类为四组 */
export function classifyArtifacts(
  artifacts: Array<{ path: string; content: string }>
): SyncPlan {
  const plan: SyncPlan = { memory: [], coreFiles: [], branch: [], discard: [] };
  for (const a of artifacts) {
    const marker = parseMarker(a.content);
    const item: ClassifiedArtifact = { path: a.path, marker };
    if (marker.sync) {
      if (marker.target === "memory") plan.memory.push(item);
      else if (marker.target === "core-file") plan.coreFiles.push(item);
      else if (marker.target === "branch") plan.branch.push(item);
      else plan.discard.push(item);
    } else {
      plan.discard.push(item);
    }
  }
  return plan;
}

/** 将 memory 类产物追加写入 docs/memory/ */
export async function applyMemorySync(
  plan: SyncPlan,
  repoRoot: string
): Promise<string[]> {
  const dir = join(repoRoot, MEMORY_DIR);
  await fs.mkdir(dir, { recursive: true });
  const written: string[] = [];
  for (const a of plan.memory) {
    const target = join(dir, "decisions.md");
    const entry = `\n\n## ${a.path}\n\n<!-- synced from worktree -->\n`;
    await fs.appendFile(target, entry, "utf8");
    written.push(target);
  }
  return written;
}

/** 渲染同步计划为人类可读摘要 */
export function renderSyncPlan(plan: SyncPlan): string {
  let out = "## Sync Plan (chat-with-doc)\n\n";
  const section = (label: string, items: ClassifiedArtifact[]) => {
    if (!items.length) return "";
    return `**${label} (${items.length}):**\n${items
      .map((i) => `  - ${i.path}`)
      .join("\n")}\n\n`;
  };
  out += section("Memory (写入 docs/memory/)", plan.memory);
  out += section("Core Files (作为核心产物 merge)", plan.coreFiles);
  out += section("Branch (随 pi-agent-* 分支回传)", plan.branch);
  out += section("Discard (随 worktree 回收, 不污染父仓库)", plan.discard);
  if (out.endsWith("\n\n")) out = out.slice(0, -2);
  return out + "\n";
}

/**
 * 扫描 worktree 目录, 收集 markdown 产物并分类。
 * 只处理 .md 文件; 调用方 (extension) 负责限定扫描范围。
 */
export async function scanAndClassify(worktree: string): Promise<SyncPlan> {
  const artifacts: Array<{ path: string; content: string }> = [];
  const entries = await collectMarkdown(worktree);
  for (const rel of entries) {
    const abs = join(worktree, rel);
    const content = await fs.readFile(abs, "utf8").catch(() => "");
    artifacts.push({ path: rel, content });
  }
  return classifyArtifacts(artifacts);
}

async function collectMarkdown(root: string): Promise<string[]> {
  // 简单递归, 避免引入 fast-glob 运行时依赖到核心路径
  const out: string[] = [];
  async function walk(dir: string, base = "") {
    let list: string[] = [];
    try {
      list = await fs.readdir(dir);
    } catch {
      return;
    }
    for (const name of list) {
      if (name.startsWith(".") && name !== ".git") continue;
      const abs = join(dir, name);
      const rel = base ? `${base}/${name}` : name;
      const stat = await fs.stat(abs).catch(() => null);
      if (!stat) continue;
      if (stat.isDirectory()) {
        if (name === "node_modules" || name === ".git") continue;
        await walk(abs, rel);
      } else if (name.endsWith(".md")) {
        out.push(rel);
      }
    }
  }
  await walk(root);
  return out;
}
