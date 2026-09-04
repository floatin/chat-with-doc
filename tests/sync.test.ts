import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMarker, classifyArtifacts, renderSyncPlan } from "../src/sync.js";
import { validateDoc, validateDocs } from "../src/validate.js";
import { getMode, listModes, MODES } from "../src/modes.js";

// ---------- parseMarker ----------
test("parseMarker: 无 frontmatter → discard", () => {
  const m = parseMarker("just some content");
  assert.equal(m.sync, false);
  assert.equal(m.target, "discard");
});

test("parseMarker: sync:true target:memory → memory", () => {
  const m = parseMarker("---\nsync: true\ntarget: memory\n---\nbody");
  assert.equal(m.sync, true);
  assert.equal(m.target, "memory");
});

test("parseMarker: sync:false → discard", () => {
  const m = parseMarker("---\nsync: false\ntarget: core-file\n---\n");
  assert.equal(m.sync, false);
  assert.equal(m.target, "discard");
});

test("parseMarker: 容忍冒号后空格与引号", () => {
  const m = parseMarker('---\ndoc_type: "decision"\ntitle: hi\n---\n');
  assert.equal(m.sync, false);
});

// ---------- classifyArtifacts ----------
test("classifyArtifacts: 按 target 正确分组", () => {
  const plan = classifyArtifacts([
    { path: "a.md", content: "---\nsync: true\ntarget: memory\n---\n" },
    { path: "b.md", content: "---\nsync: true\ntarget: core-file\n---\n" },
    { path: "c.md", content: "---\nsync: true\ntarget: branch\n---\n" },
    { path: "d.md", content: "no marker" },
  ]);
  assert.equal(plan.memory.length, 1);
  assert.equal(plan.coreFiles.length, 1);
  assert.equal(plan.branch.length, 1);
  assert.equal(plan.discard.length, 1);
  assert.equal(plan.discard[0].path, "d.md");
});

test("renderSyncPlan: 包含所有分组标题", () => {
  const plan = classifyArtifacts([
    { path: "x.md", content: "---\nsync: true\ntarget: memory\n---\n" },
    { path: "y.md", content: "no marker" },
  ]);
  const out = renderSyncPlan(plan);
  assert.match(out, /Memory.*\(1\)/);
  assert.match(out, /Discard.*\(1\)/);
  assert.match(out, /Sync Plan/);
});

// ---------- modes ----------
test("getMode: 五个模式都存在", () => {
  for (const m of listModes()) {
    assert.ok(MODES[m], `missing mode ${m}`);
    assert.equal(MODES[m].name, m);
  }
  assert.equal(listModes().length, 5);
});

test("getMode: 未知模式返回 undefined", () => {
  assert.equal(getMode("nope"), undefined);
});

test("MODES: produce/maintain 为长租约, 其余短租约", () => {
  assert.equal(MODES.produce.lease, true);
  assert.equal(MODES.maintain.lease, true);
  assert.equal(MODES.discuss.lease, false);
  assert.equal(MODES.design.lease, false);
  assert.equal(MODES.experiment.lease, false);
});

// ---------- validate ----------
test("validateDoc: 缺少 frontmatter → error", () => {
  const issues = validateDoc("no fm", "x.md");
  assert.equal(issues[0].severity, "error");
  assert.match(issues[0].message, /frontmatter/);
});

test("validateDoc: decision 缺 status → error", () => {
  const issues = validateDoc(
    "---\ndoc_type: decision\ntitle: hi\n---\n",
    "d.md"
  );
  assert.ok(issues.some((i) => i.severity === "error" && /status/.test(i.message)));
});

test("validateDoc: summary 过长 → warning", () => {
  const long = "s".repeat(201);
  const issues = validateDoc(
    `---\ndoc_type: decision\ntitle: hi\nstatus: draft\nsummary: ${long}\n---\n`,
    "d.md"
  );
  assert.ok(issues.some((i) => i.severity === "warning" && /summary/.test(i.message)));
});

test("validateDocs: 扫描示例文档并报告问题数", async () => {
  const result = await validateDocs(process.cwd());
  // 示例文档未必全合规, 只断言结构正确
  assert.equal(typeof result.files, "number");
  assert.ok(Array.isArray(result.issues));
});
