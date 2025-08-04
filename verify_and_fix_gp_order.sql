-- Script para verificar y corregir el orden de gp_index
-- Primero verificar el estado actual

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