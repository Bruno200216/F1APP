-- Agregar columna points_by_gp a la tabla player_by_league
ALTER TABLE player_by_league ADD COLUMN points_by_gp JSON;

-- Actualizar registros existentes para que tengan un array vacío
UPDATE player_by_league SET points_by_gp = '[]' WHERE points_by_gp IS NULL; 