-- Script para corregir el orden de gp_index según start_date
-- Orden cronológico correcto: Belgian (1) -> Hungarian (2) -> Dutch (3) -> etc.

-- 1. Verificar el estado actual
SELECT 
    gp_index,
    name,
    start_date,
    country
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- 2. Crear tabla temporal con el orden correcto
CREATE TEMPORARY TABLE correct_gp_order AS
SELECT 
    gp_index as old_gp_index,
    name,
    start_date,
    circuit,
    country,
    flag,
    ROW_NUMBER() OVER (ORDER BY start_date ASC) as new_gp_index
FROM f1_grand_prixes 
WHERE name != 'Japanese Grand Prix'  -- Excluir Japón
ORDER BY start_date ASC;

-- 3. Mostrar el mapeo correcto
SELECT 
    old_gp_index,
    new_gp_index,
    name,
    start_date,
    country
FROM correct_gp_order
ORDER BY new_gp_index;

-- 4. Verificar si hay datos en las tablas relacionadas
SELECT 'lineups' as table_name, COUNT(*) as count FROM lineups
UNION ALL
SELECT 'pilot_races' as table_name, COUNT(*) as count FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, COUNT(*) as count FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, COUNT(*) as count FROM pilot_practices
UNION ALL
SELECT 'team_races' as table_name, COUNT(*) as count FROM team_races
UNION ALL
SELECT 'teamconstructor' as table_name, COUNT(*) as count FROM teamconstructor;

-- 5. Si no hay datos, proceder con la actualización
-- Primero eliminar Japanese GP
DELETE FROM f1_grand_prixes WHERE name = 'Japanese Grand Prix';

-- 6. Actualizar gp_index según el orden cronológico
UPDATE f1_grand_prixes 
SET gp_index = CASE 
    WHEN name = 'Belgian Grand Prix' THEN 1
    WHEN name = 'Hungarian Grand Prix' THEN 2
    WHEN name = 'Dutch Grand Prix' THEN 3
    WHEN name = 'Italian Grand Prix' THEN 4
    WHEN name = 'Azerbaijan Grand Prix' THEN 5
    WHEN name = 'Singapore Grand Prix' THEN 6
    WHEN name = 'United States Grand Prix' THEN 7
    WHEN name = 'Mexican Grand Prix' THEN 8
    WHEN name = 'Brazilian Grand Prix' THEN 9
    WHEN name = 'Las Vegas Grand Prix' THEN 10
    WHEN name = 'Qatar Grand Prix' THEN 11
    WHEN name = 'Abu Dhabi Grand Prix' THEN 12
END;

-- 7. Verificar el resultado final
SELECT 
    gp_index,
    name,
    start_date,
    country
FROM f1_grand_prixes 
ORDER BY start_date ASC; 