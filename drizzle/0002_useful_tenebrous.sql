CREATE TABLE `product_metrics` (
	`day` text NOT NULL,
	`event` text NOT NULL,
	`app_build` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `event`, `app_build`)
);
