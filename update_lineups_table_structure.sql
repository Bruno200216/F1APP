-- =====================================================
-- MODIFICAR TABLA lineups PARA GUARDAR SOLO IDs
-- =====================================================

-- 1. Eliminar las columnas JSON existentes
ALTER TABLE `lineups` 
DROP COLUMN `race_pilots`,
DROP COLUMN `qualifying_pilots`, 
DROP COLUMN `practice_pilots`,
DROP COLUMN `team_constructor`,
DROP COLUMN `chief_engineer`,
DROP COLUMN `track_engineers`;

-- 2. Agregar las nuevas columnas con arrays de IDs
ALTER TABLE `lineups` 
ADD COLUMN `race_pilots` JSON DEFAULT NULL COMMENT 'Array de pilot_by_league_id para pilotos de carrera',
ADD COLUMN `qualifying_pilots` JSON DEFAULT NULL COMMENT 'Array de pilot_by_league_id para pilotos de clasificación',
ADD COLUMN `practice_pilots` JSON DEFAULT NULL COMMENT 'Array de pilot_by_league_id para pilotos de práctica',
ADD COLUMN `team_constructor_id` bigint unsigned DEFAULT NULL COMMENT 'ID de team_constructor_by_league',
ADD COLUMN `chief_engineer_id` bigint unsigned DEFAULT NULL COMMENT 'ID de chief_engineer_by_league',
ADD COLUMN `track_engineers` JSON DEFAULT NULL COMMENT 'Array de track_engineer_by_league_id';

-- 3. Agregar índices para mejorar el rendimiento
ALTER TABLE `lineups` 
ADD INDEX `idx_team_constructor_id` (`team_constructor_id`),
ADD INDEX `idx_chief_engineer_id` (`chief_engineer_id`);

-- 4. Verificar la nueva estructura
DESCRIBE `lineups`; 