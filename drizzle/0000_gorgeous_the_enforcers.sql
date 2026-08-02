CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_files` (
	`file_name` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`payload_base64` text NOT NULL,
	`sha256` text NOT NULL,
	`minimum_build` integer DEFAULT 1 NOT NULL,
	`published_at` integer NOT NULL,
	`published_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_versions` (
	`file_name` text NOT NULL,
	`version` integer NOT NULL,
	`payload_base64` text NOT NULL,
	`sha256` text NOT NULL,
	`minimum_build` integer DEFAULT 1 NOT NULL,
	`published_at` integer NOT NULL,
	`published_by` text NOT NULL,
	PRIMARY KEY(`file_name`, `version`)
);
