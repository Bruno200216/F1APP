-- =====================================================
-- SCRIPT COMPLETO DE MIGRACIÓN DE BASE DE DATOS
-- F1 Fantasy App - Database Setup v2.0
-- =====================================================

-- Configuración inicial
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS f1fantasy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE f1fantasy;

-- =====================================================
-- 1. TABLAS PRINCIPALES
-- =====================================================

-- Tabla de usuarios/players
CREATE TABLE IF NOT EXISTS `players` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL UNIQUE,
  `email` varchar(255) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `is_admin` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_players_username` (`username`),
  KEY `idx_players_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de ligas
CREATE TABLE IF NOT EXISTS `leagues` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_by` bigint unsigned NOT NULL,
  `is_public` tinyint(1) DEFAULT 1,
  `max_players` int DEFAULT 20,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leagues_created_by` (`created_by`),
  KEY `idx_leagues_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de relación players-leagues
CREATE TABLE IF NOT EXISTS `player_by_league` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `player_id` bigint unsigned NOT NULL,
  `league_id` bigint unsigned NOT NULL,
  `points` int DEFAULT 0,
  `is_admin` tinyint(1) DEFAULT 0,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_player_league` (`player_id`, `league_id`),
  KEY `idx_pbl_player_id` (`player_id`),
  KEY `idx_pbl_league_id` (`league_id`),
  CONSTRAINT `fk_pbl_player_id` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pbl_league_id` FOREIGN KEY (`league_id`) REFERENCES `leagues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Grand Prix
CREATE TABLE IF NOT EXISTS `f1_grand_prixes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `gp_index` int NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `country` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `start_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_finished` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gp_index` (`gp_index`),
  KEY `idx_gp_date` (`date`),
  KEY `idx_gp_finished` (`is_finished`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de pilotos
CREATE TABLE IF NOT EXISTS `pilots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pilot_id` char(3) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `team_id` char(3) NOT NULL,
  `tier` int DEFAULT 3,
  `price` decimal(6,2) DEFAULT 0.00,
  `is_in_market` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pilots_pilot_id` (`pilot_id`),
  KEY `idx_pilots_team_id` (`team_id`),
  KEY `idx_pilots_tier` (`tier`),
  KEY `idx_pilots_market` (`is_in_market`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de constructores
CREATE TABLE IF NOT EXISTS `constructors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `team_id` char(3) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `exp_pos_mean` decimal(4,2) DEFAULT 5.50,
  `price` decimal(6,2) DEFAULT 0.00,
  `is_in_market` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_constructors_team_id` (`team_id`),
  KEY `idx_constructors_market` (`is_in_market`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de ingenieros jefe
CREATE TABLE IF NOT EXISTS `chief_engineers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `engineer_id` char(3) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `team_id` char(3) NOT NULL,
  `exp_pos_mean` decimal(4,2) DEFAULT 5.50,
  `price` decimal(6,2) DEFAULT 0.00,
  `is_in_market` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chief_engineers_engineer_id` (`engineer_id`),
  KEY `idx_chief_engineers_team_id` (`team_id`),
  KEY `idx_chief_engineers_market` (`is_in_market`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de ingenieros de pista
CREATE TABLE IF NOT EXISTS `track_engineers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `engineer_id` char(3) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `pilot_id` char(3) NOT NULL,
  `price` decimal(6,2) DEFAULT 0.00,
  `is_in_market` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_track_engineers_engineer_id` (`engineer_id`),
  KEY `idx_track_engineers_pilot_id` (`pilot_id`),
  KEY `idx_track_engineers_market` (`is_in_market`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de alineaciones (lineups)
CREATE TABLE IF NOT EXISTS `lineups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `player_id` bigint unsigned NOT NULL,
  `league_id` bigint unsigned NOT NULL,
  `gp_index` bigint unsigned NOT NULL,
  `race_pilots` json DEFAULT NULL,
  `qualifying_pilots` json DEFAULT NULL,
  `practice_pilots` json DEFAULT NULL,
  `team_constructor` json DEFAULT NULL,
  `chief_engineer` json DEFAULT NULL,
  `track_engineers` json DEFAULT NULL,
  `lineup_points` int DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lineup_player_league_gp` (`player_id`, `league_id`, `gp_index`),
  KEY `idx_lineups_player_league_gp` (`player_id`, `league_id`, `gp_index`),
  KEY `idx_lineups_league_gp` (`league_id`, `gp_index`),
  CONSTRAINT `fk_lineups_player_id` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lineups_league_id` FOREIGN KEY (`league_id`) REFERENCES `leagues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de expectativas de posición
CREATE TABLE IF NOT EXISTS `expectations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `gp_id` bigint unsigned NOT NULL,
  `card_id` bigint unsigned NOT NULL,
  `card_type` enum('pilot','constructor','chief_eng','track_eng') NOT NULL,
  `exp_position` decimal(4,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_expectations_gp_card` (`gp_id`, `card_id`, `card_type`),
  KEY `idx_expectations_gp_id` (`gp_id`),
  KEY `idx_expectations_card_id` (`card_id`),
  KEY `idx_expectations_card_type` (`card_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de puntuaciones
CREATE TABLE IF NOT EXISTS `scores` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `gp_id` bigint unsigned NOT NULL,
  `manager_id` bigint unsigned NOT NULL,
  `card_id` bigint unsigned NOT NULL,
  `card_type` enum('pilot','constructor','chief_eng','track_eng') NOT NULL,
  `raw_points` decimal(8,2) DEFAULT 0.00,
  `final_points` decimal(8,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scores_gp_manager_card` (`gp_id`, `manager_id`, `card_id`, `card_type`),
  KEY `idx_scores_gp_id` (`gp_id`),
  KEY `idx_scores_manager_id` (`manager_id`),
  KEY `idx_scores_card_id` (`card_id`),
  KEY `idx_scores_card_type` (`card_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de elecciones duo-top
CREATE TABLE IF NOT EXISTS `duo_choices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `manager_id` bigint unsigned NOT NULL,
  `gp_id` bigint unsigned NOT NULL,
  `chosen_pilot_id` char(3) NOT NULL,
  `other_pilot_id` char(3) NOT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_duo_manager_gp` (`manager_id`, `gp_id`),
  KEY `idx_duo_manager_id` (`manager_id`),
  KEY `idx_duo_gp_id` (`gp_id`),
  KEY `idx_duo_chosen_pilot` (`chosen_pilot_id`),
  KEY `idx_duo_other_pilot` (`other_pilot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. DATOS INICIALES - GRAND PRIX 2025
-- =====================================================

INSERT IGNORE INTO `f1_grand_prixes` (`gp_index`, `name`, `country`, `date`, `start_date`) VALUES
(1, 'Australian Grand Prix', 'Australia', '2025-07-27', '2025-07-25 12:30:00'),
(2, 'Japanese Grand Prix', 'Japan', '2025-08-03', '2025-08-02 12:30:00'),
(3, 'Belgian Grand Prix', 'Belgium', '2025-08-31', '2025-08-30 11:30:00'),
(4, 'Italian Grand Prix', 'Italy', '2025-09-07', '2025-09-06 12:30:00'),
(5, 'Singapore Grand Prix', 'Singapore', '2025-09-21', '2025-09-20 10:30:00'),
(6, 'Qatar Grand Prix', 'Qatar', '2025-10-05', '2025-10-04 11:30:00'),
(7, 'Mexico Grand Prix', 'Mexico', '2025-10-18', '2025-10-17 19:30:00'),
(8, 'United States Grand Prix', 'United States', '2025-10-26', '2025-10-25 19:30:00'),
(9, 'Brazilian Grand Prix', 'Brazil', '2025-11-08', '2025-11-07 15:30:00'),
(10, 'Las Vegas Grand Prix', 'United States', '2025-11-23', '2025-11-22 01:30:00'),
(11, 'Abu Dhabi Grand Prix', 'UAE', '2025-11-29', '2025-11-28 14:30:00'),
(12, 'Azerbaijan Grand Prix', 'Azerbaijan', '2025-12-07', '2025-12-06 11:30:00');

-- =====================================================
-- 3. DATOS INICIALES - PILOTOS 2025
-- =====================================================

INSERT IGNORE INTO `pilots` (`pilot_id`, `name`, `team_id`, `tier`, `price`) VALUES
-- Tier 1 (Top pilots)
('VER', 'Max Verstappen', 'RBR', 1, 25.00),
('NOR', 'Lando Norris', 'MCL', 1, 22.00),
('LEC', 'Charles Leclerc', 'FER', 1, 20.00),
('SAI', 'Carlos Sainz', 'FER', 1, 18.00),
('RUS', 'George Russell', 'MER', 1, 16.00),

-- Tier 2
('HAM', 'Lewis Hamilton', 'FER', 2, 15.00),
('PIA', 'Oscar Piastri', 'MCL', 2, 14.00),
('ALO', 'Fernando Alonso', 'AST', 2, 13.00),
('PER', 'Sergio Pérez', 'RBR', 2, 12.00),
('STR', 'Lance Stroll', 'AST', 2, 11.00),

-- Tier 3
('GAS', 'Pierre Gasly', 'ALP', 3, 10.00),
('OCO', 'Esteban Ocon', 'ALP', 3, 9.50),
('BOT', 'Valtteri Bottas', 'SAU', 3, 9.00),
('ZHO', 'Zhou Guanyu', 'SAU', 3, 8.50),
('ALB', 'Alexander Albon', 'WIL', 3, 8.00),
('HUL', 'Nico Hulkenberg', 'HAA', 3, 7.50),
('MAG', 'Kevin Magnussen', 'HAA', 3, 7.00),
('TSU', 'Yuki Tsunoda', 'RAC', 3, 6.50),
('RIC', 'Daniel Ricciardo', 'RAC', 3, 6.00),
('SAR', 'Logan Sargeant', 'WIL', 3, 5.50);

-- =====================================================
-- 4. DATOS INICIALES - CONSTRUCTORES
-- =====================================================

INSERT IGNORE INTO `constructors` (`team_id`, `name`, `exp_pos_mean`, `price`) VALUES
('RBR', 'Red Bull Racing', 1.50, 30.00),
('FER', 'Ferrari', 2.50, 25.00),
('MCL', 'McLaren', 3.50, 22.00),
('MER', 'Mercedes', 4.50, 20.00),
('AST', 'Aston Martin', 5.50, 18.00),
('ALP', 'Alpine', 6.50, 15.00),
('SAU', 'Stake F1 Team Kick Sauber', 7.50, 12.00),
('WIL', 'Williams', 8.50, 10.00),
('RAC', 'Visa Cash App RB', 9.50, 8.00),
('HAA', 'Haas F1 Team', 10.50, 6.00);

-- =====================================================
-- 5. DATOS INICIALES - INGENIEROS JEFE
-- =====================================================

INSERT IGNORE INTO `chief_engineers` (`engineer_id`, `name`, `team_id`, `exp_pos_mean`, `price`) VALUES
('NEW', 'Adrian Newey', 'RBR', 1.50, 25.00),
('VAS', 'Frédéric Vasseur', 'FER', 2.50, 22.00),
('BRO', 'Zak Brown', 'MCL', 3.50, 20.00),
('WOL', 'Toto Wolff', 'MER', 4.50, 18.00),
('KRE', 'Laurent Mekies', 'AST', 5.50, 15.00),
('PER', 'Alan Permane', 'ALP', 6.50, 12.00),
('BRA', 'Alessandro Bravi', 'SAU', 7.50, 10.00),
('VOW', 'James Vowles', 'WIL', 8.50, 8.00),
('MEK', 'Laurent Mekies', 'RAC', 9.50, 6.00),
('KOM', 'Ayao Komatsu', 'HAA', 10.50, 5.00);

-- =====================================================
-- 6. DATOS INICIALES - INGENIEROS DE PISTA
-- =====================================================

INSERT IGNORE INTO `track_engineers` (`engineer_id`, `name`, `pilot_id`, `price`) VALUES
-- Red Bull
('LAM', 'Gianpiero Lambiase', 'VER', 20.00),
('WHE', 'Jonathan Wheatley', 'PER', 18.00),

-- Ferrari
('BOZ', 'Bryan Bozzi', 'LEC', 19.00),
('ADA', 'Riccardo Adami', 'SAI', 17.00),

-- McLaren
('JOS', 'Josh Peckett', 'NOR', 18.00),
('JOS', 'Josh Peckett', 'PIA', 16.00),

-- Mercedes
('BON', 'Peter Bonnington', 'HAM', 17.00),
('JOS', 'James Urwin', 'RUS', 15.00),

-- Aston Martin
('GAS', 'Gary Gannon', 'ALO', 16.00),
('GAS', 'Gary Gannon', 'STR', 14.00),

-- Alpine
('HAM', 'Pierre Hamelin', 'GAS', 15.00),
('HAM', 'Pierre Hamelin', 'OCO', 13.00),

-- Sauber
('BAR', 'Stuart Barlow', 'BOT', 14.00),
('BAR', 'Stuart Barlow', 'ZHO', 12.00),

-- Williams
('JOS', 'Will Joseph', 'ALB', 13.00),
('JOS', 'Will Joseph', 'SAR', 11.00),

-- RB
('PET', 'Steven Petrik', 'TSU', 12.00),
('PET', 'Steven Petrik', 'RIC', 10.00),

-- Haas
('DUD', 'Marcus Dudley', 'HUL', 11.00),
('DUD', 'Marcus Dudley', 'MAG', 9.00);

-- =====================================================
-- 7. USUARIO ADMIN POR DEFECTO
-- =====================================================

INSERT IGNORE INTO `players` (`username`, `email`, `password_hash`, `is_admin`) VALUES
('admin', 'admin@f1fantasy.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

-- =====================================================
-- 8. LIGA PÚBLICA POR DEFECTO
-- =====================================================

INSERT IGNORE INTO `leagues` (`name`, `description`, `created_by`, `is_public`, `max_players`) VALUES
('F1 Fantasy Global', 'Liga pública global para todos los jugadores', 1, 1, 100);

-- =====================================================
-- 9. VERIFICACIÓN FINAL
-- =====================================================

SELECT '✅ Base de datos F1 Fantasy inicializada correctamente' as status;

SELECT 
    '📊 Estadísticas de la base de datos:' as info,
    (SELECT COUNT(*) FROM f1_grand_prixes) as total_grand_prix,
    (SELECT COUNT(*) FROM pilots) as total_pilots,
    (SELECT COUNT(*) FROM constructors) as total_constructors,
    (SELECT COUNT(*) FROM chief_engineers) as total_chief_engineers,
    (SELECT COUNT(*) FROM track_engineers) as total_track_engineers,
    (SELECT COUNT(*) FROM players) as total_players,
    (SELECT COUNT(*) FROM leagues) as total_leagues;

-- Habilitar verificaciones de foreign keys
SET FOREIGN_KEY_CHECKS = 1; 