-- =====================================================
-- SCRIPT DE DEBUG: Verificar puntos en las tablas
-- =====================================================

-- 1. Verificar estructura de las tablas
DESCRIBE pilot_races;
DESCRIBE pilot_qualies;
DESCRIBE pilot_practices;

-- 2. Verificar registros recientes en pilot_races
SELECT 
    id, 
    pilot_id, 
    gp_index, 
    finish_position, 
    expected_position, 
    delta_position, 
    points,
    CASE 
        WHEN points IS NULL THEN '❌ PUNTOS NULL'
        ELSE '✅ PUNTOS OK'
    END as status
FROM pilot_races 
WHERE id > 40 
ORDER BY id DESC 
LIMIT 10;

-- 3. Verificar registros recientes en pilot_qualies
SELECT 
    id, 
    pilot_id, 
    gp_index, 
    finish_position, 
    expected_position, 
    delta_position, 
    points,
    CASE 
        WHEN points IS NULL THEN '❌ PUNTOS NULL'
        ELSE '✅ PUNTOS OK'
    END as status
FROM pilot_qualies 
WHERE id > 40 
ORDER BY id DESC 
LIMIT 10;

-- 4. Verificar registros recientes en pilot_practices
SELECT 
    id, 
    pilot_id, 
    gp_index, 
    finish_position, 
    expected_position, 
    delta_position, 
    points,
    CASE 
        WHEN points IS NULL THEN '❌ PUNTOS NULL'
        ELSE '✅ PUNTOS OK'
    END as status
FROM pilot_practices 
WHERE id > 40 
ORDER BY id DESC 
LIMIT 10;

-- 5. Contar registros con puntos NULL
SELECT 
    'pilot_races' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN points IS NULL THEN 1 END) as null_points,
    COUNT(CASE WHEN points IS NOT NULL THEN 1 END) as not_null_points
FROM pilot_races 
WHERE id > 40
UNION ALL
SELECT 
    'pilot_qualies' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN points IS NULL THEN 1 END) as null_points,
    COUNT(CASE WHEN points IS NOT NULL THEN 1 END) as not_null_points
FROM pilot_qualies 
WHERE id > 40
UNION ALL
SELECT 
    'pilot_practices' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN points IS NULL THEN 1 END) as null_points,
    COUNT(CASE WHEN points IS NOT NULL THEN 1 END) as not_null_points
FROM pilot_practices 
WHERE id > 40; 