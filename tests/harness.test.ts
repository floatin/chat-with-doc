import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSpawnRequest, emitSpawn } from "../src/harness.js";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { MODES } from "../src/modes.js";

// ---------- buildSpawnRequest ----------
test("harness: buildSpawnRequest shapes spawn request per mode config", () => {
  const cfg = MODES.produce;
  const req = buildSpawnRequest(cfg, "ship v0.2", "req-123");

  assert.equal(req.requestId, "req-123");
  assert.equal(req.type, "general-purpose");
  assert.match(req.prompt, /进入 produce 模式/);
  assert.match(req.prompt, /任务: ship v0\.2/);
  assert.match(req.prompt, /隔离的 git worktree/);
  assert.match(req.prompt, /produce/);
  assert.equal(req.options.isolation, "worktree");
  assert.deepEqual(req.options.skills, ["mode-produce", "doc-sync"]);
  assert.match(req.options.lease_holder!, /^cwd-produce-\d+$/);
  assert.equal(req.options.memory, "project");
});

test("harness: short-lease modes do NOT set lease_holder", () => {
  for (const name of ["discuss", "design", "experiment"] as const) {
    const req = buildSpawnRequest(MODES[name], "task", "id");
    assert.equal(req.options.lease_holder, undefined, `${name} should not lease`);
  }
});

// ---------- emitSpawn RPC behaviour ----------
function mockPi() {
  const emitted: Array<{ event: string; payload: any }> = [];
  const listeners = new Map<string, Set<Function>>();
  const api: ExtensionAPI = {
    registerCommand() {},
    registerTool() {},
    events: {
      on(event, l) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(l);
        return () => listeners.get(event)!.delete(l);
      },
      emit(event, payload) {
        emitted.push({ event, payload });
        listeners.get(event)?.forEach((l) => l(payload));
      },
    },
    ui: { notify() {} },
    workspace: { async writeFile() { return true; } },
  };
  return { api, emitted, listeners };
}

test("harness: emitSpawn resolves on matching reply event", async () => {
  const { api, emitted, listeners } = mockPi();
  const cfg = MODES.discuss;
  const req = buildSpawnRequest(cfg, "explore", "req-A");

  const promise = emitSpawn(api, req, 1000);

  // Capture the spawned event
  await new Promise((r) => setImmediate(r));
  const spawnEvent = emitted.find((e) => e.event === "subagents:rpc:spawn")!;
  assert.ok(spawnEvent, "expected spawn event");

  // Simulate subagents replying
  const replyEvent = `subagents:rpc:spawn:reply:req-A`;
  listeners.get(replyEvent)?.forEach((l) =>
    l({ success: true, data: { id: "child-1" } })
  );

  const result = await promise;
  assert.deepEqual(result, { success: true, data: { id: "child-1" } });
});

test("harness: emitSpawn returns error on failed reply", async () => {
  const { api, listeners } = mockPi();
  const req = buildSpawnRequest(MODES.design, "draft", "req-B");

  const promise = emitSpawn(api, req, 1000);
  await new Promise((r) => setImmediate(r));

  const replyEvent = `subagents:rpc:spawn:reply:req-B`;
  listeners.get(replyEvent)?.forEach((l) =>
    l({ success: false, error: "no quota" })
  );

  const result = await promise;
  assert.equal(result.success, false);
  assert.equal(result.error, "no quota");
});

test("harness: emitSpawn times out when no reply arrives", async () => {
  const { api } = mockPi();
  const req = buildSpawnRequest(MODES.experiment, "trial", "req-C");

  const start = Date.now();
  const result = await emitSpawn(api, req, 50); // 50ms timeout
  const elapsed = Date.now() - start;

  assert.equal(result.success, false);
  assert.equal(result.error, "spawn timeout");
  assert.ok(elapsed >= 50 && elapsed < 500, `unexpected elapsed=${elapsed}ms`);
});

test("harness: emitSpawn ignores duplicate replies (settled guard)", async () => {
  const { api, listeners } = mockPi();
  const req = buildSpawnRequest(MODES.discuss, "x", "req-D");

  const promise = emitSpawn(api, req, 1000);
  await new Promise((r) => setImmediate(r));

  const replyEvent = `subagents:rpc:spawn:reply:req-D`;
  const reply1 = { success: true, data: { id: "first" } };
  const reply2 = { success: true, data: { id: "second" } };

  // Fire two replies; only the first should resolve.
  listeners.get(replyEvent)?.forEach((l) => l(reply1));
  listeners.get(replyEvent)?.forEach((l) => l(reply2));

  const result = await promise;
  assert.equal(result.data?.id, "first", "first reply wins");
});
