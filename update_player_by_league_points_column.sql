-- Cambiar la columna points_by_gp por totalpoints en player_by_league
-- Primero eliminar la columna points_by_gp
ALTER TABLE `player_by_league` DROP COLUMN `points_by_gp`;

-- Agregar la nueva columna totalpoints
ALTER TABLE `player_by_league` 
ADD COLUMN `totalpoints` INT DEFAULT 0 COMMENT 'Puntos totales del jugador en la liga';

-- Crear índice para optimizar consultas por puntos
CREATE INDEX `idx_player_by_league_totalpoints` ON `player_by_league` (`totalpoints`); 