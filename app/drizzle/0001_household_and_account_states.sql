CREATE TABLE `household` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`updated_at` integer NOT NULL,
	CONSTRAINT "household_single_row" CHECK("household"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `member_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`base_class` text NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_types_name_key_unique` ON `member_types` (`name_key`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`member_type_id` text NOT NULL,
	`user_id` integer,
	`first_linked_at` integer,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`member_type_id`) REFERENCES `member_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_name_key_unique` ON `members` (`name_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_user_id_unique` ON `members` (`user_id`);--> statement-breakpoint
CREATE INDEX `members_member_type_id_idx` ON `members` (`member_type_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `password_temporary` integer DEFAULT false NOT NULL;