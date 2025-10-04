-- HypePOS MySQL schema and seed
-- Create database (if not exists) and use it
CREATE DATABASE IF NOT EXISTS `hypepos` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hypepos`;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('master','distributor','admin','salers') NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Employees table (employees belong to an outlet; default role is "sales person" implicitly)
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `outlet_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(190) NOT NULL,
  `email` VARCHAR(190) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employees_outlet` (`outlet_id`),
  CONSTRAINT `fk_employees_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default accounts (password: password)
-- Hashes were generated using bcrypt with 10 rounds for the string 'password'
INSERT INTO `users` (`email`, `password_hash`, `role`) VALUES
  ('master@demo.com', '$2a$10$u2eF4sB5m1iCk8g7f4wqHe6H3kD2m1zq3m7z4xv1r5P2p8zIhQy2S', 'master')
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO `users` (`email`, `password_hash`, `role`) VALUES
  ('distributor@demo.com', '$2a$10$u2eF4sB5m1iCk8g7f4wqHe6H3kD2m1zq3m7z4xv1r5P2p8zIhQy2S', 'distributor')
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Outlets table
CREATE TABLE IF NOT EXISTS `outlets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(190) NOT NULL,
  `manager_name` VARCHAR(190) NOT NULL,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `location` VARCHAR(255) DEFAULT NULL,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_outlets_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
