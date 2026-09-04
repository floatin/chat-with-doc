import { promises as fs } from "node:fs";
import { join } from "node:path";
const REQUIRED_FIELDS = {
    decision: ["doc_type", "title", "status"],
    design: ["doc_type", "title", "status", "goals"],
    experiment: ["doc_type", "title", "hypothesis"],
    pattern: ["doc_type", "title", "problem", "solution"],
    feature: ["doc_type", "title", "requirements"],
    memory: ["doc_type", "title"],
};
/** 校验单个文档的 frontmatter + 必填字段 */
export function validateDoc(content, file) {
    const issues = [];
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*(\n|$)/);
    if (!fmMatch) {
        return [{ file, severity: "error", message: "缺少 frontmatter (--- ... ---)" }];
    }
    const fm = fmMatch[1];
    const get = (k) => fm.match(new RegExp(`^\\s*${k}\\s*:(.*)$`, "m"))?.[1]?.trim();
    const docType = (get("doc_type") || "").replace(/^["']|["']$/g, "");
    if (!docType) {
        issues.push({ file, severity: "error", message: "frontmatter 缺少 doc_type" });
        return issues;
    }
    const required = REQUIRED_FIELDS[docType];
    if (required) {
        for (const field of required) {
            if (!get(field)) {
                issues.push({
                    file,
                    severity: "error",
                    message: `[${docType}] 缺少必填字段: ${field}`,
                });
            }
        }
    }
    // summary 长度建议
    const summary = get("summary") || "";
    if (summary.length > 200) {
        issues.push({
            file,
            severity: "warning",
            message: "summary 超过 200 字符, 建议精简 (Tier-1 发现层)",
        });
    }
    return issues;
}
/** 递归校验 docs/ 目录下所有 .md */
export async function validateDocs(root) {
    const result = { files: 0, issues: [] };
    const docsDir = join(root, "docs");
    async function walk(dir) {
        let list = [];
        try {
            list = await fs.readdir(dir);
        }
        catch {
            return result;
        }
        for (const name of list) {
            const abs = join(dir, name);
            const stat = await fs.stat(abs).catch(() => null);
            if (!stat)
                continue;
            if (stat.isDirectory()) {
                if (name === "node_modules" || name === "templates")
                    continue;
                await walk(abs);
            }
            else if (name.endsWith(".md")) {
                // 模板占位文件 (EXAMPLE-*) 含未填充的 <占位符>, 不参与校验
                if (name.startsWith("EXAMPLE-"))
                    continue;
                result.files++;
                const content = await fs.readFile(abs, "utf8").catch(() => "");
                result.issues.push(...validateDoc(content, abs));
            }
        }
        return result;
    }
    await walk(docsDir);
    return result;
}
