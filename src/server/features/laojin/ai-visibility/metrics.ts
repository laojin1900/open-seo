// 老金定制：AI 可见度指标计算引擎（GEO-ROADMAP.md P0）
// 纯函数、零 LLM 依赖。口径对齐 docs/geohub/measure-method.md（老金出海仓库）。

export type TrialFlags = {
  eligible: boolean;
  answered: boolean | null;
  brandMentioned: boolean | null;
  brandCited: boolean | null;
};

export type RateMetrics = {
  /** 合格 trial 数（分母） */
  n: number;
  /** 有回答的合格 trial / 合格 trial */
  answerRate: number | null;
  /** 提到品牌的合格 trial / 合格 trial */
  mentionRate: number | null;
  /** 引用品牌的合格 trial / 合格 trial */
  citeRate: number | null;
  /** 有回答且提到品牌 / 有回答（分母为 0 时 null） */
  conditionalRate: number | null;
};

/**
 * Wilson score interval（95%）。
 * 返回 [lower, upper]；n=0 时 [0, 0]。
 */
export function wilson95(p: number, n: number): [number, number] {
  if (!n) return [0, 0];
  const z = 1.959964;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - h) / d, (c + h) / d];
}

/** 聚合一批 trial → 三率 + 条件率。不合格 trial 留在 exclusion 计数但不入分母。 */
export function aggregateTrials(trials: TrialFlags[]): RateMetrics & {
  excluded: number;
} {
  const eligible = trials.filter((t) => t.eligible);
  const n = eligible.length;
  const answered = eligible.filter((t) => t.answered === true).length;
  const mentioned = eligible.filter((t) => t.brandMentioned === true).length;
  const cited = eligible.filter((t) => t.brandCited === true).length;
  return {
    n,
    excluded: trials.length - n,
    answerRate: n ? answered / n : null,
    mentionRate: n ? mentioned / n : null,
    citeRate: n ? cited / n : null,
    conditionalRate: answered ? mentioned / answered : null,
  };
}

/** 周环比（百分比点差）。prev 为 null 时返回 null。 */
export function deltaPp(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null) return null;
  return (cur - prev) * 100;
}

/** 时间戳 → ISO 周一日期（UTC），用于按周分组。 */
export function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
