-- =====================================================
-- SCRIPT SIMPLE: Limpiar registros con ID > 40
-- =====================================================

-- EJECUTAR ESTOS COMANDOS UNO POR UNO EN DBEAVER:

-- 1. Verificar registros antes de borrar
SELECT 'pilot_races' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_practices;

-- 2. BORRAR pilot_races (ejecutar este comando)
DELETE FROM pilot_races WHERE id > 40;

-- 3. BORRAR pilot_qualies (ejecutar este comando)
DELETE FROM pilot_qualies WHERE id > 40;

-- 4. BORRAR pilot_practices (ejecutar este comando)
DELETE FROM pilot_practices WHERE id > 40;

-- 5. Verificar que se borraron (ejecutar este comando)
SELECT 'pilot_races' as table_name, MAX(id) as max_id FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, MAX(id) as max_id FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, MAX(id) as max_id FROM pilot_practices; 