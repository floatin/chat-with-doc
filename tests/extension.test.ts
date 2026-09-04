import { test } from "node:test";
import assert from "node:assert/strict";
import extensionFactory from "../src/extension.js";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Build a mock Pi ExtensionAPI that records every registration and replays
 * pi.events as a pub/sub bus. Lets us exercise extension.ts end-to-end
 * without a real Pi runtime.
 */
function mockPi() {
  const commands = new Map<string, { description?: string; handler: Function }>();
  const tools = new Map<string, any>();
  const events = new Map<string, Set<Function>>();
  const emitted: Array<{ event: string; payload: any }> = [];
  const writes: Array<{ path: string; content: string }> = [];

  const api: ExtensionAPI = {
    registerCommand(name, def) {
      commands.set(name, def);
    },
    registerTool(def) {
      tools.set(def.name, def);
    },
    events: {
      on(event, listener) {
        if (!events.has(event)) events.set(event, new Set());
        events.get(event)!.add(listener);
        return () => events.get(event)!.delete(listener);
      },
      emit(event, payload) {
        emitted.push({ event, payload });
        events.get(event)?.forEach((l) => l(payload));
      },
    },
    ui: {
      notify(message, level) {
        // Collect for assertions
        notifications.push({ message, level });
      },
    },
    workspace: {
      async writeFile(path, content) {
        writes.push({ path, content });
        return true;
      },
    },
  };
  const notifications: Array<{ message: string; level?: string }> = [];

  return {
    api,
    commands,
    tools,
    events,
    emitted,
    writes,
    notifications,
  };
}

// ---------- registration ----------
test("extension: registers /doc command + doc_new + doc_sync tools on load", () => {
  const m = mockPi();
  extensionFactory(m.api);

  assert.ok(m.commands.has("doc"), "/doc command not registered");
  assert.ok(m.tools.has("doc_new"), "doc_new tool not registered");
  assert.ok(m.tools.has("doc_sync"), "doc_sync tool not registered");
});

// ---------- /doc command handler ----------
test("doc command: rejects args without mode+task", async () => {
  const m = mockPi();
  extensionFactory(m.api);
  const handler = m.commands.get("doc")!.handler;
  const ctx = { ui: m.api.ui, workspace: m.api.workspace };

  await handler("", ctx);
  assert.match(m.notifications[0].message, /用法:/);
  assert.equal(m.notifications[0].level, "error");

  await handler("only-mode", ctx);
  assert.match(m.notifications[1].message, /用法:/);
});

test("doc command: rejects unknown mode", async () => {
  const m = mockPi();
  extensionFactory(m.api);
  const handler = m.commands.get("doc")!.handler;
  const ctx = { ui: m.api.ui, workspace: m.api.workspace };

  await handler("bogus-mode do something", ctx);
  assert.match(m.notifications[0].message, /未知模式/);
});

test("doc command: produces subagents:rpc:spawn event with correct shape", async () => {
  const m = mockPi();
  extensionFactory(m.api);
  const handler = m.commands.get("doc")!.handler;
  const ctx = { ui: m.api.ui, workspace: m.api.workspace };

  // Don't await the handler directly; emitSpawn waits for reply. We drive
  // the reply manually via the mock events bus so the promise resolves.
  const handlerPromise = handler("design draft extension docs", ctx);

  const spawnEvents = m.emitted.filter((e) => e.event === "subagents:rpc:spawn");
  assert.equal(spawnEvents.length, 1);
  const req = spawnEvents[0].payload;
  assert.equal(req.type, "general-purpose");
  assert.ok(req.prompt.includes("进入 design 模式"));
  assert.ok(req.prompt.includes("任务: draft extension docs"));
  assert.equal(req.options.isolation, "worktree");
  assert.deepEqual(req.options.skills, ["mode-design", "doc-sync"]);
  assert.equal(req.options.lease_holder, undefined);

  // Drive the reply through the public emit() so unsub() inside the listener
  // gets a stable Set iteration (avoids Set.delete-during-forEach pitfalls).
  m.api.events.emit(`subagents:rpc:spawn:reply:${req.requestId}`, {
    success: true,
    data: { id: "fake-id" },
  });
  await handlerPromise;

  assert.ok(
    m.notifications.some((n) => n.message.includes("已进入 design 模式")),
    `notifications=${JSON.stringify(m.notifications)}`
  );
});

test("doc command: produce mode emits lease_holder in spawn options", async () => {
  const m = mockPi();
  extensionFactory(m.api);
  const handler = m.commands.get("doc")!.handler;
  const ctx = { ui: m.api.ui, workspace: m.api.workspace };

  const handlerPromise = handler("produce implement feature", ctx);
  const req = m.emitted.find((e) => e.event === "subagents:rpc:spawn")!.payload;
  assert.ok(/^cwd-produce-\d+$/.test(req.options.lease_holder!), `got ${req.options.lease_holder}`);
  m.api.events.emit(`subagents:rpc:spawn:reply:${req.requestId}`, {
    success: true,
    data: { id: "x" },
  });
  await handlerPromise;
});

test("doc command: surfaces spawn failure as error notify", async () => {
  const m = mockPi();
  extensionFactory(m.api);
  const handler = m.commands.get("doc")!.handler;
  const ctx = { ui: m.api.ui, workspace: m.api.workspace };

  const handlerPromise = handler("discuss explore", ctx);
  const req = m.emitted.find((e) => e.event === "subagents:rpc:spawn")!.payload;
  m.api.events.emit(`subagents:rpc:spawn:reply:${req.requestId}`, {
    success: false,
    error: "boom",
  });
  await handlerPromise;

  assert.ok(
    m.notifications.some((n) => n.message.includes("进入模式失败") && n.message.includes("boom")),
    `notifications=${JSON.stringify(m.notifications)}`
  );
});

// ---------- doc_new tool ----------
test("doc_new tool: writes rendered template via workspace.writeFile", async () => {
  const m = mockPi();
  extensionFactory(m.api);
  const tool = m.tools.get("doc_new");
  const ctx = { ui: m.api.ui, workspace: m.api.workspace };

  const result = await tool.execute(
    "call-1",
    { doc_type: "experiment", title: "Test hypothesis", path: "docs/experiments/0002-test.md", applies_to: ["x"] },
    new AbortController().signal,
    () => {},
    ctx
  );

  assert.equal(result.content[0].type, "text");
  assert.match(result.content[0].text, /已创建 .*0002-test\.md/);
  assert.equal(m.writes.length, 1);
  assert.match(m.writes[0].content, /doc_type: experiment/);
  assert.match(m.writes[0].content, /title: Test hypothesis/);
  assert.match(m.writes[0].content, /applies_to: \["x"\]/);
});

// ---------- doc_sync tool ----------
test("doc_sync tool: scans worktree dir and renders sync plan", async () => {
  const dir = await fs.mkdtemp(join(tmpdir(), "cwd-sync-"));
  await fs.writeFile(
    join(dir, "keep.md"),
    "---\nsync: true\ntarget: branch\n---\nkeep\n"
  );
  await fs.writeFile(join(dir, "drop.md"), "no marker\n");

  const m = mockPi();
  extensionFactory(m.api);
  const tool = m.tools.get("doc_sync");
  const ctx = { ui: m.api.ui, workspace: m.api.workspace };

  const result = await tool.execute(
    "call-2",
    { worktree: dir },
    new AbortController().signal,
    () => {},
    ctx
  );

  const text = result.content[0].text;
  assert.match(text, /Branch.*1.*keep\.md/s);
  assert.match(text, /Discard.*1.*drop\.md/s);
});
