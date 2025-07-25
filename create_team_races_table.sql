-- Crear la tabla team_races
CREATE TABLE `team_races` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `teamconstructor_id` bigint unsigned NOT NULL,
  `gp_index` bigint NOT NULL,
  `finish_position` int DEFAULT NULL,
  `expected_position` float DEFAULT NULL,
  `delta_position` int DEFAULT NULL,
  `pitstop_time` float DEFAULT NULL,
  `points` int DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_team_gp` (`teamconstructor_id`, `gp_index`),
  KEY `fk_team_races_teamconstructor` (`teamconstructor_id`),
  KEY `fk_team_races_gp_index` (`gp_index`),
  CONSTRAINT `fk_team_races_teamconstructor` FOREIGN KEY (`teamconstructor_id`) REFERENCES `teamconstructor` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_races_gp_index` FOREIGN KEY (`gp_index`) REFERENCES `f1_grand_prixes` (`gp_index`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 