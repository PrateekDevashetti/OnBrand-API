import { pgTable, text, integer, timestamp, jsonb, boolean, index, real } from "drizzle-orm/pg-core";
import type { BrandSystem } from "../types";
import type { AdherenceReport } from "../adherence";
import type { StyleResult } from "../search";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().default(""),
  name: text("name").notNull().default(""),
  companyName: text("company_name").notNull().default(""),
  companyWebsite: text("company_website").notNull().default(""),
  plan: text("plan").notNull().default("free"),
  credits: integer("credits").notNull().default(20),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    hash: text("hash").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("api_keys_hash_idx").on(t.hash), index("api_keys_user_idx").on(t.userId)],
);

export type JobStage = { key: string; label: string; status: "pending" | "running" | "done" | "error" };

export const extractions = pgTable(
  "extractions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    apiKeyId: text("api_key_id"),
    parentId: text("parent_id"),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    domain: text("domain").notNull(),
    company: text("company").notNull().default(""),
    status: text("status").notNull().default("queued"), // queued | running | completed | failed
    depth: text("depth").notNull().default("deep"), // deep | light
    source: text("source").notNull().default("new"), // new | cache
    pagesMode: text("pages_mode").notNull().default("single"), // single | all
    requestFrom: text("request_from").notNull().default("playground"), // playground | api | mcp
    brand: jsonb("brand").$type<BrandSystem>(),
    palette: jsonb("palette").$type<string[]>().notNull().default([]),
    stages: jsonb("stages").$type<JobStage[]>().notNull().default([]),
    screenshotPath: text("screenshot_path"),
    heroPath: text("hero_path"),
    htmlPath: text("html_path"),
    cssPath: text("css_path"),
    credits: integer("credits").notNull().default(0),
    error: text("error"),
    shareToken: text("share_token"),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("extractions_user_idx").on(t.userId, t.createdAt),
    index("extractions_norm_idx").on(t.normalizedUrl, t.status),
    index("extractions_parent_idx").on(t.parentId),
  ],
);

export const searches = pgTable(
  "searches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    apiKeyId: text("api_key_id"),
    query: text("query").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    filters: jsonb("filters").$type<Record<string, string[]>>().notNull().default({}),
    depth: text("depth").notNull().default("light"),
    limit: integer("limit").notNull().default(6),
    results: jsonb("results").$type<StyleResult[]>().notNull().default([]),
    status: text("status").notNull().default("completed"),
    credits: integer("credits").notNull().default(1),
    requestFrom: text("request_from").notNull().default("playground"),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("searches_user_idx").on(t.userId, t.createdAt)],
);

export const adherenceRuns = pgTable(
  "adherence_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    apiKeyId: text("api_key_id"),
    referenceUrl: text("reference_url").notNull(),
    designUrl: text("design_url").notNull(),
    referenceExtractionId: text("reference_extraction_id"),
    designExtractionId: text("design_extraction_id"),
    status: text("status").notNull().default("queued"),
    score: real("score"),
    report: jsonb("report").$type<AdherenceReport>(),
    stages: jsonb("stages").$type<JobStage[]>().notNull().default([]),
    credits: integer("credits").notNull().default(2),
    requestFrom: text("request_from").notNull().default("playground"),
    error: text("error"),
    shareToken: text("share_token"),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("adherence_user_idx").on(t.userId, t.createdAt)],
);

/** Curated index of brand systems that powers Style Search. */
export const styleIndex = pgTable(
  "style_index",
  {
    id: text("id").primaryKey(),
    domain: text("domain").notNull(),
    url: text("url").notNull(),
    name: text("name").notNull(),
    label: text("label").notNull().default(""),
    screenshotPath: text("screenshot_path"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    styles: jsonb("styles").$type<string[]>().notNull().default([]),
    websiteTypes: jsonb("website_types").$type<string[]>().notNull().default([]),
    industries: jsonb("industries").$type<string[]>().notNull().default([]),
    layouts: jsonb("layouts").$type<string[]>().notNull().default([]),
    palette: jsonb("palette").$type<string[]>().notNull().default([]),
    typography: text("typography").notNull().default(""),
    description: text("description").notNull().default(""),
    keywords: text("keywords").notNull().default(""),
    mode: text("mode").notNull().default("dark"),
    extractionId: text("extraction_id"),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("style_index_domain_idx").on(t.domain)],
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    apiKeyId: text("api_key_id"),
    feature: text("feature").notNull(), // extraction | search | adherence | enhance
    refId: text("ref_id"),
    credits: integer("credits").notNull().default(0),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_user_idx").on(t.userId, t.createdAt)],
);

export const creditLedger = pgTable("credit_ledger", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  refId: text("ref_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Background job queue (used when ONBRAND_ENGINE_MODE=worker). */
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(), // extract | adherence
    refId: text("ref_id").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_status_idx").on(t.status, t.createdAt)],
);
