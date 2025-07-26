-- Script para actualizar campos de cláusula en todas las tablas
-- Cambiar clausula_expires_at por clausulatime para mantener consistencia

-- Actualizar tabla track_engineer_by_league
ALTER TABLE track_engineer_by_league 
CHANGE COLUMN clausula_expires_at clausulatime datetime(3) DEFAULT NULL;

-- Actualizar tabla chief_engineers_by_league  
ALTER TABLE chief_engineers_by_league 
CHANGE COLUMN clausula_expires_at clausulatime datetime(3) DEFAULT NULL;

-- Actualizar tabla teamconstructor_by_league
ALTER TABLE teamconstructor_by_league 
CHANGE COLUMN clausula_expires_at clausulatime datetime(3) DEFAULT NULL;

-- Comentario: Ahora todas las tablas usan clausulatime y clausula_value de forma consistente 