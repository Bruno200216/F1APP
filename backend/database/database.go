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
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
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
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
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

// Migrate ejecuta las migraciones de la base de datos
func Migrate() {
	err := DB.AutoMigrate(
		&models.Player{},
		&models.Pilot{},
		&models.League{},
		&models.PilotByLeague{},
		&models.PilotRace{},
		&models.PilotQualy{},
		&models.PilotPractice{},
		&models.TrackEngineer{},
		&models.ChiefEngineer{},
		&models.TrackEngineerByLeague{},
		&models.ChiefEngineerByLeague{},
		&models.TeamConstructor{},
		&models.TeamConstructorByLeague{},
	)
	if err != nil {
		log.Fatal("Error ejecutando migraciones: ", err)
	}

	log.Println("Migraciones completadas")
}

// SeedDatabase pobla la base de datos con datos iniciales
func SeedDatabase() {
	// Aquí puedes poblar la base de datos con jugadores o pilotos si lo necesitas
	log.Println("SeedDatabase: solo Player y Pilot")
}
