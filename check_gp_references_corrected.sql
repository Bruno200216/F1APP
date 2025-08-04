-- Script corregido para verificar referencias antes de reordenar gp_index
-- Usando las tablas que realmente existen en la base de datos

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

-- 5. Verificar team_races que usan cada gp_index (incluye team constructors y chief engineers)
SELECT 
    gp_index,
    COUNT(*) as team_races_count
FROM team_races 
GROUP BY gp_index 
ORDER BY gp_index;

-- 6. Mostrar el estado actual de f1_grand_prixes
SELECT 
    gp_index,
    name,
    start_date,
    country
FROM f1_grand_prixes 
ORDER BY start_date ASC; 