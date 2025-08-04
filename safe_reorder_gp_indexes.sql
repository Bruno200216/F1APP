-- Script para reordenar gp_index de forma segura
-- Preserva todos los datos existentes

-- 1. Crear tabla temporal con el nuevo orden deseado
CREATE TEMPORARY TABLE new_gp_order AS
SELECT 
    gp_index as old_gp_index,
    name,
    start_date,
    circuit,
    country,
    flag,
    ROW_NUMBER() OVER (ORDER BY start_date ASC) as new_gp_index
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- 2. Mostrar el mapeo propuesto
SELECT 
    old_gp_index,
    new_gp_index,
    name,
    start_date,
    country
FROM new_gp_order
ORDER BY new_gp_index;

-- 3. Crear tabla temporal para almacenar los datos actuales
CREATE TEMPORARY TABLE temp_lineups AS SELECT * FROM lineups;
CREATE TEMPORARY TABLE temp_pilot_races AS SELECT * FROM pilot_races;
CREATE TEMPORARY TABLE temp_pilot_qualies AS SELECT * FROM pilot_qualies;
CREATE TEMPORARY TABLE temp_pilot_practices AS SELECT * FROM pilot_practices;
CREATE TEMPORARY TABLE temp_team_constructor_races AS SELECT * FROM team_constructor_races;
CREATE TEMPORARY TABLE temp_chief_engineer_races AS SELECT * FROM chief_engineer_races;
CREATE TEMPORARY TABLE temp_track_engineer_races AS SELECT * FROM track_engineer_races;

-- 4. Actualizar lineups con los nuevos índices
UPDATE lineups l
JOIN new_gp_order ngo ON l.gp_index = ngo.old_gp_index
SET l.gp_index = ngo.new_gp_index;

-- 5. Actualizar pilot_races
UPDATE pilot_races pr
JOIN new_gp_order ngo ON pr.gp_index = ngo.old_gp_index
SET pr.gp_index = ngo.new_gp_index;

-- 6. Actualizar pilot_qualies
UPDATE pilot_qualies pq
JOIN new_gp_order ngo ON pq.gp_index = ngo.old_gp_index
SET pq.gp_index = ngo.new_gp_index;

-- 7. Actualizar pilot_practices
UPDATE pilot_practices pp
JOIN new_gp_order ngo ON pp.gp_index = ngo.old_gp_index
SET pp.gp_index = ngo.new_gp_index;

-- 8. Actualizar team_constructor_races
UPDATE team_constructor_races tcr
JOIN new_gp_order ngo ON tcr.gp_index = ngo.old_gp_index
SET tcr.gp_index = ngo.new_gp_index;

-- 9. Actualizar chief_engineer_races
UPDATE chief_engineer_races cer
JOIN new_gp_order ngo ON cer.gp_index = ngo.old_gp_index
SET cer.gp_index = ngo.new_gp_index;

-- 10. Actualizar track_engineer_races
UPDATE track_engineer_races ter
JOIN new_gp_order ngo ON ter.gp_index = ngo.old_gp_index
SET ter.gp_index = ngo.new_gp_index;

-- 11. Actualizar la tabla principal f1_grand_prixes
UPDATE f1_grand_prixes fgp
JOIN new_gp_order ngo ON fgp.gp_index = ngo.old_gp_index
SET fgp.gp_index = ngo.new_gp_index;

-- 12. Verificar el resultado final
SELECT 
    gp_index,
    name,
    start_date,
    country
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- 13. Limpiar tablas temporales
DROP TEMPORARY TABLE new_gp_order;
DROP TEMPORARY TABLE temp_lineups;
DROP TEMPORARY TABLE temp_pilot_races;
DROP TEMPORARY TABLE temp_pilot_qualies;
DROP TEMPORARY TABLE temp_pilot_practices;
DROP TEMPORARY TABLE temp_team_constructor_races;
DROP TEMPORARY TABLE temp_chief_engineer_races;
DROP TEMPORARY TABLE temp_track_engineer_races; 