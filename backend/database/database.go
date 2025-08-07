package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"f1-fantasy-app/models"

	_ "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// createDatabaseIfNotExists crea la base de datos si no existe
func createDatabaseIfNotExists() {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
	)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Error conectando a MySQL para crear la base de datos: ", err)
	}
	defer db.Close()

	// Verificar conexión
	err = db.Ping()
	if err != nil {
		log.Fatal("Error haciendo ping a MySQL: ", err)
	}

	_, err = db.Exec("CREATE DATABASE IF NOT EXISTS " + os.Getenv("DB_NAME") + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
	if err != nil {
		log.Fatal("Error creando la base de datos: ", err)
	}
}

// Connect establece la conexión con la base de datos
func Connect() {
	// DEBUG: Imprimir variables de entorno antes de conectar
	fmt.Println("DB_HOST:", os.Getenv("DB_HOST"))
	fmt.Println("DB_PORT:", os.Getenv("DB_PORT"))
	fmt.Println("DB_USER:", os.Getenv("DB_USER"))
	fmt.Println("DB_PASSWORD:", os.Getenv("DB_PASSWORD"))
	fmt.Println("DB_NAME:", os.Getenv("DB_NAME"))
	createDatabaseIfNotExists()
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Error conectando a la base de datos: ", err)
	}

	log.Println("Conexión a la base de datos establecida")
}

// GetSQLDB obtiene la conexión SQL subyacente para migraciones
func GetSQLDB() *sql.DB {
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("Error obteniendo conexión SQL: ", err)
	}
	return sqlDB
}

// Migrate ejecuta las migraciones de la base de datos
func Migrate() {
	// Solo migrar GrandPrix que es la tabla que necesita ser repoblada
	err := DB.AutoMigrate(&models.GrandPrix{})
	if err != nil {
		log.Fatal("Error ejecutando migraciones de GrandPrix: ", err)
	}

	// Verificar si las demás tablas existen y crearlas solo si no existen
	tables := []interface{}{
		&models.Player{},
		&models.Pilot{},
		&models.League{},
		&models.PilotByLeague{},
		&models.PlayerByLeague{},
		&models.TrackEngineer{},
		&models.ChiefEngineer{},
		&models.TrackEngineerByLeague{},
		&models.ChiefEngineerByLeague{},
		&models.TeamConstructor{},
		&models.TeamConstructorByLeague{},
		&models.TeamRace{},
		&models.TrackEngineerPoints{},
		&models.MarketItem{},
		&models.Lineup{},
	}

	for _, table := range tables {
		// Verificar si la tabla existe
		tableName := DB.Model(table).Statement.Table
		var exists bool
		DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
			os.Getenv("DB_NAME"), tableName).Scan(&exists)

		// Solo migrar si la tabla no existe
		if !exists {
			log.Printf("Creando tabla %s...", tableName)
			if err := DB.AutoMigrate(table); err != nil {
				log.Printf("Error creando tabla %s: %v", tableName, err)
			}
		}
	}

	// Migración específica para player_by_league
	MigratePlayerByLeague()

	// Migración específica para track_engineer_points
	MigrateTrackEngineerPoints()

	// Migración específica para finish_cars en team_races
	MigrateTeamRacesFinishCars()

	log.Println("Migraciones completadas")
}

// SeedDatabase pobla la base de datos con datos iniciales
func SeedDatabase() {
	// Aquí puedes poblar la base de datos con jugadores o pilotos si lo necesitas
	log.Println("SeedDatabase: solo Player y Pilot")
}

// MigratePlayerByLeague migra específicamente la tabla player_by_league
func MigratePlayerByLeague() {
	log.Println("Migrando tabla player_by_league...")

	// Primero intentar migrar automáticamente
	err := DB.AutoMigrate(&models.PlayerByLeague{})
	if err != nil {
		log.Printf("Error en AutoMigrate de PlayerByLeague: %v", err)
	}

	// Verificar si la tabla existe y tiene la estructura correcta
	var tableExists bool
	DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
		os.Getenv("DB_NAME"), "player_by_league").Scan(&tableExists)

	if tableExists {
		// Verificar si las columnas necesarias existen
		var columns []string
		DB.Raw("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = ?",
			os.Getenv("DB_NAME"), "player_by_league").Scan(&columns)

		requiredColumns := map[string]bool{
			"money":                   false,
			"team_value":              false,
			"owned_pilots":            false,
			"owned_track_engineers":   false,
			"owned_chief_engineers":   false,
			"owned_team_constructors": false,
			"totalpoints":             false,
		}

		// Marcar las columnas que existen
		for _, col := range columns {
			if _, exists := requiredColumns[col]; exists {
				requiredColumns[col] = true
			}
		}

		// Agregar las columnas que faltan
		for col, exists := range requiredColumns {
			if !exists {
				log.Printf("Agregando columna faltante: %s", col)
				var alterSQL string
				switch col {
				case "money":
					alterSQL = "ALTER TABLE player_by_league ADD COLUMN money DECIMAL(12,2) DEFAULT 100000000.00"
				case "team_value":
					alterSQL = "ALTER TABLE player_by_league ADD COLUMN team_value DECIMAL(12,2) DEFAULT 0.00"
				case "owned_pilots":
					alterSQL = "ALTER TABLE player_by_league ADD COLUMN owned_pilots JSON DEFAULT NULL"
				case "owned_track_engineers":
					alterSQL = "ALTER TABLE player_by_league ADD COLUMN owned_track_engineers JSON DEFAULT NULL"
				case "owned_chief_engineers":
					alterSQL = "ALTER TABLE player_by_league ADD COLUMN owned_chief_engineers JSON DEFAULT NULL"
				case "owned_team_constructors":
					alterSQL = "ALTER TABLE player_by_league ADD COLUMN owned_team_constructors JSON DEFAULT NULL"
				case "totalpoints":
					alterSQL = "ALTER TABLE player_by_league ADD COLUMN totalpoints INT DEFAULT 0"
				}

				if alterSQL != "" {
					err := DB.Exec(alterSQL).Error
					if err != nil {
						log.Printf("Error agregando columna %s: %v", col, err)
					} else {
						log.Printf("Columna %s agregada exitosamente", col)
					}
				}
			}
		}
	}

	log.Println("Migración de player_by_league completada")
}

// MigrateTrackEngineerPoints crea índices específicos para la tabla track_engineer_points
func MigrateTrackEngineerPoints() {
	// Verificar si el índice ya existe
	var indexExists bool
	err := DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?",
		os.Getenv("DB_NAME"), "track_engineer_points", "uk_track_engineer_gp_session").Scan(&indexExists).Error

	if err != nil {
		log.Printf("Error verificando índice único: %v", err)
		return
	}

	if !indexExists {
		// Crear índice único compuesto para evitar duplicados por track_engineer_id, gp_index y session_type
		err := DB.Exec(`
			CREATE UNIQUE INDEX uk_track_engineer_gp_session 
			ON track_engineer_points (track_engineer_id, gp_index, session_type)
		`).Error
		if err != nil {
			log.Printf("Error creando índice único para track_engineer_points: %v", err)
		} else {
			log.Println("Índice único para track_engineer_points creado exitosamente")
		}
	} else {
		log.Println("Índice único para track_engineer_points ya existe")
	}
}

// MigrateTeamRacesFinishCars añade la columna finish_cars a la tabla team_races si no existe
func MigrateTeamRacesFinishCars() {
	log.Println("Verificando columna finish_cars en tabla team_races...")

	// Verificar si la columna finish_cars existe
	var columnExists bool
	err := DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?",
		os.Getenv("DB_NAME"), "team_races", "finish_cars").Scan(&columnExists).Error

	if err != nil {
		log.Printf("Error verificando columna finish_cars: %v", err)
		return
	}

	if !columnExists {
		log.Println("Agregando columna finish_cars a tabla team_races...")

		// Agregar la columna finish_cars
		err := DB.Exec(`
			ALTER TABLE team_races 
			ADD COLUMN finish_cars TINYINT DEFAULT 0 COMMENT 'Número de coches que acabaron la carrera (0, 1 o 2)'
		`).Error

		if err != nil {
			log.Printf("Error agregando columna finish_cars: %v", err)
		} else {
			log.Println("Columna finish_cars agregada exitosamente a tabla team_races")
		}
	} else {
		log.Println("Columna finish_cars ya existe en tabla team_races")
	}
}
