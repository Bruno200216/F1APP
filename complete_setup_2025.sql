-- =====================================================
-- SCRIPT COMPLETO: Configuración de alineaciones 2025
-- =====================================================

-- 1. Crear la tabla lineups
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

-- 2. Agregar la columna start_date a f1_grand_prixes
ALTER TABLE `f1_grand_prixes` 
ADD COLUMN `start_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP 
AFTER `date`;

-- 3. Actualizar las fechas de start_date para 2025 (horario de España)
UPDATE `f1_grand_prixes` SET `start_date` = '2025-07-25 12:30:00' WHERE `gp_index` = 1;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-08-02 12:30:00' WHERE `gp_index` = 2;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-08-30 11:30:00' WHERE `gp_index` = 3;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-09-06 12:30:00' WHERE `gp_index` = 4;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-09-20 10:30:00' WHERE `gp_index` = 5;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-10-04 11:30:00' WHERE `gp_index` = 6;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-10-17 19:30:00' WHERE `gp_index` = 7;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-10-25 19:30:00' WHERE `gp_index` = 8;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-11-07 15:30:00' WHERE `gp_index` = 9;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-11-22 01:30:00' WHERE `gp_index` = 10;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-11-28 14:30:00' WHERE `gp_index` = 11;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-12-06 11:30:00' WHERE `gp_index` = 12;

-- 4. Verificar que todo se creó correctamente
SELECT 'Tabla lineups creada' as status;
SELECT COUNT(*) as total_lineups FROM `lineups`;

SELECT 'Columna start_date agregada' as status;
SELECT `gp_index`, `name`, `start_date` FROM `f1_grand_prixes` ORDER BY `gp_index`; 