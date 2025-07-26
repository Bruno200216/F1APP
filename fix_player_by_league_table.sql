-- Recrear la tabla player_by_league con todas las columnas necesarias
DROP TABLE IF EXISTS player_by_league;

-- Usar la base de datos
USE f1fantasy;

-- Verificar si la tabla existe antes de modificarla
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'f1fantasy' AND table_name = 'player_by_league');

-- Solo agregar la columna si la tabla existe
SET @sql = IF(@table_exists > 0, 
    'ALTER TABLE player_by_league ADD COLUMN totalpoints int DEFAULT 0',
    'SELECT "Table player_by_league does not exist" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt; 