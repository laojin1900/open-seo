// 老金定制：i18n 自动翻译系统 — 扫描器
// 扫描 src/client + src/routes 下所有 .tsx 的英文 UI 文案（JSX 文本节点 + 白名单属性），
// 输出候选清单到 .laojin-i18n/candidates.json（translate.mjs 消费）。
import { Project, SyntaxKind } from "ts-morph";
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".laojin-i18n");
const OUT_FILE = path.join(OUT_DIR, "candidates.json");

const GLOBS = [
  "src/client/**/*.tsx",
  "src/routes/**/*.tsx",
  "src/client/**/*.ts",
  "src/routes/**/*.ts",
];
const EXCLUDE = [/\.test\.tsx?$/, /routeTree\.gen\.ts$/, /features\/laojin\/i18n\//];

// 属性白名单：这些属性的字符串值是用户可见文案，可以安全翻译。
// 注意排除 name/key/className/to/id 等功能性属性。
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

const STRING_MIN = 3;
const STRING_MAX = 150;

const FRAGMENT_STARTS = /^[\(,\.;:&)…—–%]/; // 碎片常以标点开头（JSX 表达式切割残留）
const FRAGMENT_ENDS = /[,(]$/;
const STOPWORDS = new Set(["and", "or", "the", "of", "to", "in", "for", "with", "by", "at", "on", "a", "an", "is", "are", "vs", "as", "it", "if", "be", "we", "you", "your", "per", "no", "not"]);

function isCandidate(s) {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (t.length < STRING_MIN || t.length > STRING_MAX) return false;
  if (!/[a-zA-Z]/.test(t)) return false; // 必须含英文字母
  if (/[\u4e00-\u9fff]/.test(t)) return false; // 已含中文的跳过
  if (/[{}<>`]/.test(t)) return false; // 含占位符/模板/标签字符的跳过（避免改写破坏）
  if (/^\d+$/.test(t)) return false;
  if (/^(true|false|null|undefined)$/i.test(t)) return false;
  if (FRAGMENT_STARTS.test(t)) return false; // 标点开头 = 被表达式切断的残片
  if (FRAGMENT_ENDS.test(t)) return false;
  if (!/[A-Z]/.test(t)) return false; // 全小写 = 很可能是内联句子残片（按钮/标题都至少有一个大写）
  if (STOPWORDS.has(t.toLowerCase())) return false;
  if (t.startsWith("/")) return false; // 路由路径
  if (/[\w]*\.(tsx?|js|json|css)$/.test(t)) return false; // 文件名
  if (/^[A-Z_]{4,}$/.test(t)) return false; // 纯大写常量/枚举（如 DATAFORSEO_API_KEY）
  if (t.includes("$")) return false; // 模板变量
  if (/^[a-z][a-z0-9]*[A-Z]/.test(t)) return false; // camelCase 标识符（表单字段名等）
  return true;
}

function main() {
  const project = new Project({ tsConfigFilePath: path.join(ROOT, "tsconfig.json"), skipAddingFilesFromTsConfig: false });
  const files = project.getSourceFiles().filter((f) => {
    const p = f.getFilePath();
    return GLOBS.some((g) => {
      const base = g.replace(/\*\*\/\*\.(tsx?)$/, "");
      return p.startsWith(path.join(ROOT, base)) && p.endsWith(g.endsWith(".tsx") ? ".tsx" : ".ts");
    }) && !EXCLUDE.some((re) => re.test(p));
  });

  const found = new Set();
  for (const file of files) {
    // JSX 文本节点
    for (const node of file.getDescendantsOfKind(SyntaxKind.JsxText)) {
      const tsNode = node.compilerNode;
      if (ts.isJsxText(tsNode)) {
        const text = tsNode.getText().replace(/\{\/\*[\s\S]*?\*\/\}/g, ""); // 去掉 JSX 注释
        if (isCandidate(text)) found.add(text.trim());
      }
    }
    // JSX 表达式容器内的字符串字面量（条件渲染按钮文案等）
    for (const node of file.getDescendantsOfKind(SyntaxKind.JsxExpression)) {
      const tsNode = node.compilerNode;
      if (!ts.isJsxExpression(tsNode)) continue;
      const collect = (n, parent) => {
        if (ts.isStringLiteral(n)) {
          const insideT = parent && ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parent.expression.text === "t";
          if (!insideT && isCandidate(n.text)) found.add(n.text.trim());
          return;
        }
        // 不进入嵌套 JSX（元素/属性/子表达式单独提取）
        if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxAttribute(n) || ts.isJsxExpression(n)) return;
        n.forEachChild((c) => collect(c, n));
      };
      tsNode.expression && collect(tsNode.expression, undefined);
    }
    // JSX 属性字符串字面量（白名单）
    for (const node of file.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
      const tsNode = node.compilerNode;
      if (!ts.isJsxAttribute(tsNode)) continue;
      const name = tsNode.name.getText();
      if (!ATTR_WHITELIST.has(name)) continue;
      const init = tsNode.initializer;
      if (init && ts.isStringLiteral(init) && isCandidate(init.text)) found.add(init.text.trim());
    }
  }

  const sorted = [...found].sort();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ strings: sorted }, null, 2) + "\n", "utf8");
  console.log(`[i18n-scan] 提取 ${sorted.length} 条候选文案 → ${OUT_FILE}`);
  // 打印前 20 条供人工抽查
  for (const s of sorted.slice(0, 20)) console.log("  ·", s);
}

main();
