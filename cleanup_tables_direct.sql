-- =====================================================
-- SCRIPT DIRECTO: Limpiar registros con ID > 40
-- =====================================================

-- 1. Verificar registros antes de borrar
SELECT 'pilot_races' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_practices;

-- 2. Mostrar registros que se van a borrar
SELECT 'pilot_races' as table_name, id, pilot_id, gp_index, finish_position FROM pilot_races WHERE id > 40
UNION ALL
SELECT 'pilot_qualies' as table_name, id, pilot_id, gp_index, finish_position FROM pilot_qualies WHERE id > 40
UNION ALL
SELECT 'pilot_practices' as table_name, id, pilot_id, gp_index, finish_position FROM pilot_practices WHERE id > 40
ORDER BY table_name, id;

-- 3. BORRAR REGISTROS (ejecutar cada DELETE por separado)
DELETE FROM pilot_races WHERE id > 40;

DELETE FROM pilot_qualies WHERE id > 40;

DELETE FROM pilot_practices WHERE id > 40;

-- 4. Verificar registros después de borrar
SELECT 'pilot_races' as table_name, COUNT(*) as remaining_records FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, COUNT(*) as remaining_records FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, COUNT(*) as remaining_records FROM pilot_practices;

-- 5. Verificar que no quedan registros con ID > 40
SELECT 'pilot_races' as table_name, MAX(id) as max_id FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, MAX(id) as max_id FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, MAX(id) as max_id FROM pilot_practices; 