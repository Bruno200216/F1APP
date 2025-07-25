-- Añadir columna lineup_points a la tabla lineups
-- Esta columna almacenará los puntos totales de la alineación para cada GP

ALTER TABLE `lineups` 
ADD COLUMN `lineup_points` INT DEFAULT 0 COMMENT 'Puntos totales de la alineación para este GP';

-- Crear índice para optimizar consultas por puntos
CREATE INDEX `idx_lineup_points` ON `lineups` (`lineup_points`);

 