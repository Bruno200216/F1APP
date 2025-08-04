-- Script para manejar el conflicto de clave primaria
-- Usa valores temporales para evitar conflictos

-- PASO 1: Verificar el mapeo actual
SELECT 
    old_gp_index,
    new_gp_index,
    name,
    start_date,
    country
FROM new_gp_order
ORDER BY new_gp_index;

-- PASO 2: Actualizar f1_grand_prixes usando valores temporales (9999+)
UPDATE f1_grand_prixes fgp
JOIN new_gp_order ngo ON fgp.gp_index = ngo.old_gp_index
SET fgp.gp_index = ngo.new_gp_index + 9999;

-- PASO 3: Actualizar lineups
UPDATE lineups l
JOIN new_gp_order ngo ON l.gp_index = ngo.old_gp_index
SET l.gp_index = ngo.new_gp_index + 9999;

-- PASO 4: Actualizar pilot_races
UPDATE pilot_races pr
JOIN new_gp_order ngo ON pr.gp_index = ngo.old_gp_index
SET pr.gp_index = ngo.new_gp_index + 9999;

-- PASO 5: Actualizar pilot_qualies
UPDATE pilot_qualies pq
JOIN new_gp_order ngo ON pq.gp_index = ngo.old_gp_index
SET pq.gp_index = ngo.new_gp_index + 9999;

-- PASO 6: Actualizar pilot_practices
UPDATE pilot_practices pp
JOIN new_gp_order ngo ON pp.gp_index = ngo.old_gp_index
SET pp.gp_index = ngo.new_gp_index + 9999;

-- PASO 7: Actualizar team_races
UPDATE team_races tr
JOIN new_gp_order ngo ON tr.gp_index = ngo.old_gp_index
SET tr.gp_index = ngo.new_gp_index + 9999;

-- PASO 8: Ahora asignar los valores finales correctos
UPDATE f1_grand_prixes SET gp_index = gp_index - 9999;
UPDATE lineups SET gp_index = gp_index - 9999;
UPDATE pilot_races SET gp_index = gp_index - 9999;
UPDATE pilot_qualies SET gp_index = gp_index - 9999;
UPDATE pilot_practices SET gp_index = gp_index - 9999;
UPDATE team_races SET gp_index = gp_index - 9999;

-- PASO 9: Verificar resultado final
SELECT 
    gp_index,
    name,
    start_date,
    country
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- PASO 10: Limpiar tabla temporal
DROP TEMPORARY TABLE new_gp_order; 