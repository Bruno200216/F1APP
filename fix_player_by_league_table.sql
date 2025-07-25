-- Recrear la tabla player_by_league con todas las columnas necesarias
DROP TABLE IF EXISTS player_by_league;

CREATE TABLE player_by_league (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    league_id BIGINT UNSIGNED NOT NULL,
    money DECIMAL(15,2) DEFAULT 100000000.00,
    team_value DECIMAL(15,2) DEFAULT 0.00,
    owned_pilots JSON DEFAULT '[]',
    owned_track_engineers JSON DEFAULT '[]',
    owned_chief_engineers JSON DEFAULT '[]',
    owned_team_constructors JSON DEFAULT '[]',
    points_by_gp JSON DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_player_league (player_id, league_id),
    INDEX idx_league (league_id),
    INDEX idx_player (player_id)
); 