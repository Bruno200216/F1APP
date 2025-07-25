-- Crear la tabla lineups
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lineups_player_league_gp` (`player_id`,`league_id`,`gp_index`),
  KEY `idx_lineups_league_gp` (`league_id`,`gp_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 