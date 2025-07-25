-- =====================================================
-- AGREGAR COLUMNA is_admin A LA TABLA players
-- =====================================================

-- Agregar la columna is_admin como booleano (TINYINT(1))
ALTER TABLE `players` 
ADD COLUMN `is_admin` TINYINT(1) DEFAULT 0 COMMENT '1 si es admin, 0 si no lo es';

-- Crear un índice para mejorar el rendimiento de consultas por admin
ALTER TABLE `players` 
ADD INDEX `idx_is_admin` (`is_admin`);

-- Verificar la nueva estructura
DESCRIBE `players`;

-- Mostrar algunos ejemplos de uso:
-- SELECT * FROM players WHERE is_admin = 1; -- Obtener todos los admins
-- SELECT * FROM players WHERE is_admin = 0; -- Obtener todos los usuarios normales
-- UPDATE players SET is_admin = 1 WHERE id = 1; -- Hacer admin a un usuario específico 