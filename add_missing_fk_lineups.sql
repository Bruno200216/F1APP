-- Agregar foreign keys faltantes a la tabla lineups

-- 1. Foreign key para gp_index que referencia a grand_prix
ALTER TABLE `lineups` 
ADD CONSTRAINT `fk_lineups_grand_prix` 
FOREIGN KEY (`gp_index`) REFERENCES `grand_prix` (`gp_index`);

-- 2. Foreign key para team_constructor_id que referencia a team_constructors
ALTER TABLE `lineups` 
ADD CONSTRAINT `fk_lineups_team_constructor` 
FOREIGN KEY (`team_constructor_id`) REFERENCES `team_constructors` (`id`);

-- 3. Foreign key para chief_engineer_id que referencia a chief_engineers
ALTER TABLE `lineups` 
ADD CONSTRAINT `fk_lineups_chief_engineer` 
FOREIGN KEY (`chief_engineer_id`) REFERENCES `chief_engineers` (`id`);

-- 4. Crear índices compuestos para optimizar consultas comunes
CREATE INDEX `idx_lineups_player_league_gp` ON `lineups` (`player_id`, `league_id`, `gp_index`);
CREATE INDEX `idx_lineups_league_gp` ON `lineups` (`league_id`, `gp_index`);

-- 5. Crear índice para lineup_points para optimizar ordenamiento
CREATE INDEX `idx_lineups_points` ON `lineups` (`lineup_points`);

-- Verificar que todas las foreign keys se crearon correctamente
-- SELECT 
--     CONSTRAINT_NAME,
--     TABLE_NAME,
--     COLUMN_NAME,
--     REFERENCED_TABLE_NAME,
--     REFERENCED_COLUMN_NAME
-- FROM information_schema.KEY_COLUMN_USAGE 
-- WHERE TABLE_SCHEMA = 'f1_fantasy_db' 
-- AND TABLE_NAME = 'lineups' 
-- AND REFERENCED_TABLE_NAME IS NOT NULL; 