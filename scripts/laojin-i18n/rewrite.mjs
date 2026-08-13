// 老金定制：i18n 自动翻译系统 — 改写器
// 用 ts-morph AST 把候选英文文案改写为 {t("原文")} 并自动注入 import。
// 幂等：已改写（表达式容器）的节点不会再匹配 JSXText。
// 安全：改写后必须通过 pnpm run build 验证（run.mjs 编排；失败 git restore 回滚）。
import { Project, SyntaxKind } from "ts-morph";
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAND_FILE = path.join(ROOT, ".laojin-i18n", "candidates.json");
const IMPORT_LINE = 'import { t } from "@/client/features/laojin/i18n";';

const GLOBS = [
  "src/client/**/*.tsx",
  "src/routes/**/*.tsx",
];
const EXCLUDE = [/\.test\.tsx?$/, /routeTree\.gen\.ts$/, /features\/laojin\/i18n\//];
const ATTR_WHITELIST = new Set([
  "label",
  "placeholder",
  "title",
  "aria-label",
  "data-tip",
  "description",
  "subtitle",
  "tooltip",
]);

function main() {
  const candidates = new Set(JSON.parse(fs.readFileSync(CAND_FILE, "utf8")).strings);
  const project = new Project({ tsConfigFilePath: path.join(ROOT, "tsconfig.json") });

  const targets = project.getSourceFiles().filter((f) => {
    const p = f.getFilePath();
    return (
      GLOBS.some((g) => p.startsWith(path.join(ROOT, g.replace("**/*.tsx", "")))) &&
      p.endsWith(".tsx") &&
      !EXCLUDE.some((re) => re.test(p))
    );
  });

  // 收集编辑：{ file, start, end, newText }。使用原始 span + 文本校验，
  // 避免 ts-morph replaceWithText 对多行属性的 span 破坏。
  const editsByFile = new Map();

  for (const file of targets) {
    const edits = [];
    const walk = (node) => {
      if (node.getKind() === SyntaxKind.JsxText) {
        const tsNode = node.compilerNode;
        if (ts.isJsxText(tsNode)) {
          const text = tsNode.getText().replace(/\{\/\*[\s\S]*?\*\/\}/g, "").trim();
          if (candidates.has(text)) {
            edits.push({
              start: node.getStart(),
              end: node.getEnd(),
              newText: `{t(${JSON.stringify(text)})}`,
              original: node.getText(),
            });
          }
        }
        return;
      }
      if (node.getKind() === SyntaxKind.JsxAttribute) {
        const tsNode = node.compilerNode;
        if (ts.isJsxAttribute(tsNode)) {
          const name = tsNode.name.getText();
          if (!ATTR_WHITELIST.has(name)) return;
          const init = tsNode.initializer;
          if (init && ts.isStringLiteral(init)) {
            const text = init.text.trim();
            if (candidates.has(text)) {
              // 只替换 initializer（字符串字面量，含引号）的 span，保留属性名与 =
              const initNode = node.getChildren().find((c) => c.getKind() === SyntaxKind.StringLiteral);
              edits.push({
                start: initNode.getStart(),
                end: initNode.getEnd(),
                newText: `{t(${JSON.stringify(text)})}`,
                original: initNode.getText(),
              });
            }
          }
        }
        return;
      }
      node.forEachChild(walk);
    };
    walk(file);
    if (edits.length) editsByFile.set(file.getFilePath(), edits);
  }

  let totalRewrites = 0;
  const changedFiles = [];
  for (const [fp, edits] of editsByFile) {
    // 从后往前应用，避免位置漂移；每个 edit 校验原文再替换
    edits.sort((a, b) => b.start - a.start);
    let content = fs.readFileSync(fp, "utf8");
    let applied = 0;
    for (const e of edits) {
      const actual = content.slice(e.start, e.end);
      if (actual !== e.original) {
        console.warn(`  ⚠ 跳过（原文不匹配）: ${path.relative(ROOT, fp)} @${e.start}: ${JSON.stringify(e.original.slice(0, 40))}`);
        continue;
      }
      content = content.slice(0, e.start) + e.newText + content.slice(e.end);
      applied++;
    }
    if (applied > 0) {
      fs.writeFileSync(fp, content, "utf8");
      changedFiles.push(fp);
      totalRewrites += applied;
    }
  }

  // 注入 import（字符串层）
  for (const fp of changedFiles) {
    let content = fs.readFileSync(fp, "utf8");
    if (!content.includes('from "@/client/features/laojin/i18n"')) {
      const lines = content.split("\n");
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*import\s.+from\s+["']/.test(lines[i])) lastImportIdx = i;
      }
      if (lastImportIdx >= 0) {
        lines.splice(lastImportIdx + 1, 0, IMPORT_LINE);
        content = lines.join("\n");
      } else {
        content = IMPORT_LINE + "\n" + content;
      }
      fs.writeFileSync(fp, content, "utf8");
    }
  }

  console.log(`[i18n-rewrite] 改写 ${changedFiles.length} 个文件、${totalRewrites} 处文案`);
  for (const fp of changedFiles.slice(0, 15)) console.log("  ·", path.relative(ROOT, fp));
  if (changedFiles.length > 15) console.log(`  … 共 ${changedFiles.length} 个文件`);
}

main();
