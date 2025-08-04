-- Script para eliminar el Japanese Grand Prix de forma segura
-- Verificar primero el estado actual

-- 1. Verificar que existe el Japanese Grand Prix
SELECT 
    gp_index,
    name,
    start_date,
    country
FROM f1_grand_prixes 
WHERE name = 'Japanese Grand Prix';

-- 2. Verificar si hay datos relacionados en otras tablas
SELECT 'lineups' as table_name, COUNT(*) as count 
FROM lineups 
WHERE gp_index = (SELECT gp_index FROM f1_grand_prixes WHERE name = 'Japanese Grand Prix')
UNION ALL
SELECT 'pilot_races' as table_name, COUNT(*) as count 
FROM pilot_races 
WHERE gp_index = (SELECT gp_index FROM f1_grand_prixes WHERE name = 'Japanese Grand Prix')
UNION ALL
SELECT 'pilot_qualies' as table_name, COUNT(*) as count 
FROM pilot_qualies 
WHERE gp_index = (SELECT gp_index FROM f1_grand_prixes WHERE name = 'Japanese Grand Prix')
UNION ALL
SELECT 'pilot_practices' as table_name, COUNT(*) as count 
FROM pilot_practices 
WHERE gp_index = (SELECT gp_index FROM f1_grand_prixes WHERE name = 'Japanese Grand Prix')
UNION ALL
SELECT 'team_races' as table_name, COUNT(*) as count 
FROM team_races 
WHERE gp_index = (SELECT gp_index FROM f1_grand_prixes WHERE name = 'Japanese Grand Prix');

-- 3. Si no hay datos relacionados, eliminar el Japanese GP
DELETE FROM f1_grand_prixes WHERE name = 'Japanese Grand Prix';

-- 4. Verificar que se eliminó correctamente
SELECT 
    gp_index,
    name,
    start_date,
    country
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- 5. Mostrar el estado final
SELECT 
    COUNT(*) as total_gps,
    MIN(start_date) as earliest_gp,
    MAX(start_date) as latest_gp
FROM f1_grand_prixes; 