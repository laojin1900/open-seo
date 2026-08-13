// 老金定制：AI 可见度模块 API schemas（GEO-ROADMAP.md P0）
import { z } from "zod";

export const queryCategoryEnum = z.enum(["brand", "category"]);

export const createQuerySetSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(120),
  engine: z.string().min(1).max(60).optional(),
  language: z.string().min(1).max(10).optional(),
  locale: z.string().min(1).max(10).optional(),
  /** 建集时一次性带全问题集（措辞锁定）。 */
  queries: z
    .array(
      z.object({
        queryId: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
        text: z.string().min(1).max(300),
        category: queryCategoryEnum.optional(),
      }),
    )
    .min(1)
    .max(100),
});

export const listQuerySetsSchema = z.object({
  projectId: z.string().uuid(),
});

export const deleteQuerySetSchema = z.object({
  projectId: z.string().uuid(),
  setId: z.string().uuid(),
});

export const recordTrialSchema = z.object({
  projectId: z.string().uuid(),
  setId: z.string().uuid(),
  queryId: z.string().min(1).max(40),
  engine: z.string().min(1).max(60),
  model: z.string().min(1).max(60).optional(),
  collectedAt: z.string().datetime().optional(),
  eligible: z.boolean().optional(),
  answered: z.boolean().nullable().optional(),
  brandMentioned: z.boolean().nullable().optional(),
  brandCited: z.boolean().nullable().optional(),
  exclusionReason: z.string().max(120).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const getMetricsSchema = z.object({
  projectId: z.string().uuid(),
  setId: z.string().uuid().optional(),
  weeks: z.number().int().min(1).max(26).optional(),
});

export const listTrialsSchema = z.object({
  projectId: z.string().uuid(),
  setId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(500).optional(),
});
