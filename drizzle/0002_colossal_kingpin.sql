ALTER TABLE `users` MODIFY COLUMN `subscriptionTier` enum('free','student','scholar','academic','founder','beta') NOT NULL DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `users` ADD `userTier` enum('regular','founder_core','beta_tester') DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `seatNumber` int;--> statement-breakpoint
ALTER TABLE `users` ADD `seatType` enum('reserved_family','public_founder','beta_tester');--> statement-breakpoint
ALTER TABLE `users` ADD `lifetimeFree` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `betaFreeYearUnlocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `betaFreeYearStart` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `betaFreeYearEnd` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `founderBadge` varchar(100);