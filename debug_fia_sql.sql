-- Script SQL para debuggear ofertas de la FIA
-- Ejecutar en la base de datos para verificar el estado

-- 1. Verificar pilotos en venta sin ofertas de la FIA
SELECT 
    pbl.id,
    p.driver_name,
    pbl.venta,
    pbl.venta_expires_at,
    pbl.league_offer_value,
    pbl.league_offer_expires_at,
    pbl.owner_id,
    pbl.league_id
FROM pilot_by_leagues pbl
JOIN pilots p ON pbl.pilot_id = p.id
WHERE pbl.venta IS NOT NULL 
    AND pbl.venta_expires_at > NOW()
    AND pbl.league_offer_value IS NULL
ORDER BY pbl.league_id, p.driver_name;

-- 2. Verificar pilotos con ofertas de la FIA
SELECT 
    pbl.id,
    p.driver_name,
    pbl.venta,
    pbl.league_offer_value,
    pbl.league_offer_expires_at,
    pbl.owner_id,
    pbl.league_id
FROM pilot_by_leagues pbl
JOIN pilots p ON pbl.pilot_id = p.id
WHERE pbl.league_offer_value IS NOT NULL
ORDER BY pbl.league_id, p.driver_name;

-- 3. Verificar track engineers en venta sin ofertas de la FIA
SELECT 
    teb.id,
    te.name,
    teb.venta,
    teb.venta_expires_at,
    teb.league_offer_value,
    teb.league_offer_expires_at,
    teb.owner_id,
    teb.league_id
FROM track_engineer_by_league teb
JOIN track_engineers te ON teb.track_engineer_id = te.id
WHERE teb.venta IS NOT NULL 
    AND teb.venta_expires_at > NOW()
    AND teb.league_offer_value IS NULL
ORDER BY teb.league_id, te.name;

-- 4. Verificar track engineers con ofertas de la FIA
SELECT 
    teb.id,
    te.name,
    teb.venta,
    teb.league_offer_value,
    teb.league_offer_expires_at,
    teb.owner_id,
    teb.league_id
FROM track_engineer_by_league teb
JOIN track_engineers te ON teb.track_engineer_id = te.id
WHERE teb.league_offer_value IS NOT NULL
ORDER BY teb.league_id, te.name;

-- 5. Verificar chief engineers en venta sin ofertas de la FIA
SELECT 
    ceb.id,
    ce.name,
    ceb.venta,
    ceb.venta_expires_at,
    ceb.league_offer_value,
    ceb.league_offer_expires_at,
    ceb.owner_id,
    ceb.league_id
FROM chief_engineers_by_league ceb
JOIN chief_engineers ce ON ceb.chief_engineer_id = ce.id
WHERE ceb.venta IS NOT NULL 
    AND ceb.venta_expires_at > NOW()
    AND ceb.league_offer_value IS NULL
ORDER BY ceb.league_id, ce.name;

-- 6. Verificar chief engineers con ofertas de la FIA
SELECT 
    ceb.id,
    ce.name,
    ceb.venta,
    ceb.league_offer_value,
    ceb.league_offer_expires_at,
    ceb.owner_id,
    ceb.league_id
FROM chief_engineers_by_league ceb
JOIN chief_engineers ce ON ceb.chief_engineer_id = ce.id
WHERE ceb.league_offer_value IS NOT NULL
ORDER BY ceb.league_id, ce.name;

-- 7. Verificar team constructors en venta sin ofertas de la FIA
SELECT 
    tcb.id,
    tc.name,
    tcb.venta,
    tcb.venta_expires_at,
    tcb.league_offer_value,
    tcb.league_offer_expires_at,
    tcb.owner_id,
    tcb.league_id
FROM teamconstructor_by_league tcb
JOIN teamconstructor tc ON tcb.teamconstructor_id = tc.id
WHERE tcb.venta IS NOT NULL 
    AND tcb.venta_expires_at > NOW()
    AND tcb.league_offer_value IS NULL
ORDER BY tcb.league_id, tc.name;

-- 8. Verificar team constructors con ofertas de la FIA
SELECT 
    tcb.id,
    tc.name,
    tcb.venta,
    tcb.league_offer_value,
    tcb.league_offer_expires_at,
    tcb.owner_id,
    tcb.league_id
FROM teamconstructor_by_league tcb
JOIN teamconstructor tc ON tcb.teamconstructor_id = tc.id
WHERE tcb.league_offer_value IS NOT NULL
ORDER BY tcb.league_id, tc.name;

-- 9. Resumen de ofertas de la FIA por liga
SELECT 
    pbl.league_id,
    COUNT(CASE WHEN pbl.league_offer_value IS NOT NULL THEN 1 END) as pilotos_con_oferta_fia,
    COUNT(CASE WHEN pbl.league_offer_value IS NULL AND pbl.venta IS NOT NULL THEN 1 END) as pilotos_sin_oferta_fia
FROM pilot_by_leagues pbl
WHERE pbl.venta IS NOT NULL AND pbl.venta_expires_at > NOW()
GROUP BY pbl.league_id;

-- 10. Verificar usuarios admin
SELECT 
    id,
    username,
    email,
    is_admin
FROM players 
WHERE is_admin = true; 