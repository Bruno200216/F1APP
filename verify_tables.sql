-- Script para verificar y crear las tablas necesarias para el scraper F1

-- 1. Verificar si las tablas existen
SELECT 'Verificando tablas existentes...' as status;

-- Verificar tabla pilots
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla pilots existe'
        ELSE '❌ Tabla pilots NO existe'
    END as pilots_status
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'pilots';

-- Verificar tabla pilot_races
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla pilot_races existe'
        ELSE '❌ Tabla pilot_races NO existe'
    END as pilot_races_status
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'pilot_races';

-- Verificar tabla pilot_qualies
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla pilot_qualies existe'
        ELSE '❌ Tabla pilot_qualies NO existe'
    END as pilot_qualies_status
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'pilot_qualies';

-- Verificar tabla pilot_practices
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla pilot_practices existe'
        ELSE '❌ Tabla pilot_practices NO existe'
    END as pilot_practices_status
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'pilot_practices';

-- 2. Crear tablas si no existen
-- Crear tabla pilot_races si no existe
CREATE TABLE IF NOT EXISTS `pilot_races` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pilot_id` bigint unsigned NOT NULL,
  `gp_index` bigint unsigned NOT NULL,
  `start_position` int DEFAULT NULL,
  `finish_position` int DEFAULT NULL,
  `expected_position` float DEFAULT NULL,
  `delta_position` int DEFAULT NULL,
  `points` int DEFAULT 0,
  `positions_gained_at_start` int DEFAULT 0,
  `clean_overtakes` int DEFAULT 0,
  `net_positions_lost` int DEFAULT 0,
  `fastest_lap` tinyint(1) DEFAULT 0,
  `caused_vsc` tinyint(1) DEFAULT 0,
  `caused_sc` tinyint(1) DEFAULT 0,
  `caused_red_flag` tinyint(1) DEFAULT 0,
  `dnf_driver_error` tinyint(1) DEFAULT 0,
  `dnf_no_fault` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pilot_race_gp` (`pilot_id`, `gp_index`),
  KEY `idx_pilot_races_pilot_id` (`pilot_id`),
  KEY `idx_pilot_races_gp_index` (`gp_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla pilot_qualies si no existe
CREATE TABLE IF NOT EXISTS `pilot_qualies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pilot_id` bigint unsigned NOT NULL,
  `gp_index` bigint unsigned NOT NULL,
  `start_position` int DEFAULT NULL,
  `finish_position` int DEFAULT NULL,
  `expected_position` float DEFAULT NULL,
  `delta_position` int DEFAULT NULL,
  `points` int DEFAULT 0,
  `caused_red_flag` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pilot_qualy_gp` (`pilot_id`, `gp_index`),
  KEY `idx_pilot_qualies_pilot_id` (`pilot_id`),
  KEY `idx_pilot_qualies_gp_index` (`gp_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla pilot_practices si no existe
CREATE TABLE IF NOT EXISTS `pilot_practices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pilot_id` bigint unsigned NOT NULL,
  `gp_index` bigint unsigned NOT NULL,
  `start_position` int DEFAULT NULL,
  `finish_position` int DEFAULT NULL,
  `expected_position` float DEFAULT NULL,
  `delta_position` int DEFAULT NULL,
  `points` int DEFAULT 0,
  `caused_red_flag` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pilot_practice_gp` (`pilot_id`, `gp_index`),
  KEY `idx_pilot_practices_pilot_id` (`pilot_id`),
  KEY `idx_pilot_practices_gp_index` (`gp_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Verificar datos en las tablas
SELECT 'Verificando datos en las tablas...' as status;

-- Contar registros en cada tabla
SELECT 'pilot_races' as table_name, COUNT(*) as count FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, COUNT(*) as count FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, COUNT(*) as count FROM pilot_practices;

-- 4. Verificar estructura de la tabla pilots
SELECT 'Verificando estructura de la tabla pilots...' as status;
DESCRIBE pilots;

-- 5. Mostrar algunos pilotos de ejemplo
SELECT 'Mostrando pilotos de ejemplo...' as status;
SELECT id, pilot_id, name, team_id FROM pilots LIMIT 10; 