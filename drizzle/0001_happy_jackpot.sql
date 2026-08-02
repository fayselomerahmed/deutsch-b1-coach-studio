CREATE TABLE `access_entitlements` (
	`subject_hash` text PRIMARY KEY NOT NULL,
	`access_suffix` text NOT NULL,
	`label` text NOT NULL,
	`access_level` text NOT NULL CHECK (`access_level` IN ('trial', 'full')),
	`expires_at` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
