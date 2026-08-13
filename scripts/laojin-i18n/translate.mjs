// 老金定制：i18n 自动翻译系统 — 翻译器
// 读 .laojin-i18n/candidates.json，用 DeepSeek（LLM_API_KEY/LLM_BASE_URL/LLM_MODEL）批量翻译
// 手写 dict 中已有的条目，生成/更新 src/client/features/laojin/i18n/dict.generated.ts
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAND_FILE = path.join(ROOT, ".laojin-i18n", "candidates.json");
const OUT_FILE = path.join(ROOT, "src/client/features/laojin/i18n/dict.generated.ts");
const BATCH = 15;

function loadEnv() {
  const envFile = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envFile)) return;
  for (const raw of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const k = line.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = line.slice(eq + 1).trim();
  }
}
loadEnv();

const API_KEY = process.env.LLM_API_KEY;
const BASE = (process.env.LLM_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const MODEL = process.env.LLM_MODEL || "deepseek-chat";

const SYSTEM = `You translate English UI copy to Simplified Chinese for an SEO/SaaS dashboard.
Rules:
- Keep technical terms untranslated: GSC, MCP, API, SERP, FAQ, llms.txt, SDK, JSON, URL, CTR, AI, SEO, Google, ChatGPT, Perplexity, OpenAI, DataForSEO, Ahrefs, Semrush, keyword, backlink, domain, rank, trial, snapshot, workflow, schema, dashboard names.
- Short buttons: use concise verb-object Chinese (e.g. "Save" -> 保存, "Add keyword" -> 添加关键词).
- Preserve numbers, punctuation style, and any placeholders.
- Do NOT translate email addresses or domain names.
- Output ONLY a JSON object of shape {"items":[{"en":"...","zh":"..."}]}.`;

async function translateBatch(strings) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(120000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 8000,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify({ strings }) },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const content = (data.choices?.[0]?.message?.content ?? "").trim();
  if (!content) throw new Error("LLM 返回空内容");
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // 容错：截取第一个 { 到最后一个 } 再试
    const a = content.indexOf("{");
    const b = content.lastIndexOf("}");
    if (a >= 0 && b > a) parsed = JSON.parse(content.slice(a, b + 1));
    else throw new Error(`LLM 输出非 JSON: ${content.slice(0, 150)}`);
  }
  const items = parsed.items ?? parsed;
  if (!Array.isArray(items)) throw new Error(`unexpected LLM output: ${content.slice(0, 200)}`);
  return items;
}

async function main() {
  if (!API_KEY) {
    console.error("[i18n-translate] 缺 LLM_API_KEY（.env.local 或环境变量），跳过翻译");
    process.exit(2);
  }
  const candidates = JSON.parse(fs.readFileSync(CAND_FILE, "utf8")).strings;
  // 现有 generated 字典（增量：不重翻已有）
  const existing = fs.existsSync(OUT_FILE)
    ? extractGeneratedDict(fs.readFileSync(OUT_FILE, "utf8"))
    : {};
  const todo = candidates.filter((s) => !existing[s]);
  if (!todo.length) {
    console.log(`[i18n-translate] 无新增文案（共 ${candidates.length} 条已覆盖），跳过`);
    return;
  }
  console.log(`[i18n-translate] 待翻译 ${todo.length} 条（已有 ${Object.keys(existing).length} 条）`);

  const writeOut = () => {
    const all = Object.values(existing);
    const out = [
      "// 自动生成（scripts/laojin-i18n/translate.mjs），勿手改。",
      "// key = 英文原文；手写修正请改 i18n/index.ts 的 dict（优先级更高）。",
      "export const generatedDict: Record<string, { en: string; zh: string }> = {",
      ...all.map((r) => `  ${JSON.stringify(r.en)}: { en: ${JSON.stringify(r.en)}, zh: ${JSON.stringify(r.zh)} },`),
      "};",
      "",
    ].join("\n");
    fs.writeFileSync(OUT_FILE, out, "utf8");
  };

  const CONCURRENCY = 3;
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  let cursor = 0;
  let doneBatches = 0;

  async function worker(id) {
    while (true) {
      const idx = cursor++;
      if (idx >= batches.length) return;
      const batch = batches[idx];
      let ok = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const items = await translateBatch(batch);
          for (const r of items) {
            if (r.en && r.zh && typeof r.zh === "string") existing[r.en] = { en: r.en, zh: r.zh };
          }
          writeOut(); // 断点续跑：每批成功立即落盘
          doneBatches++;
          console.log(`[i18n-translate] worker${id} 批次 ${idx + 1}/${batches.length} 完成（累计 ${Object.keys(existing).length} 条）`);
          ok = true;
          break;
        } catch (e) {
          console.warn(`  worker${id} 批次 ${idx + 1} 失败（重试 ${attempt + 1}/3）:`, String(e).slice(0, 120));
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
      if (!ok) console.warn(`  worker${id} 批次 ${idx + 1} 最终失败，跳过`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
  console.log(`[i18n-translate] 完成：共 ${Object.keys(existing).length} 条 → ${OUT_FILE}`);
}

function extractGeneratedDict(content) {
  // 解析现有 generated 文件的完整条目（en+zh 对）
  const re = /^\s*("(?:[^"\\]|\\.)*")\s*:\s*\{\s*en:\s*("(?:[^"\\]|\\.)*")\s*,\s*zh:\s*("(?:[^"\\]|\\.)*")\s*\}/gm;
  const out = {};
  let m;
  while ((m = re.exec(content)) !== null) {
    const en = JSON.parse(m[2]);
    out[en] = { en, zh: JSON.parse(m[3]) };
  }
  return out;
}

main().catch((e) => {
  console.error("[i18n-translate] failed:", e);
  process.exit(1);
});
