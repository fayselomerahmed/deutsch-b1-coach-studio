import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const contentFiles = sqliteTable("content_files", {
  fileName: text("file_name").primaryKey(),
  version: integer("version").notNull(),
  payloadBase64: text("payload_base64").notNull(),
  sha256: text("sha256").notNull(),
  minimumBuild: integer("minimum_build").notNull().default(1),
  publishedAt: integer("published_at").notNull(),
  publishedBy: text("published_by").notNull(),
});

export const contentVersions = sqliteTable(
  "content_versions",
  {
    fileName: text("file_name").notNull(),
    version: integer("version").notNull(),
    payloadBase64: text("payload_base64").notNull(),
    sha256: text("sha256").notNull(),
    minimumBuild: integer("minimum_build").notNull().default(1),
    publishedAt: integer("published_at").notNull(),
    publishedBy: text("published_by").notNull(),
  },
  (table) => [primaryKey({ columns: [table.fileName, table.version] })],
);

export const accessEntitlements = sqliteTable("access_entitlements", {
  subjectHash: text("subject_hash").primaryKey(),
  accessSuffix: text("access_suffix").notNull(),
  label: text("label").notNull(),
  accessLevel: text("access_level").notNull(),
  expiresAt: integer("expires_at"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});
