-- 9001_laojin_ai_visibility
-- 老金定制：AI 可见度采样模块（GEO-ROADMAP.md P0）
-- fork 纪律：独立 9xxx 段，不与上游连续号冲突

CREATE TABLE `ai_visibility_query_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL REFERENCES `projects`(`id`) ON DELETE CASCADE,
	`name` text NOT NULL,
	`engine` text NOT NULL DEFAULT 'chatgpt-ai-search',
	`language` text NOT NULL DEFAULT 'en',
	`locale` text DEFAULT 'us',
	`created_at` text NOT NULL DEFAULT (current_timestamp)
);
--> statement-breakpoint
CREATE TABLE `ai_visibility_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL REFERENCES `ai_visibility_query_sets`(`id`) ON DELETE CASCADE,
	`query_id` text NOT NULL,
	`text` text NOT NULL,
	`category` text NOT NULL DEFAULT 'category',
	`sort` integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_visibility_queries_set_qid_idx` ON `ai_visibility_queries` (`set_id`,`query_id`);
--> statement-breakpoint
CREATE TABLE `ai_visibility_trials` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL REFERENCES `ai_visibility_query_sets`(`id`) ON DELETE CASCADE,
	`query_id` text NOT NULL,
	`engine` text NOT NULL,
	`model` text,
	`collected_at` text NOT NULL,
	`eligible` integer NOT NULL DEFAULT 1,
	`answered` integer,
	`brand_mentioned` integer,
	`brand_cited` integer,
	`exclusion_reason` text,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `ai_visibility_trials_set_date_idx` ON `ai_visibility_trials` (`set_id`,`collected_at`);
--> statement-breakpoint
CREATE INDEX `ai_visibility_trials_set_query_idx` ON `ai_visibility_trials` (`set_id`,`query_id`);
