// 老金定制：AI 可见度模块 server functions（GEO-ROADMAP.md P0）
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import {
  aiVisibilityQuerySets,
  aiVisibilityQueries,
  aiVisibilityTrials,
} from "@/db/laojin.schema";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  aggregateTrials,
  deltaPp,
  weekKey,
  wilson95,
} from "@/server/features/laojin/ai-visibility/metrics";
import {
  createQuerySetSchema,
  listQuerySetsSchema,
  deleteQuerySetSchema,
  recordTrialSchema,
  getMetricsSchema,
  listTrialsSchema,
} from "@/types/schemas/laojin-ai-visibility";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type {
  AiVisibilityQuerySet,
  AiVisibilityQuery,
} from "@/db/laojin.schema";

/** 兼容 Workers 与 Node 的 UUID 生成 */
function uuid(): string {
  return globalThis.crypto.randomUUID();
}

// ── 查询集 CRUD ────────────────────────────────────────────────

export const listQuerySets = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(listQuerySetsSchema)
  .handler(async ({ data, context }) => {
    const sets = await db
      .select()
      .from(aiVisibilityQuerySets)
      .where(eq(aiVisibilityQuerySets.projectId, context.projectId))
      .orderBy(desc(aiVisibilityQuerySets.createdAt));
    return sets;
  });

export const createQuerySet = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(createQuerySetSchema)
  .handler(async ({ data, context }) => {
    const setId = uuid();
    await db.insert(aiVisibilityQuerySets).values({
      id: setId,
      projectId: context.projectId,
      name: data.name,
      engine: data.engine ?? "chatgpt-ai-search",
      language: data.language ?? "en",
      locale: data.locale ?? "us",
    });
    await db.insert(aiVisibilityQueries).values(
      data.queries.map((q, i) => ({
        id: uuid(),
        setId,
        queryId: q.queryId,
        text: q.text,
        category: q.category ?? "category",
        sort: i,
      })),
    );
    return { setId };
  });

export const deleteQuerySet = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(deleteQuerySetSchema)
  .handler(async ({ data, context }) => {
    await db
      .delete(aiVisibilityQuerySets)
      .where(
        and(
          eq(aiVisibilityQuerySets.id, data.setId),
          eq(aiVisibilityQuerySets.projectId, context.projectId),
        ),
      );
    return { success: true };
  });

export const listQueries = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(deleteQuerySetSchema)
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      set: AiVisibilityQuerySet | null;
      queries: AiVisibilityQuery[];
    }> => {
    // 校验 set 属于本项目
    const setRows = await db
      .select()
      .from(aiVisibilityQuerySets)
      .where(
        and(
          eq(aiVisibilityQuerySets.id, data.setId),
          eq(aiVisibilityQuerySets.projectId, context.projectId),
        ),
      )
      .limit(1);
      if (!setRows.length) return { set: null, queries: [] };
      return {
        set: setRows[0],
        queries: await db
          .select()
          .from(aiVisibilityQueries)
          .where(eq(aiVisibilityQueries.setId, data.setId))
          .orderBy(aiVisibilityQueries.sort),
      };
    },
  );

// ── trial 录入 ─────────────────────────────────────────────────

export const recordTrial = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(recordTrialSchema)
  .handler(async ({ data, context }) => {
    // set 归属校验
    const setRows = await db
      .select({ id: aiVisibilityQuerySets.id })
      .from(aiVisibilityQuerySets)
      .where(
        and(
          eq(aiVisibilityQuerySets.id, data.setId),
          eq(aiVisibilityQuerySets.projectId, context.projectId),
        ),
      )
      .limit(1);
    if (!setRows.length) {
      throw new Error("Query set not found in this project");
    }
    const id = uuid();
    await db.insert(aiVisibilityTrials).values({
      id,
      setId: data.setId,
      queryId: data.queryId,
      engine: data.engine,
      model: data.model ?? null,
      collectedAt: data.collectedAt ?? new Date().toISOString(),
      eligible: data.eligible ?? true,
      answered: data.answered ?? null,
      brandMentioned: data.brandMentioned ?? null,
      brandCited: data.brandCited ?? null,
      exclusionReason: data.exclusionReason ?? null,
      notes: data.notes ?? null,
    });
    return { trialId: id };
  });

// ── 指标 ───────────────────────────────────────────────────────

export const getMetrics = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(getMetricsSchema)
  .handler(async ({ data, context }) => {
    const weeks = data.weeks ?? 8;
    const sets = await db
      .select()
      .from(aiVisibilityQuerySets)
      .where(
        and(
          eq(aiVisibilityQuerySets.projectId, context.projectId),
          data.setId ? eq(aiVisibilityQuerySets.id, data.setId) : undefined,
        ),
      )
      .orderBy(desc(aiVisibilityQuerySets.createdAt));
    const setIds = sets.map((s) => s.id);
    if (!setIds.length) return { overall: null, weeks: [], perSet: [] };

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - weeks * 7);
    const cutoffIso = cutoff.toISOString();

    const trials = await db
      .select()
      .from(aiVisibilityTrials)
      .where(
        and(
          sql`${aiVisibilityTrials.setId} IN ${setIds.map((id) => sql`${id}`)}`,
          gte(aiVisibilityTrials.collectedAt, cutoffIso),
        ),
      )
      .orderBy(desc(aiVisibilityTrials.collectedAt));

    const bySet = new Map<string, typeof trials>();
    for (const t of trials) {
      const arr = bySet.get(t.setId) ?? [];
      arr.push(t);
      bySet.set(t.setId, arr);
    }

    // 周聚合（按 weekKey 分组）
    const weekBuckets = new Map<string, (typeof trials)[number][]>();
    for (const t of trials) {
      const wk = weekKey(t.collectedAt);
      weekBuckets.set(wk, [...(weekBuckets.get(wk) ?? []), t]);
    }
    const weekRows = [...weekBuckets.entries()]
      .map(([week, ts]) => {
        const m = aggregateTrials(ts);
        return {
          week,
          n: m.n,
          answerRate: m.answerRate,
          mentionRate: m.mentionRate,
          citeRate: m.citeRate,
        };
      })
      .sort((a, b) => (a.week < b.week ? -1 : 1));

    const withIntervals = (rate: number | null, n: number) => {
      if (rate === null) return null;
      const [lo, hi] = wilson95(rate, n);
      return { rate, lower: lo, upper: hi };
    };

    const overall = withIntervals(
      aggregateTrials(trials).mentionRate,
      trials.filter((t) => t.eligible).length,
    );
    const overallAgg = aggregateTrials(trials);

    // 环比：最近一周 vs 前一周
    const lastTwo = weekRows.slice(-2);
    const cur = lastTwo[1] ?? null;
    const prev = lastTwo.length === 2 ? lastTwo[0] : null;

    const perSet = sets.map((s) => {
      const ts = bySet.get(s.id) ?? [];
      const m = aggregateTrials(ts);
      return {
        setId: s.id,
        name: s.name,
        engine: s.engine,
        n: m.n,
        answerRate: withIntervals(m.answerRate, m.n),
        mentionRate: withIntervals(m.mentionRate, m.n),
        citeRate: withIntervals(m.citeRate, m.n),
        conditionalRate: withIntervals(m.conditionalRate, m.n),
      };
    });

    return {
      overall: {
        n: overallAgg.n,
        excluded: overallAgg.excluded,
        answerRate: withIntervals(overallAgg.answerRate, overallAgg.n),
        mentionRate: withIntervals(overallAgg.mentionRate, overallAgg.n),
        citeRate: withIntervals(overallAgg.citeRate, overallAgg.n),
        conditionalRate: withIntervals(
          overallAgg.conditionalRate,
          overallAgg.n,
        ),
        weekOverWeek: {
          mentionDeltaPp: deltaPp(cur?.mentionRate ?? null, prev?.mentionRate ?? null),
          citeDeltaPp: deltaPp(cur?.citeRate ?? null, prev?.citeRate ?? null),
          answerDeltaPp: deltaPp(cur?.answerRate ?? null, prev?.answerRate ?? null),
        },
      },
      weeks: weekRows,
      perSet,
    };
  });

// ── 明细 ───────────────────────────────────────────────────────

export const listTrials = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(listTrialsSchema)
  .handler(async ({ data, context }) => {
    const setRows = data.setId
      ? [{ id: data.setId }]
      : await db
          .select({ id: aiVisibilityQuerySets.id })
          .from(aiVisibilityQuerySets)
          .where(eq(aiVisibilityQuerySets.projectId, context.projectId));
    const setIds = setRows.map((s) => s.id);
    if (!setIds.length) return { trials: [] };
    return {
      trials: await db
        .select()
        .from(aiVisibilityTrials)
        .where(sql`${aiVisibilityTrials.setId} IN ${setIds.map((id) => sql`${id}`)}`)
        .orderBy(desc(aiVisibilityTrials.collectedAt))
        .limit(data.limit ?? 200),
    };
  });
