// 老金定制：轻量 i18n 基础设施（GEO-ROADMAP 之外的老金需求：后台中文化）
// 设计：无 Provider 的全局订阅（仿 src/client/lib/theme.ts），localStorage 持久化。
// t(key) 未命中字典时返回 key 本身 —— 未翻译的文案显示英文原文，支持渐进式翻译。

import * as React from "react";
import { generatedDict } from "./dict.generated";

export type UiLanguage = "en" | "zh";

const STORAGE_KEY = "ui-language";
const CHANGE_EVENT = "ui-language-change";

const dict: Record<string, { en: string; zh: string }> = {
  // 导航菜单
  "nav.dashboard": { en: "Dashboard", zh: "仪表盘" },
  "nav.keywords": { en: "Keyword Research", zh: "关键词研究" },
  "nav.domain": { en: "Domain Overview", zh: "域名概览" },
  "nav.backlinks": { en: "Backlinks", zh: "外链分析" },
  "nav.brandLookup": { en: "Brand Lookup", zh: "品牌查询" },
  "nav.promptExplorer": { en: "Prompt Explorer", zh: "提示词探索" },
  "nav.gsc": { en: "GSC Insights", zh: "GSC 洞察" },
  "nav.aiVisibility": { en: "AI Visibility", zh: "AI 可见度" },
  "nav.rankTracking": { en: "Rank Tracking", zh: "排名追踪" },
  "nav.saved": { en: "Saved Keywords", zh: "收藏关键词" },
  "nav.audit": { en: "Site Audit", zh: "站点审计" },
  "nav.aiMcp": { en: "AI & MCP", zh: "AI 与 MCP" },
  "nav.help": { en: "Help & Community", zh: "帮助与社区" },
  "nav.settings": { en: "Settings", zh: "设置" },
  "nav.browse": { en: "Browse", zh: "浏览" },
  "nav.chat": { en: "Chat", zh: "对话" },
  "group.overview": { en: "Overview", zh: "概览" },
  "group.research": { en: "Research", zh: "研究" },
  "group.mySite": { en: "My Site", zh: "我的站点" },
  "group.connect": { en: "Connect", zh: "连接" },
  // 偏好菜单
  "pref.theme": { en: "Theme", zh: "主题" },
  "pref.language": { en: "Language", zh: "语言" },
  // AI Visibility 模块
  "aiVis.subtitle": {
    en: "Measure how AI engines answer, mention, and cite your brand — fixed query set, weekly sampling.",
    zh: "测量 AI 引擎如何回答、提及、引用你的品牌——固定问题集、每周采样。",
  },
  "aiVis.newSet": { en: "New query set", zh: "新建问题集" },
  "aiVis.recordTrial": { en: "Record trial", zh: "录入采样" },
  "aiVis.querySet": { en: "Query set:", zh: "问题集：" },
  "aiVis.queries": { en: "queries", zh: "个问题" },
  "aiVis.answerRate": { en: "Answer rate", zh: "回答率" },
  "aiVis.mentionRate": { en: "Brand mention rate", zh: "品牌提及率" },
  "aiVis.citeRate": { en: "Brand cite rate", zh: "品牌引用率" },
  "aiVis.conditional": { en: "Conditional mention", zh: "条件提及率" },
  "aiVis.mentionSub": { en: "mentions / eligible", zh: "提及 / 合格" },
  "aiVis.citeSub": { en: "URL cited / eligible", zh: "引用 URL / 合格" },
  "aiVis.conditionalSub": { en: "mentions / answered", zh: "提及 / 有回答" },
  "aiVis.excludedNote": {
    en: "excluded trial(s) kept out of denominators (see details).",
    zh: "条被排除的采样不计入分母（详见明细）。",
  },
  "aiVis.weekOf": { en: "Week of", zh: "周起始" },
  "aiVis.answer": { en: "Answer", zh: "回答" },
  "aiVis.mention": { en: "Mention", zh: "提及" },
  "aiVis.cite": { en: "Cite", zh: "引用" },
  "aiVis.collected": { en: "Collected", zh: "采样时间" },
  "aiVis.query": { en: "Query", zh: "问题" },
  "aiVis.engine": { en: "Engine", zh: "引擎" },
  "aiVis.notes": { en: "Notes", zh: "备注" },
  "aiVis.noSets": {
    en: "No query sets yet. Create one with your fixed question list to start measuring.",
    zh: "还没有问题集。用固定问题清单创建一个，开始测量。",
  },
  "aiVis.noTrials": {
    en: "No trials recorded yet. Click “Record trial” after your first sampling session.",
    zh: "还没有采样记录。完成第一次采样后点击「录入采样」。",
  },
  "aiVis.recordTitle": { en: "Record trial", zh: "录入采样" },
  "aiVis.createTitle": { en: "New query set", zh: "新建问题集" },
  "aiVis.eligible": { en: "Eligible", zh: "合格" },
  "aiVis.answered": { en: "Answered", zh: "有回答" },
  "aiVis.brandMentioned": { en: "Brand mentioned", zh: "提到品牌" },
  "aiVis.brandCited": { en: "Brand URL cited", zh: "引用品牌 URL" },
  "aiVis.yes": { en: "Yes", zh: "是" },
  "aiVis.no": { en: "No", zh: "否" },
  "aiVis.modelPlaceholder": { en: "Model (optional)", zh: "模型（可选）" },
  "aiVis.exclusionPlaceholder": {
    en: "Exclusion reason (engine error, retry failed…)",
    zh: "排除原因（引擎报错、重试失败…）",
  },
  "aiVis.notesPlaceholder": {
    en: "Notes (what the answer said, URLs cited…)",
    zh: "备注（回答内容、被引用的 URL…）",
  },
  "aiVis.setNamePlaceholder": {
    en: "Set name (e.g. Laojinchuhai EN baseline)",
    zh: "问题集名称（如：Laojinchuhai EN baseline）",
  },
  "aiVis.enginePlaceholder": {
    en: "Engine (chatgpt-ai-search / perplexity)",
    zh: "引擎（chatgpt-ai-search / perplexity）",
  },
  "aiVis.queriesHint": {
    en: "Queries — one per line: query_id|question text (wording is locked for replay)",
    zh: "问题——每行一条：query_id|问题文本（措辞锁定，保证可回放）",
  },
  "common.cancel": { en: "Cancel", zh: "取消" },
  "common.save": { en: "Save", zh: "保存" },
  "common.create": { en: "Create", zh: "创建" },
};

export type I18nKey = keyof typeof dict | (string & {});

function readLanguage(): UiLanguage {
  if (typeof window === "undefined") return "en";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handleChange = () => onStoreChange();
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function writeLanguage(lang: UiLanguage) {
  try {
    if (lang === "en") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage unavailable
  }
}

export function setUiLanguage(lang: UiLanguage) {
  writeLanguage(lang);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * 同步翻译函数（组件渲染时调用）。未命中字典返回 key 原文（= 英文），
 * 所以未翻译字段自然显示英文，支持渐进式翻译。
 * 优先级：手写 dict（人工修正） > generatedDict（自动翻译）。
 */
export function t(key: I18nKey): string {
  const k = key as string;
  const entry = dict[k] ?? generatedDict[k];
  if (!entry) return k;
  const lang = readLanguage();
  return entry[lang];
}

/** 订阅语言变化的 hook：语言切换时触发重渲染。 */
export function useT(): { lang: UiLanguage; t: typeof t } {
  const lang = React.useSyncExternalStore<UiLanguage>(
    subscribe,
    readLanguage,
    () => "en",
  );
  return { lang, t };
}
