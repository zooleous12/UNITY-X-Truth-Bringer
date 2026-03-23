CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`code` varchar(50),
	`color` varchar(7) NOT NULL DEFAULT '#6366f1',
	`semester` varchar(50),
	`instructor` varchar(200),
	`description` text,
	`materialsCount` int NOT NULL DEFAULT 0,
	`flashcardsCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `flashcards` ADD `courseId` int;--> statement-breakpoint
ALTER TABLE `study_materials` ADD `courseId` int;