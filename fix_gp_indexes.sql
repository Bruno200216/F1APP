-- Script para verificar y corregir gp_index según start_date
-- Basado en la captura de DBeaver

-- 1. Verificar el estado actual
SELECT 
    gp_index,
    name,
    start_date,
    country,
    flag
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- 2. Eliminar Japón primero
DELETE FROM f1_grand_prixes WHERE name = 'Japanese Grand Prix';

-- 3. Crear tabla temporal con el nuevo orden
CREATE TEMPORARY TABLE new_gp_order AS
SELECT 
    gp_index,
    name,
    start_date,
    circuit,
    country,
    flag,
    ROW_NUMBER() OVER (ORDER BY start_date ASC) as new_gp_index
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- 4. Mostrar el mapeo de índices
SELECT 
    gp_index as old_index,
    new_gp_index,
    name,
    start_date,
    country
FROM new_gp_order
ORDER BY new_gp_index;

-- 5. Actualizar todas las tablas de puntos
UPDATE pilot_races SET gp_index = (
    SELECT new_gp_index FROM new_gp_order WHERE gp_index = pilot_races.gp_index
);

UPDATE pilot_qualies SET gp_index = (
    SELECT new_gp_index FROM new_gp_order WHERE gp_index = pilot_qualies.gp_index
);

UPDATE pilot_practices SET gp_index = (
    SELECT new_gp_index FROM new_gp_order WHERE gp_index = pilot_practices.gp_index
);

UPDATE team_constructor_races SET gp_index = (
    SELECT new_gp_index FROM new_gp_order WHERE gp_index = team_constructor_races.gp_index
);

UPDATE chief_engineer_races SET gp_index = (
    SELECT new_gp_index FROM new_gp_order WHERE gp_index = chief_engineer_races.gp_index
);

UPDATE track_engineer_races SET gp_index = (
    SELECT new_gp_index FROM new_gp_order WHERE gp_index = track_engineer_races.gp_index
);

-- 6. Actualizar alineaciones
UPDATE lineups SET gp_index = (
    SELECT new_gp_index FROM new_gp_order WHERE gp_index = lineups.gp_index
);

-- 7. Actualizar la tabla principal
UPDATE f1_grand_prixes SET gp_index = (
    SELECT new_gp_index FROM new_gp_order WHERE f1_grand_prixes.gp_index = new_gp_order.gp_index
);

-- 8. Verificar resultado final
SELECT 
    gp_index,
    name,
    start_date,
    country,
    flag
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- 9. Limpiar
DROP TEMPORARY TABLE new_gp_order; 