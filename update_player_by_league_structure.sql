-- Migración para actualizar la tabla player_by_league con los campos necesarios
USE f1fantasy;

-- Verificar si la tabla existe
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'f1fantasy' AND table_name = 'player_by_league');

-- Si la tabla no existe, crearla con la estructura correcta
SET @create_table_sql = IF(@table_exists = 0, 
'CREATE TABLE `player_by_league` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `player_id` bigint unsigned NOT NULL,
  `league_id` bigint unsigned NOT NULL,
  `money` decimal(12,2) DEFAULT 100000000.00,
  `team_value` decimal(12,2) DEFAULT 0.00,
  `owned_pilots` json DEFAULT NULL,
  `owned_track_engineers` json DEFAULT NULL,
  `owned_chief_engineers` json DEFAULT NULL,
  `owned_team_constructors` json DEFAULT NULL,
  `totalpoints` int DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_player_league` (`player_id`, `league_id`),
  KEY `idx_pbl_player_id` (`player_id`),
  KEY `idx_pbl_league_id` (`league_id`),
  CONSTRAINT `fk_pbl_player_id` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pbl_league_id` FOREIGN KEY (`league_id`) REFERENCES `leagues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
'SELECT "Table player_by_league already exists" as message'
);

PREPARE stmt FROM @create_table_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Si la tabla existe, agregar las columnas que faltan
SET @alter_table_sql = IF(@table_exists > 0, 
'ALTER TABLE `player_by_league` 
ADD COLUMN IF NOT EXISTS `money` decimal(12,2) DEFAULT 100000000.00,
ADD COLUMN IF NOT EXISTS `team_value` decimal(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS `owned_pilots` json DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `owned_track_engineers` json DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `owned_chief_engineers` json DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `owned_team_constructors` json DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `totalpoints` int DEFAULT 0,
ADD COLUMN IF NOT EXISTS `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;',
'SELECT "Table does not exist, skipping alter" as message'
);

PREPARE stmt FROM @alter_table_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar la estructura final
DESCRIBE `player_by_league`; 