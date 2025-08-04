-- Script para reordenar gp_index según start_date y eliminar Japón
-- Basado en la captura de DBeaver

-- 1. Primero, crear una tabla temporal con el nuevo orden
CREATE TEMPORARY TABLE temp_gp_order AS
SELECT 
    gp_index,
    name,
    start_date,
    circuit,
    country,
    flag,
    ROW_NUMBER() OVER (ORDER BY start_date ASC) as new_gp_index
FROM f1_grand_prixes 
WHERE name != 'Japanese Grand Prix'  -- Excluir Japón
ORDER BY start_date ASC;

-- 2. Mostrar el nuevo orden propuesto
SELECT 
    gp_index as old_index,
    new_gp_index,
    name,
    start_date,
    country
FROM temp_gp_order
ORDER BY new_gp_index;

-- 3. Actualizar las tablas de puntos con los nuevos índices
-- Primero actualizar pilot_races
UPDATE pilot_races pr
JOIN temp_gp_order tgo ON pr.gp_index = tgo.gp_index
SET pr.gp_index = tgo.new_gp_index;

-- Actualizar pilot_qualies
UPDATE pilot_qualies pq
JOIN temp_gp_order tgo ON pq.gp_index = tgo.gp_index
SET pq.gp_index = tgo.new_gp_index;

-- Actualizar pilot_practices
UPDATE pilot_practices pp
JOIN temp_gp_order tgo ON pp.gp_index = tgo.gp_index
SET pp.gp_index = tgo.new_gp_index;

-- Actualizar team_constructor_races
UPDATE team_constructor_races tcr
JOIN temp_gp_order tgo ON tcr.gp_index = tgo.gp_index
SET tcr.gp_index = tgo.new_gp_index;

-- Actualizar chief_engineer_races
UPDATE chief_engineer_races cer
JOIN temp_gp_order tgo ON cer.gp_index = tgo.gp_index
SET cer.gp_index = tgo.new_gp_index;

-- Actualizar track_engineer_races
UPDATE track_engineer_races ter
JOIN temp_gp_order tgo ON ter.gp_index = tgo.gp_index
SET ter.gp_index = tgo.new_gp_index;

-- 4. Actualizar la tabla principal f1_grand_prixes
UPDATE f1_grand_prixes fgp
JOIN temp_gp_order tgo ON fgp.gp_index = tgo.gp_index
SET fgp.gp_index = tgo.new_gp_index;

-- 5. Actualizar las alineaciones (lineups)
UPDATE lineups l
JOIN temp_gp_order tgo ON l.gp_index = tgo.gp_index
SET l.gp_index = tgo.new_gp_index;

-- 6. Eliminar Japón de la tabla principal (por si acaso quedó)
DELETE FROM f1_grand_prixes WHERE name = 'Japanese Grand Prix';

-- 7. Verificar el resultado final
SELECT 
    gp_index,
    name,
    start_date,
    country,
    flag
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- 8. Limpiar tabla temporal
DROP TEMPORARY TABLE temp_gp_order; 