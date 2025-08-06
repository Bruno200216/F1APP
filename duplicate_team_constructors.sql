-- Script para duplicar team constructors existentes para todos los GPs
-- Este script toma los equipos existentes del GP 1 y los duplica para todos los demás GPs

-- Primero, verificar qué GPs existen
SELECT 'GPs existentes:' as info;
SELECT gp_index, name FROM grand_prix ORDER BY gp_index;

-- Verificar qué team constructors existen actualmente
SELECT 'Team Constructors actuales por GP:' as info;
SELECT gp_index, COUNT(*) as count FROM teamconstructor GROUP BY gp_index ORDER BY gp_index;

-- Duplicar team constructors del GP 1 para todos los demás GPs
INSERT INTO teamconstructor (name, value, gp_index, finish_pilots, image_url, created_at, updated_at)
SELECT 
    tc.name,
    tc.value,
    gp.gp_index,
    tc.finish_pilots,
    tc.image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM teamconstructor tc
CROSS JOIN grand_prix gp
WHERE tc.gp_index = 1 
  AND gp.gp_index > 1
  AND NOT EXISTS (
    SELECT 1 FROM teamconstructor existing 
    WHERE existing.name = tc.name AND existing.gp_index = gp.gp_index
  );

-- Verificar el resultado
SELECT 'Team Constructors después de la duplicación:' as info;
SELECT gp_index, COUNT(*) as count FROM teamconstructor GROUP BY gp_index ORDER BY gp_index;

-- Mostrar algunos ejemplos
SELECT 'Ejemplos de team constructors por GP:' as info;
SELECT name, gp_index, value FROM teamconstructor ORDER BY gp_index, name LIMIT 30; 