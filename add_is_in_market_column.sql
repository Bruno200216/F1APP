-- Agregar columna is_in_market a la tabla market_items
-- Esta columna se necesita para el nuevo sistema de mercado

ALTER TABLE market_items 
ADD COLUMN IF NOT EXISTS is_in_market BOOLEAN DEFAULT FALSE;

-- Actualizar índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_market_items_league_active_in_market 
ON market_items(league_id, is_active, is_in_market);

-- Comentario: Esta migración es necesaria porque el código nuevo usa is_in_market
-- para determinar qué elementos están actualmente en el mercado de una liga 