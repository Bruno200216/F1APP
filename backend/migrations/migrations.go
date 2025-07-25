package migrations

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

// Migration representa una migración de base de datos
type Migration struct {
	ID        int
	Name      string
	SQL       string
	CreatedAt time.Time
}

// MigrationsList contiene todas las migraciones en orden
var MigrationsList = []Migration{
	{
		ID:   1,
		Name: "Create migrations table",
		SQL: `
			CREATE TABLE IF NOT EXISTS migrations (
				id INT AUTO_INCREMENT PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`,
	},
	{
		ID:   2,
		Name: "Add points_by_gp column to player_by_league",
		SQL: `
			ALTER TABLE player_by_league 
			ADD COLUMN IF NOT EXISTS points_by_gp JSON;
		`,
	},
	{
		ID:   3,
		Name: "Add is_admin column to players",
		SQL: `
			ALTER TABLE players 
			ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
		`,
	},
	{
		ID:   4,
		Name: "Add is_in_market column to market_items",
		SQL: `
			ALTER TABLE market_items 
			ADD COLUMN IF NOT EXISTS is_in_market BOOLEAN DEFAULT FALSE;
		`,
	},
	{
		ID:   5,
		Name: "Add start_date column to grand_prix",
		SQL: `
			ALTER TABLE grand_prix 
			ADD COLUMN IF NOT EXISTS start_date TIMESTAMP NULL;
		`,
	},
	{
		ID:   6,
		Name: "Fix player_by_league table structure",
		SQL: `
			DROP TABLE IF EXISTS player_by_league;
			CREATE TABLE player_by_league (
				id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				player_id BIGINT UNSIGNED NOT NULL,
				league_id BIGINT UNSIGNED NOT NULL,
				money DECIMAL(15,2) DEFAULT 100000000.00,
				team_value DECIMAL(15,2) DEFAULT 0.00,
				owned_pilots JSON,
				owned_track_engineers JSON,
				owned_chief_engineers JSON,
				owned_team_constructors JSON,
				points_by_gp JSON,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				INDEX idx_player_league (player_id, league_id),
				INDEX idx_league (league_id),
				INDEX idx_player (player_id)
			);
		`,
	},
	// Agregar aquí nuevas migraciones cuando hagas cambios
}

// RunMigrations ejecuta todas las migraciones pendientes
func RunMigrations(db *sql.DB) error {
	log.Println("[MIGRATIONS] Iniciando migraciones de base de datos...")

	// Crear tabla de migraciones si no existe
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS migrations (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return fmt.Errorf("error creando tabla de migraciones: %v", err)
	}

	// Obtener migraciones ya ejecutadas
	executedMigrations := make(map[int]bool)
	rows, err := db.Query("SELECT id FROM migrations")
	if err != nil {
		return fmt.Errorf("error consultando migraciones ejecutadas: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return fmt.Errorf("error escaneando migración: %v", err)
		}
		executedMigrations[id] = true
	}

	// Ejecutar migraciones pendientes
	for _, migration := range MigrationsList {
		if !executedMigrations[migration.ID] {
			log.Printf("[MIGRATIONS] Ejecutando migración %d: %s", migration.ID, migration.Name)

			// Ejecutar la migración
			_, err := db.Exec(migration.SQL)
			if err != nil {
				return fmt.Errorf("error ejecutando migración %d (%s): %v", migration.ID, migration.Name, err)
			}

			// Registrar la migración como ejecutada
			_, err = db.Exec("INSERT INTO migrations (id, name) VALUES (?, ?)", migration.ID, migration.Name)
			if err != nil {
				return fmt.Errorf("error registrando migración %d: %v", migration.ID, err)
			}

			log.Printf("[MIGRATIONS] ✅ Migración %d completada: %s", migration.ID, migration.Name)
		} else {
			log.Printf("[MIGRATIONS] ⏭️ Migración %d ya ejecutada: %s", migration.ID, migration.Name)
		}
	}

	log.Println("[MIGRATIONS] ✅ Todas las migraciones completadas")
	return nil
}

// LogAvailableMigrations registra las migraciones disponibles sin ejecutarlas
func LogAvailableMigrations() {
	log.Println("[MIGRATIONS] Migraciones disponibles en el sistema:")
	for _, migration := range MigrationsList {
		log.Printf("[MIGRATIONS] 📋 ID: %d - %s", migration.ID, migration.Name)
	}
	log.Printf("[MIGRATIONS] Total: %d migraciones disponibles", len(MigrationsList))
}

// AddMigration agrega una nueva migración a la lista
func AddMigration(id int, name, sql string) {
	MigrationsList = append(MigrationsList, Migration{
		ID:   id,
		Name: name,
		SQL:  sql,
	})
}
