-- Script para crear team constructors para todos los GPs si no existen
-- Este script verifica si hay team constructors para cada GP y los crea si no existen

-- Primero, verificar qué GPs existen
SELECT 'GPs existentes:' as info;
SELECT gp_index, name FROM grand_prix ORDER BY gp_index;

-- Verificar qué team constructors existen
SELECT 'Team Constructors existentes:' as info;
SELECT gp_index, COUNT(*) as count FROM teamconstructor GROUP BY gp_index ORDER BY gp_index;

-- Crear team constructors para cada GP si no existen
-- Lista de equipos F1 2025
INSERT INTO teamconstructor (name, value, gp_index, image_url, created_at, updated_at)
SELECT 
    'Red Bull Racing' as name,
    50000000 as value,
    gp.gp_index,
    '/images/equipos/Red_Bull_Racing.png' as image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM grand_prix gp
WHERE NOT EXISTS (
    SELECT 1 FROM teamconstructor tc 
    WHERE tc.name = 'Red Bull Racing' AND tc.gp_index = gp.gp_index
);

INSERT INTO teamconstructor (name, value, gp_index, image_url, created_at, updated_at)
SELECT 
    'Ferrari' as name,
    45000000 as value,
    gp.gp_index,
    '/images/equipos/Ferrari.png' as image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM grand_prix gp
WHERE NOT EXISTS (
    SELECT 1 FROM teamconstructor tc 
    WHERE tc.name = 'Ferrari' AND tc.gp_index = gp.gp_index
);

INSERT INTO teamconstructor (name, value, gp_index, image_url, created_at, updated_at)
SELECT 
    'McLaren' as name,
    40000000 as value,
    gp.gp_index,
    '/images/equipos/Mclaren.png' as image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM grand_prix gp
WHERE NOT EXISTS (
    SELECT 1 FROM teamconstructor tc 
    WHERE tc.name = 'McLaren' AND tc.gp_index = gp.gp_index
);

INSERT INTO teamconstructor (name, value, gp_index, image_url, created_at, updated_at)
SELECT 
    'Mercedes' as name,
    38000000 as value,
    gp.gp_index,
    '/images/equipos/Mercedes.png' as image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM grand_prix gp
WHERE NOT EXISTS (
    SELECT 1 FROM teamconstructor tc 
    WHERE tc.name = 'Mercedes' AND tc.gp_index = gp.gp_index
);

INSERT INTO teamconstructor (name, value, gp_index, image_url, created_at, updated_at)
SELECT 
    'Aston Martin' as name,
    35000000 as value,
    gp.gp_index,
    '/images/equipos/Aston_Martin.png' as image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM grand_prix gp
WHERE NOT EXISTS (
    SELECT 1 FROM teamconstructor tc 
    WHERE tc.name = 'Aston Martin' AND tc.gp_index = gp.gp_index
);

INSERT INTO teamconstructor (name, value, gp_index, image_url, created_at, updated_at)
SELECT 
    'Alpine' as name,
    32000000 as value,
    gp.gp_index,
    '/images/equipos/Alpine.png' as image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM grand_prix gp
WHERE NOT EXISTS (
    SELECT 1 FROM teamconstructor tc 
    WHERE tc.name = 'Alpine' AND tc.gp_index = gp.gp_index
);

INSERT INTO teamconstructor (name, value, gp_index, image_url, created_at, updated_at)
SELECT 
    'Visa Cash App RB' as name,
    30000000 as value,
    gp.gp_index,
    '/images/equipos/Visa_Cash_App_RB.png' as image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM grand_prix gp
WHERE NOT EXISTS (
    SELECT 1 FROM teamconstructor tc 
    WHERE tc.name = 'Visa Cash App RB' AND tc.gp_index = gp.gp_index
);

INSERT INTO teamconstructor (name, value, gp_index, image_url, created_at, updated_at)
SELECT 
    'Stake F1 Team Kick Sauber' as name,
    28000000 as value,
    gp.gp_index,
    '/images/equipos/Stake_F1_Team_Kick_Sauber.png' as image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM grand_prix gp
WHERE NOT EXISTS (
    SELECT 1 FROM teamconstructor tc 
    WHERE tc.name = 'Stake F1 Team Kick Sauber' AND tc.gp_index = gp.gp_index
);

INSERT INTO teamconstructor (name, value, gp_index, image_url, created_at, updated_at)
SELECT 
    'Haas' as name,
    25000000 as value,
    gp.gp_index,
    '/images/equipos/Haas.png' as image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM grand_prix gp
WHERE NOT EXISTS (
    SELECT 1 FROM teamconstructor tc 
    WHERE tc.name = 'Haas' AND tc.gp_index = gp.gp_index
);

INSERT INTO teamconstructor (name, value, gp_index, image_url, created_at, updated_at)
SELECT 
    'Williams' as name,
    22000000 as value,
    gp.gp_index,
    '/images/equipos/Williams.png' as image_url,
    NOW() as created_at,
    NOW() as updated_at
FROM grand_prix gp
WHERE NOT EXISTS (
    SELECT 1 FROM teamconstructor tc 
    WHERE tc.name = 'Williams' AND tc.gp_index = gp.gp_index
);

-- Verificar el resultado
SELECT 'Team Constructors después de la inserción:' as info;
SELECT gp_index, COUNT(*) as count FROM teamconstructor GROUP BY gp_index ORDER BY gp_index;

-- Mostrar algunos ejemplos
SELECT 'Ejemplos de team constructors creados:' as info;
SELECT name, gp_index, value FROM teamconstructor ORDER BY gp_index, name LIMIT 20; 