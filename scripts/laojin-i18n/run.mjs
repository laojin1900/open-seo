// 老金定制：i18n 自动翻译系统 — 编排器
// 流程：scan（提取候选）→ translate（LLM 翻译）→ rewrite（AST 改写）→ 可选 build 验证
// 用法：node scripts/laojin-i18n/run.mjs [--skip-rewrite] [--verify]
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const skipRewrite = args.includes("--skip-rewrite");
const verify = args.includes("--verify");

function run(label, script) {
  console.log(`\n━━━ ${label} ━━━`);
  execSync(`node ${path.join(ROOT, "scripts/laojin-i18n", script)}`, {
    stdio: "inherit",
    cwd: ROOT,
  });
}

function main() {
  run("1/4 扫描候选文案", "scan.mjs");
  run("2/4 LLM 翻译", "translate.mjs");
  if (!skipRewrite) {
    run("3/4 AST 改写源码", "rewrite.mjs");
  }
  if (verify) {
    console.log("\n━━━ 4/4 build 验证 ━━━");
    try {
      execSync("pnpm run build", { stdio: "inherit", cwd: ROOT });
      console.log("[i18n-run] build 通过 ✅");
    } catch (e) {
      console.error("[i18n-run] build 失败，回滚本次改写（git restore src/）");
      execSync("git restore src/", { stdio: "inherit", cwd: ROOT });
      process.exit(1);
    }
  }
}

main();
