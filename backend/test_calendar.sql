-- Script para verificar que el calendario F1 se inicializó correctamente
-- Ejecutar después de iniciar el backend

-- Verificar que hay datos en la tabla
SELECT 'Total GPs en la tabla:' as info, COUNT(*) as count FROM f1_grand_prixes;

-- Mostrar todos los GPs ordenados por fecha
SELECT 
    gp_index,
    name,
    DATE(date) as race_date,
    DATE(start_date) as start_date,
    circuit,
    country,
    flag
FROM f1_grand_prixes 
ORDER BY date ASC;

-- Verificar GPs con Sprint (deberían tener start_date 2 días antes)
SELECT 
    gp_index,
    name,
    DATE(date) as race_date,
    DATE(start_date) as start_date,
    DATEDIFF(date, start_date) as days_before_race,
    CASE 
        WHEN DATEDIFF(date, start_date) = 2 THEN 'Sprint (Practice 1)'
        WHEN DATEDIFF(date, start_date) = 1 THEN 'Normal (Practice 3)'
        ELSE 'Verificar'
    END as sprint_type
FROM f1_grand_prixes 
ORDER BY date ASC;

-- Verificar que las fechas start_date son correctas para alineaciones
-- Los GPs con Sprint deben tener start_date 2 días antes (Practice 1)
-- Los GPs sin Sprint deben tener start_date 1 día antes (Practice 3)
SELECT 
    name,
    DATE(date) as race_date,
    DATE(start_date) as start_date,
    TIME(start_date) as start_time,
    CASE 
        WHEN DATEDIFF(date, start_date) = 2 THEN '✅ Sprint - Practice 1'
        WHEN DATEDIFF(date, start_date) = 1 THEN '✅ Normal - Practice 3'
        ELSE '❌ Verificar'
    END as validation
FROM f1_grand_prixes 
ORDER BY date ASC; 