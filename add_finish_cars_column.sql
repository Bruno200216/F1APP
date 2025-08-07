-- =====================================================
-- MIGRACIÓN: Añadir columna finish_cars a team_races
-- =====================================================

-- Añadir la columna finish_cars a la tabla team_races
ALTER TABLE `team_races` 
ADD COLUMN `finish_cars` TINYINT DEFAULT 0 COMMENT 'Número de coches que acabaron la carrera (0, 1 o 2)';

-- Verificar que la columna se añadió correctamente
DESCRIBE `team_races`; 