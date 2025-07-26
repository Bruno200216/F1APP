-- Archivo de inicialización de la base de datos
-- Este archivo se ejecuta automáticamente cuando se crea el contenedor de MySQL

-- Configuración inicial
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS f1fantasy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE f1fantasy;

-- Ejecutar migración completa
SOURCE /docker-entrypoint-initdb.d/database-migration-complete.sql;

-- Habilitar verificaciones de foreign keys
SET FOREIGN_KEY_CHECKS = 1;

-- Mensaje de confirmación
SELECT 'Base de datos F1 Fantasy inicializada correctamente' as status; 