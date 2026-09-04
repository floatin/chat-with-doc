import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CLI = join(REPO_ROOT, "bin", "cwd.js");

/** Spawn CLI, capture stdout/stderr/exitCode. */
function runCli(args: string[], opts: { cwd?: string } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn("node", [CLI, ...args], {
      cwd: opts.cwd ?? REPO_ROOT,
      env: { ...process.env, NO_COLOR: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", rejectP);
    child.on("exit", (code) => resolveP({ stdout, stderr, exitCode: code ?? 0 }));
  });
}

async function tmpWorkspace(): Promise<string> {
  return await fs.mkdtemp(join(tmpdir(), "cwd-cli-"));
}

// ---------- cwd new ----------
test("cli: cwd new creates decision markdown with frontmatter", async () => {
  const ws = await tmpWorkspace();
  const relTarget = "docs/decision.md";

  const r = await runCli(
    [
      "new", "decision",
      "--title", "Adopt worktree isolation",
      "--path", relTarget,
      "--applies-to", "feature-a,feature-b",
    ],
    { cwd: ws }
  );

  assert.equal(r.exitCode, 0, `stderr=${r.stderr}`);
  assert.ok(r.stdout.includes("已创建"), `stdout=${r.stdout}`);

  const content = await fs.readFile(join(ws, relTarget), "utf8");
  assert.ok(content.includes("doc_type: decision"));
  assert.ok(content.includes("title: Adopt worktree isolation"));
  assert.ok(content.includes('applies_to: ["feature-a", "feature-b"]'));
  assert.ok(content.includes("references"));
});

test("cli: cwd new rejects missing required args", async () => {
  const r = await runCli(["new", "decision"]);
  assert.equal(r.exitCode, 1, "should exit non-zero on missing args");
  assert.match(r.stderr, /用法: cwd new/);
});

// ---------- cwd validate ----------
test("cli: cwd validate exits 0 on real docs/", async () => {
  const r = await runCli(["validate", REPO_ROOT]);
  assert.equal(r.exitCode, 0, `stderr=${r.stderr}`);
  assert.match(r.stdout, /扫描 \d+ 个文件.*0 个问题/);
});

test("cli: cwd validate detects frontmatter error", async () => {
  const ws = await tmpWorkspace();
  // validateDocs expects <root>/docs/ to exist; create the subdir + bad file inside.
  await fs.mkdir(join(ws, "docs"), { recursive: true });
  await fs.writeFile(join(ws, "docs", "bad.md"), "# no frontmatter\n\nbody\n");
  const r = await runCli(["validate", ws]);
  assert.ok(/bad\.md/.test(r.stdout) && /缺少 frontmatter/.test(r.stdout), `stdout=${r.stdout}`);
  assert.equal(r.exitCode, 1, "should exit non-zero when errors found");
});

// ---------- cwd scan ----------
test("cli: cwd scan classifies markdown by sync marker", async () => {
  const ws = await tmpWorkspace();
  // memory / core-file / branch / discard
  await fs.writeFile(
    join(ws, "a.md"),
    "---\nsync: true\ntarget: memory\n---\nmem body\n"
  );
  await fs.writeFile(
    join(ws, "b.md"),
    "---\nsync: true\ntarget: core-file\n---\ncore body\n"
  );
  await fs.writeFile(
    join(ws, "c.md"),
    "---\nsync: false\n---\ndiscard\n"
  );

  const r = await runCli(["scan", ws]);
  assert.equal(r.exitCode, 0, `stderr=${r.stderr}`);
  assert.ok(r.stdout.includes("Memory (写入 docs/memory/)"), `stdout=${r.stdout}`);
  assert.ok(/Memory[^]*\(1\)/.test(r.stdout), `stdout=${r.stdout}`);
  assert.ok(r.stdout.includes("Core Files (作为核心产物 merge)"), `stdout=${r.stdout}`);
  assert.ok(/Core Files[^]*\(1\)/.test(r.stdout), `stdout=${r.stdout}`);
  assert.ok(r.stdout.includes("Discard (随 worktree 回收"), `stdout=${r.stdout}`);
  assert.ok(/Discard[^]*\(1\)/.test(r.stdout), `stdout=${r.stdout}`);
});

// ---------- cwd help ----------
test("cli: cwd help prints usage", async () => {
  const r = await runCli(["help"]);
  assert.equal(r.exitCode, 0);
  assert.match(r.stdout, /chat-with-doc \(cwd\) CLI/);
  assert.match(r.stdout, /cwd new/);
  assert.match(r.stdout, /cwd validate/);
  assert.match(r.stdout, /cwd scan/);
});

test("cli: unknown subcommand shows help", async () => {
  const r = await runCli(["nonexistent"]);
  // Current implementation falls through to help — accept exit 0 with help shown
  assert.match(r.stdout, /chat-with-doc \(cwd\) CLI/);
});
