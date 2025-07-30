-- Script para limpiar pujas antiguas de la FIA
-- Ejecutar después de finalizar las subastas

-- Limpiar pujas de la FIA en pilotos
UPDATE pilot_by_league 
SET bids = '[]' 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}');

-- Limpiar pujas de la FIA en track engineers
UPDATE track_engineer_by_league 
SET bids = '[]' 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}');

-- Limpiar pujas de la FIA en chief engineers
UPDATE chief_engineer_by_league 
SET bids = '[]' 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}');

-- Limpiar pujas de la FIA en team constructors
UPDATE team_constructor_by_league 
SET bids = '[]' 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}');

-- Verificar que se limpiaron correctamente
SELECT 'Pilotos con pujas FIA' as tipo, COUNT(*) as cantidad
FROM pilot_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}')
UNION ALL
SELECT 'Track Engineers con pujas FIA' as tipo, COUNT(*) as cantidad
FROM track_engineer_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}')
UNION ALL
SELECT 'Chief Engineers con pujas FIA' as tipo, COUNT(*) as cantidad
FROM chief_engineer_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}')
UNION ALL
SELECT 'Team Constructors con pujas FIA' as tipo, COUNT(*) as cantidad
FROM team_constructor_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}'); 