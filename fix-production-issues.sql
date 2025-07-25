-- Script para arreglar problemas en producción
-- Ejecutar después de hacer deploy del código actualizado

-- 1. Agregar columna is_in_market faltante
ALTER TABLE market_items 
ADD COLUMN IF NOT EXISTS is_in_market BOOLEAN DEFAULT FALSE;

-- 2. Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_market_items_league_active_in_market 
ON market_items(league_id, is_active, is_in_market);

-- 3. Limpiar mercados que puedan estar en estado inconsistente
-- Resetear todos los mercados para que se recreen correctamente
UPDATE market_items SET is_in_market = FALSE;

-- 4. Verificar que todas las ligas tienen sus market_items
-- Esta consulta mostrará ligas que pueden tener problemas
SELECT 
    l.id as league_id,
    l.name as league_name,
    COUNT(mi.id) as market_items_count
FROM leagues l
LEFT JOIN market_items mi ON l.id = mi.league_id AND mi.is_active = true
GROUP BY l.id, l.name
HAVING COUNT(mi.id) = 0;

-- 5. Mostrar estadísticas de la base de datos después de la corrección
SELECT 
    'Ligas totales' as metric,
    COUNT(*) as value
FROM leagues
UNION ALL
SELECT 
    'PlayerByLeague registros' as metric,
    COUNT(*) as value
FROM player_by_league
UNION ALL
SELECT 
    'MarketItems activos' as metric,
    COUNT(*) as value
FROM market_items
WHERE is_active = true
UNION ALL
SELECT 
    'MarketItems en mercado' as metric,
    COUNT(*) as value
FROM market_items
WHERE is_in_market = true; 