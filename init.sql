-- Archivo de inicialización de la base de datos
-- Este archivo se ejecuta automáticamente cuando se crea el contenedor de MySQL

-- Crear la base de datos si no existe (aunque docker-compose ya lo hace)
CREATE DATABASE IF NOT EXISTS f1fantasy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE f1fantasy;

-- Aquí puedes agregar las tablas iniciales o datos de prueba
-- Por ejemplo, si tienes archivos SQL de setup:
-- SOURCE /docker-entrypoint-initdb.d/complete_setup_2025.sql;

-- Mensaje de confirmación
SELECT 'Base de datos F1 Fantasy inicializada correctamente' as status; 