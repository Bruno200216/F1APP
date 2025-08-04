-- Script FINAL para reordenar gp_index de forma segura
-- Usando SOLO las tablas que realmente existen en la base de datos

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

-- 3. Actualizar lineups con los nuevos índices
UPDATE lineups l
JOIN new_gp_order ngo ON l.gp_index = ngo.old_gp_index
SET l.gp_index = ngo.new_gp_index;

-- 4. Actualizar pilot_races
UPDATE pilot_races pr
JOIN new_gp_order ngo ON pr.gp_index = ngo.old_gp_index
SET pr.gp_index = ngo.new_gp_index;

-- 5. Actualizar pilot_qualies
UPDATE pilot_qualies pq
JOIN new_gp_order ngo ON pq.gp_index = ngo.old_gp_index
SET pq.gp_index = ngo.new_gp_index;

-- 6. Actualizar pilot_practices
UPDATE pilot_practices pp
JOIN new_gp_order ngo ON pp.gp_index = ngo.old_gp_index
SET pp.gp_index = ngo.new_gp_index;

-- 7. Actualizar team_races
UPDATE team_races tr
JOIN new_gp_order ngo ON tr.gp_index = ngo.old_gp_index
SET tr.gp_index = ngo.new_gp_index;

-- 8. Actualizar la tabla principal f1_grand_prixes
UPDATE f1_grand_prixes fgp
JOIN new_gp_order ngo ON fgp.gp_index = ngo.old_gp_index
SET fgp.gp_index = ngo.new_gp_index;

-- 9. Verificar el resultado final
SELECT 
    gp_index,
    name,
    start_date,
    country
FROM f1_grand_prixes 
ORDER BY start_date ASC;

-- 10. Limpiar tabla temporal
DROP TEMPORARY TABLE new_gp_order; 