CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`themeMode` enum('light','dark','auto') DEFAULT 'dark',
	`purpleShade` varchar(20) DEFAULT 'default',
	`accentColor` varchar(7) DEFAULT '#a855f7',
	`fontSize` enum('small','medium','large') DEFAULT 'medium',
	`sidebarPosition` enum('left','right','hidden') DEFAULT 'left',
	`cardLayout` enum('compact','comfortable','spacious') DEFAULT 'comfortable',
	`dashboardLayout` varchar(50) DEFAULT 'default',
	`experimentalFeatures` json DEFAULT ('{}'),
	`submittedSuggestions` json DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_userId_unique` UNIQUE(`userId`)
);
