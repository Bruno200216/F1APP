-- Script para verificar referencias antes de reordenar gp_index
-- Esto nos dirá qué registros están usando cada gp_index

-- 1. Verificar lineups que usan cada gp_index
SELECT 
    gp_index,
    COUNT(*) as lineup_count
FROM lineups 
GROUP BY gp_index 
ORDER BY gp_index;

-- 2. Verificar pilot_races que usan cada gp_index
SELECT 
    gp_index,
    COUNT(*) as pilot_races_count
FROM pilot_races 
GROUP BY gp_index 
ORDER BY gp_index;

-- 3. Verificar pilot_qualies que usan cada gp_index
SELECT 
    gp_index,
    COUNT(*) as pilot_qualies_count
FROM pilot_qualies 
GROUP BY gp_index 
ORDER BY gp_index;

-- 4. Verificar pilot_practices que usan cada gp_index
SELECT 
    gp_index,
    COUNT(*) as pilot_practices_count
FROM pilot_practices 
GROUP BY gp_index 
ORDER BY gp_index;

-- 5. Verificar team_constructor_races que usan cada gp_index
SELECT 
    gp_index,
    COUNT(*) as team_constructor_races_count
FROM team_constructor_races 
GROUP BY gp_index 
ORDER BY gp_index;

-- 6. Verificar chief_engineer_races que usan cada gp_index
SELECT 
    gp_index,
    COUNT(*) as chief_engineer_races_count
FROM chief_engineer_races 
GROUP BY gp_index 
ORDER BY gp_index;

-- 7. Verificar track_engineer_races que usan cada gp_index
SELECT 
    gp_index,
    COUNT(*) as track_engineer_races_count
FROM track_engineer_races 
GROUP BY gp_index 
ORDER BY gp_index;

-- 8. Mostrar el estado actual de f1_grand_prixes
SELECT 
    gp_index,
    name,
    start_date,
    country
FROM f1_grand_prixes 
ORDER BY start_date ASC; 