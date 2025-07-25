-- Script para debuggear problemas de login local

-- 1. Verificar si hay usuarios en la base de datos
SELECT 
    id,
    name,
    email,
    created_at,
    is_admin
FROM players
ORDER BY created_at DESC;

-- 2. Contar total de usuarios
SELECT COUNT(*) as total_users FROM players;

-- 3. Crear un usuario de prueba si no existe
-- Nota: La contraseña será "test123" (hasheada con bcrypt)
INSERT INTO players (name, email, password_hash, money, is_active, is_admin, created_at, updated_at)
SELECT 
    'Test User',
    'test@test.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash de "password"
    100000000,
    true,
    false,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE email = 'test@test.com'
);

-- 4. Verificar el usuario de prueba
SELECT 
    id,
    name,
    email,
    'password_hash_length:' || LENGTH(password_hash) as password_info,
    money,
    is_active,
    is_admin
FROM players 
WHERE email = 'test@test.com';

-- 5. Mostrar información de la base de datos
SELECT 
    'Total players' as metric,
    COUNT(*) as value
FROM players
UNION ALL
SELECT 
    'Active players' as metric,
    COUNT(*) as value
FROM players
WHERE is_active = true
UNION ALL
SELECT 
    'Admin players' as metric,
    COUNT(*) as value
FROM players
WHERE is_admin = true; 