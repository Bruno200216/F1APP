-- =====================================================
-- LIMPIEZA DE TABLAS: Borrar registros con ID > 40
-- =====================================================

-- 1. Verificar registros antes de borrar
SELECT 'pilot_races' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_practices;

-- 2. Borrar registros con ID > 40 de pilot_races
DELETE FROM pilot_races WHERE id > 40;

-- 3. Borrar registros con ID > 40 de pilot_qualies
DELETE FROM pilot_qualies WHERE id > 40;

-- 4. Borrar registros con ID > 40 de pilot_practices
DELETE FROM pilot_practices WHERE id > 40;

-- 5. Verificar registros después de borrar
SELECT 'pilot_races' as table_name, COUNT(*) as remaining_records FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, COUNT(*) as remaining_records FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, COUNT(*) as remaining_records FROM pilot_practices;

-- 6. Verificar que no quedan registros con ID > 40
SELECT 'pilot_races' as table_name, MAX(id) as max_id FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, MAX(id) as max_id FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, MAX(id) as max_id FROM pilot_practices; 