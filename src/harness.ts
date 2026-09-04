import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { ModeConfig } from "./types.js";

interface SpawnRequest {
  requestId: string;
  type: string;
  prompt: string;
  options: {
    description?: string;
    isolation?: "worktree";
    skills?: string[];
    memory?: "project" | "local" | "user";
    cwd?: string;
    lease_holder?: string;
  };
}

/**
 * 构造派生子 Agent 的请求。
 * 关键: isolation: "worktree" 由 pi-subagents 保证 ——
 *   无改动自动清理; 有改动提交到 pi-agent-* 分支; 创建失败直接报错而非降级。
 */
export function buildSpawnRequest(
  cfg: ModeConfig,
  task: string,
  requestId: string
): SpawnRequest {
  return {
    requestId,
    type: "general-purpose",
    prompt:
      `进入 ${cfg.name} 模式。任务: ${task}\n\n` +
      `你在一个隔离的 git worktree 中工作。所有产出 (脚本/原型/markdown) ` +
      `默认留在 worktree 内，只有显式标记 sync:true 的产物才会回传父环境。\n` +
      `请严格遵循 ${cfg.skill} 技能的纪律。`,
    options: {
      description: `${cfg.name}: ${task}`,
      isolation: "worktree",
      skills: [cfg.skill, "doc-sync"],
      memory: "project",
      ...(cfg.lease ? { lease_holder: `cwd-${cfg.name}-${Date.now()}` } : {}),
    },
  };
}

/** 通过 pi-subagents 事件总线派生子 Agent, 带超时与单次响应订阅 */
export function emitSpawn(
  pi: ExtensionAPI,
  req: SpawnRequest,
  timeoutMs = 30000
): Promise<{ success: boolean; data?: any; error?: string }> {
  return new Promise((resolve) => {
    let settled = false;

    const replyEvent = `subagents:rpc:spawn:reply:${req.requestId}`;
    const unsub = pi.events.on(replyEvent, (reply: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub();
      if (!reply?.success) {
        resolve({ success: false, error: reply?.error ?? "unknown" });
        return;
      }
      resolve({ success: true, data: reply.data });
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsub();
      resolve({ success: false, error: "spawn timeout" });
    }, timeoutMs);

    pi.events.emit("subagents:rpc:spawn", req);
  });
}
