-- Script COMPLETO para reordenar gp_index incluyendo TODAS las tablas con FK
-- Usa valores temporales para evitar conflictos de clave primaria

-- PASO 1: Verificar el mapeo actual
SELECT 
    old_gp_index,
    new_gp_index,
    name,
    start_date,
    country
FROM new_gp_order
ORDER BY new_gp_index;

-- PASO 2: Actualizar TODAS las tablas con valores temporales (9999+)
-- Primero las tablas principales
UPDATE f1_grand_prixes fgp
JOIN new_gp_order ngo ON fgp.gp_index = ngo.old_gp_index
SET fgp.gp_index = ngo.new_gp_index + 9999;

UPDATE lineups l
JOIN new_gp_order ngo ON l.gp_index = ngo.old_gp_index
SET l.gp_index = ngo.new_gp_index + 9999;

UPDATE pilot_races pr
JOIN new_gp_order ngo ON pr.gp_index = ngo.old_gp_index
SET pr.gp_index = ngo.new_gp_index + 9999;

UPDATE pilot_qualies pq
JOIN new_gp_order ngo ON pq.gp_index = ngo.old_gp_index
SET pq.gp_index = ngo.new_gp_index + 9999;

UPDATE pilot_practices pp
JOIN new_gp_order ngo ON pp.gp_index = ngo.old_gp_index
SET pp.gp_index = ngo.new_gp_index + 9999;

UPDATE team_races tr
JOIN new_gp_order ngo ON tr.gp_index = ngo.old_gp_index
SET tr.gp_index = ngo.new_gp_index + 9999;

-- Agregar teamconstructor (que causó el error)
UPDATE teamconstructor tc
JOIN new_gp_order ngo ON tc.gp_index = ngo.old_gp_index
SET tc.gp_index = ngo.new_gp_index + 9999;

-- Agregar otras posibles tablas con FK
UPDATE teamconstructor_by_league tcb
JOIN new_gp_order ngo ON tcb.gp_index = ngo.old_gp_index
SET tcb.gp_index = ngo.new_gp_index + 9999;

UPDATE track_engineer_by_league teb
JOIN new_gp_order ngo ON teb.gp_index = ngo.old_gp_index
SET teb.gp_index = ngo.new_gp_index + 9999;

UPDATE chief_engineers_by_league ceb
JOIN new_gp_order ngo ON ceb.gp_index = ngo.old_gp_index
SET ceb.gp_index = ngo.new_gp_index + 9999;

-- PASO 3: Asignar valores finales correctos
UPDATE f1_grand_prixes SET gp_index = gp_index - 9999;
UPDATE lineups SET gp_index = gp_index - 9999;
UPDATE pilot_races SET gp_index = gp_index - 9999;
UPDATE pilot_qualies SET gp_index = gp_index - 9999;
UPDATE pilot_practices SET gp_index = gp_index - 9999;
UPDATE team_races SET gp_index = gp_index - 9999;
UPDATE teamconstructor SET gp_index = gp_index - 9999;
UPDATE teamconstructor_by_league SET gp_index = gp_index - 9999;
UPDATE track_engineer_by_league SET gp_index = gp_index - 9999;
UPDATE chief_engineers_by_league SET gp_index = gp_index - 9999;

-- PASO 4: Verificar resultado final
SELECT 
    gp_index,
    name,
    start_date,
    country
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- PASO 5: Limpiar tabla temporal
DROP TEMPORARY TABLE new_gp_order; 