// 老金定制：AI 可见度采样模块表定义（GEO-ROADMAP.md P0）
// fork 纪律：独立文件，不修改上游 src/db/app.schema.ts / schema.ts
// migration: drizzle/9001_laojin_ai_visibility.sql
import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { projects } from "@/db/app.schema";

export const aiVisibilityQuerySets = sqliteTable("ai_visibility_query_sets", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  engine: text("engine").notNull().default("chatgpt-ai-search"),
  language: text("language").notNull().default("en"),
  locale: text("locale").default("us"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const aiVisibilityQueries = sqliteTable(
  "ai_visibility_queries",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => aiVisibilityQuerySets.id, { onDelete: "cascade" }),
    queryId: text("query_id").notNull(),
    text: text("text").notNull(),
    category: text("category", { enum: ["brand", "category"] })
      .notNull()
      .default("category"),
    sort: integer("sort").notNull().default(0),
  },
  (table) => [
    uniqueIndex("ai_visibility_queries_set_qid_idx").on(
      table.setId,
      table.queryId,
    ),
  ],
);

export const aiVisibilityTrials = sqliteTable(
  "ai_visibility_trials",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => aiVisibilityQuerySets.id, { onDelete: "cascade" }),
    queryId: text("query_id").notNull(),
    engine: text("engine").notNull(),
    model: text("model"),
    collectedAt: text("collected_at").notNull(),
    eligible: integer("eligible", { mode: "boolean" }).notNull().default(true),
    answered: integer("answered", { mode: "boolean" }),
    brandMentioned: integer("brand_mentioned", { mode: "boolean" }),
    brandCited: integer("brand_cited", { mode: "boolean" }),
    exclusionReason: text("exclusion_reason"),
    notes: text("notes"),
  },
  (table) => [
    index("ai_visibility_trials_set_date_idx").on(
      table.setId,
      table.collectedAt,
    ),
    index("ai_visibility_trials_set_query_idx").on(
      table.setId,
      table.queryId,
    ),
  ],
);

// 类型
export type AiVisibilityQuerySet = typeof aiVisibilityQuerySets.$inferSelect;
export type AiVisibilityQuery = typeof aiVisibilityQueries.$inferSelect;
export type AiVisibilityTrial = typeof aiVisibilityTrials.$inferSelect;
