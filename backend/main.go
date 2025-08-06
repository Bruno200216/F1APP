package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"strings"
	"time"

	"f1-fantasy-app/database"
	"f1-fantasy-app/migrations"
	"f1-fantasy-app/models"

	"math/rand"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("mysecretkey")

type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

func slugify(name string) string {
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, ".", "")
	slug = strings.ReplaceAll(slug, "á", "a")
	slug = strings.ReplaceAll(slug, "é", "e")
	slug = strings.ReplaceAll(slug, "í", "i")
	slug = strings.ReplaceAll(slug, "ó", "o")
	slug = strings.ReplaceAll(slug, "ú", "u")
	slug = strings.ReplaceAll(slug, "ñ", "n")
	return slug
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.URL.Path == "/api/pilotbyleague/sell" {
			fmt.Println("[AUTH] --- PETICIÓN /api/pilotbyleague/sell ---")
		}
		tokenString := c.GetHeader("Authorization")
		if c.Request.URL.Path == "/api/pilotbyleague/sell" {
			fmt.Println("[AUTH] Token recibido:", tokenString)
		}
		// Quitar prefijo 'Bearer ' si existe
		if strings.HasPrefix(tokenString, "Bearer ") {
			tokenString = strings.TrimPrefix(tokenString, "Bearer ")
			tokenString = strings.TrimSpace(tokenString)
			if c.Request.URL.Path == "/api/pilotbyleague/sell" {
				fmt.Println("[AUTH] Token tras quitar Bearer:", tokenString)
			}
		}
		if tokenString == "" {
			if c.Request.URL.Path == "/api/pilotbyleague/sell" {
				fmt.Println("[AUTH] Falta token")
			}
			c.AbortWithStatusJSON(401, gin.H{"error": "Missing token"})
			return
		}
		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil {
			if c.Request.URL.Path == "/api/pilotbyleague/sell" {
				fmt.Println("[AUTH] Error al parsear token:", err)
			}
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid token"})
			return
		}
		if !token.Valid {
			if c.Request.URL.Path == "/api/pilotbyleague/sell" {
				fmt.Println("[AUTH] Token no válido")
			}
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid token"})
			return
		}
		if c.Request.URL.Path == "/api/pilotbyleague/sell" {
			fmt.Println("[AUTH] Claims extraídos:", claims)
		}
		userIDFloat, ok := claims["user_id"].(float64)
		if !ok {
			if c.Request.URL.Path == "/api/pilotbyleague/sell" {
				fmt.Println("[AUTH] user_id no es float64 en claims:", claims["user_id"])
			}
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid token (user_id)"})
			return
		}
		userID := uint(userIDFloat)
		if c.Request.URL.Path == "/api/pilotbyleague/sell" {
			fmt.Println("[AUTH] user_id extraído:", userID)
		}
		c.Set("user_id", userID)
		c.Next()
	}
}

// Modificar el modelo Auction para añadir bids como array json
type Bid struct {
	PlayerID uint    `json:"player_id"`
	Valor    float64 `json:"valor"`
}

type Auction struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ItemType  string    `json:"item_type" gorm:"not null"` // "pilot", "track_engineer", "chief_engineer", "team_constructor"
	ItemID    uint      `json:"item_id" gorm:"not null"`   // ID del elemento específico (PilotByLeague, TrackEngineerByLeague, etc.)
	LeagueID  uint      `json:"league_id" gorm:"not null"`
	EndTime   time.Time `json:"end_time" gorm:"not null"`
	Bids      []byte    `json:"bids" gorm:"type:json"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

var marketNextRefresh = time.Now().Add(24 * time.Hour)

func updateMarketNextRefresh() {
	marketNextRefresh = time.Now().Add(24 * time.Hour)
}

// Función para actualizar la propiedad de elementos en PlayerByLeague

func refreshMarketForLeague(leagueID uint) error {
	log.Printf("[refreshMarketForLeague] Refrescando mercado para liga %d", leagueID)

	// 1. Obtener todos los elementos disponibles para el mercado (que no tengan owner)
	var availableItems []models.MarketItem
	database.DB.Where("league_id = ? AND is_active = ?", leagueID, true).Find(&availableItems)
	log.Printf("[refreshMarketForLeague] Total market_items encontrados: %d", len(availableItems))

	// 2. Filtrar elementos que no tengan propietario (owner_id = 0)
	var freeItems []models.MarketItem
	for _, item := range availableItems {
		switch item.ItemType {
		case "pilot":
			var pbl models.PilotByLeague
			if err := database.DB.First(&pbl, item.ItemID).Error; err == nil && pbl.OwnerID == 0 {
				freeItems = append(freeItems, item)
				log.Printf("[refreshMarketForLeague] Pilot libre añadido: ID=%d", item.ItemID)
			} else {
				log.Printf("[refreshMarketForLeague] Pilot no disponible: ID=%d, OwnerID=%d, Error=%v", item.ItemID, pbl.OwnerID, err)
			}
		case "track_engineer":
			var teb models.TrackEngineerByLeague
			if err := database.DB.First(&teb, item.ItemID).Error; err == nil && teb.OwnerID == 0 {
				freeItems = append(freeItems, item)
				log.Printf("[refreshMarketForLeague] Track Engineer libre añadido: ID=%d", item.ItemID)
			} else {
				log.Printf("[refreshMarketForLeague] Track Engineer no disponible: ID=%d, OwnerID=%d, Error=%v", item.ItemID, teb.OwnerID, err)
			}
		case "chief_engineer":
			var ceb models.ChiefEngineerByLeague
			if err := database.DB.First(&ceb, item.ItemID).Error; err == nil && ceb.OwnerID == 0 {
				freeItems = append(freeItems, item)
				log.Printf("[refreshMarketForLeague] Chief Engineer libre añadido: ID=%d", item.ItemID)
			} else {
				log.Printf("[refreshMarketForLeague] Chief Engineer no disponible: ID=%d, OwnerID=%d, Error=%v", item.ItemID, ceb.OwnerID, err)
			}
		case "team_constructor":
			var tcb models.TeamConstructorByLeague
			if err := database.DB.First(&tcb, item.ItemID).Error; err == nil && tcb.OwnerID == 0 {
				freeItems = append(freeItems, item)
				log.Printf("[refreshMarketForLeague] Team Constructor libre añadido: ID=%d", item.ItemID)
			} else {
				log.Printf("[refreshMarketForLeague] Team Constructor no disponible: ID=%d, OwnerID=%d, Error=%v", item.ItemID, tcb.OwnerID, err)
			}
		}
	}

	log.Printf("[refreshMarketForLeague] Elementos libres encontrados: %d (pilotos + ingenieros + equipos)", len(freeItems))

	// Mostrar desglose por tipo
	pilotCount := 0
	trackEngCount := 0
	chiefEngCount := 0
	teamConsCount := 0
	for _, item := range freeItems {
		switch item.ItemType {
		case "pilot":
			pilotCount++
		case "track_engineer":
			trackEngCount++
		case "chief_engineer":
			chiefEngCount++
		case "team_constructor":
			teamConsCount++
		}
	}
	log.Printf("[refreshMarketForLeague] Desglose - Pilotos: %d, Track Engineers: %d, Chief Engineers: %d, Team Constructors: %d", pilotCount, trackEngCount, chiefEngCount, teamConsCount)

	// 3. Seleccionar exactamente 8 elementos aleatorios mezclando todos los tipos
	selectedCount := 8
	if len(freeItems) < selectedCount {
		selectedCount = len(freeItems)
		log.Printf("[refreshMarketForLeague] ADVERTENCIA: Solo hay %d elementos libres, seleccionando todos", selectedCount)
	}

	// Mezclar aleatoriamente usando Fisher-Yates shuffle
	for i := len(freeItems) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
		freeItems[i], freeItems[j] = freeItems[j], freeItems[i]
	}

	selectedItems := freeItems[:selectedCount]
	log.Printf("[refreshMarketForLeague] Elementos seleccionados para el mercado: %d de %d disponibles", len(selectedItems), len(freeItems))

	// Mostrar qué se seleccionó
	for i, item := range selectedItems {
		log.Printf("[refreshMarketForLeague] Seleccionado %d: Tipo=%s, ID=%d", i+1, item.ItemType, item.ItemID)
	}

	// 4. Marcar elementos seleccionados como en el mercado y crear subastas
	// Primero, desmarcar todos los elementos del mercado anterior
	result := database.DB.Model(&models.MarketItem{}).Where("league_id = ?", leagueID).Update("is_in_market", false)
	log.Printf("[refreshMarketForLeague] Desmarcados %d elementos del mercado anterior", result.RowsAffected)

	for i, item := range selectedItems {
		// Marcar este elemento como en el mercado
		updateResult := database.DB.Model(&models.MarketItem{}).Where("id = ?", item.ID).Update("is_in_market", true)
		log.Printf("[refreshMarketForLeague] Elemento %d marcado: ID=%d, Tipo=%s, RowsAffected=%d", i+1, item.ID, item.ItemType, updateResult.RowsAffected)

		switch item.ItemType {
		case "pilot":
			// Para pilotos, crear subasta
			var pbl models.PilotByLeague
			if err := database.DB.First(&pbl, item.ItemID).Error; err == nil {
				// Verificar si ya existe subasta activa
				var existingAuction Auction
				if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", "pilot", pbl.ID, leagueID, time.Now()).First(&existingAuction).Error; err != nil {
					// No existe, crear nueva
					auction := Auction{
						ItemType: "pilot",
						ItemID:   pbl.ID,
						LeagueID: leagueID,
						EndTime:  time.Now().Add(24 * time.Hour),
						Bids:     []byte("[]"),
					}
					database.DB.Create(&auction)
					log.Printf("[refreshMarketForLeague] Subasta creada para pilot ID %d", pbl.ID)
				} else {
					log.Printf("[refreshMarketForLeague] Subasta ya existe para pilot ID %d", pbl.ID)
				}
			}
		case "track_engineer":
			// Crear subasta para track engineer
			var teb models.TrackEngineerByLeague
			if err := database.DB.First(&teb, item.ItemID).Error; err == nil {
				// Verificar si ya existe subasta activa
				var existingAuction Auction
				if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", "track_engineer", teb.ID, leagueID, time.Now()).First(&existingAuction).Error; err != nil {
					// No existe, crear nueva
					auction := Auction{
						ItemType: "track_engineer",
						ItemID:   teb.ID,
						LeagueID: leagueID,
						EndTime:  time.Now().Add(24 * time.Hour),
						Bids:     []byte("[]"),
					}
					database.DB.Create(&auction)
					log.Printf("[refreshMarketForLeague] Subasta creada para track engineer ID %d", teb.ID)
				}
			}
		case "chief_engineer":
			// Crear subasta para chief engineer
			var ceb models.ChiefEngineerByLeague
			if err := database.DB.First(&ceb, item.ItemID).Error; err == nil {
				// Verificar si ya existe subasta activa
				var existingAuction Auction
				if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", "chief_engineer", ceb.ID, leagueID, time.Now()).First(&existingAuction).Error; err != nil {
					// No existe, crear nueva
					auction := Auction{
						ItemType: "chief_engineer",
						ItemID:   ceb.ID,
						LeagueID: leagueID,
						EndTime:  time.Now().Add(24 * time.Hour),
						Bids:     []byte("[]"),
					}
					database.DB.Create(&auction)
					log.Printf("[refreshMarketForLeague] Subasta creada para chief engineer ID %d", ceb.ID)
				}
			}
		case "team_constructor":
			// Crear subasta para team constructor
			var tcb models.TeamConstructorByLeague
			if err := database.DB.First(&tcb, item.ItemID).Error; err == nil {
				// Verificar si ya existe subasta activa
				var existingAuction Auction
				if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", "team_constructor", tcb.ID, tcb.LeagueID, time.Now()).First(&existingAuction).Error; err != nil {
					// No existe, crear nueva
					auction := Auction{
						ItemType: "team_constructor",
						ItemID:   tcb.ID,
						LeagueID: leagueID,
						EndTime:  time.Now().Add(24 * time.Hour),
						Bids:     []byte("[]"),
					}
					database.DB.Create(&auction)
					log.Printf("[refreshMarketForLeague] Subasta creada para team constructor ID %d", tcb.ID)
				}
			}
		}
	}

	log.Printf("[refreshMarketForLeague] Mercado actualizado con %d elementos seleccionados", len(selectedItems))

	// 5. Generar ofertas de la FIA para elementos en venta
	log.Printf("[refreshMarketForLeague] Generando ofertas de la FIA para elementos en venta")
	if err := generateFIAOffersForLeague(leagueID); err != nil {
		log.Printf("[refreshMarketForLeague] Error generando ofertas FIA: %v", err)
	} else {
		log.Printf("[refreshMarketForLeague] Ofertas de la FIA generadas correctamente")
	}

	return nil
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No se encontró archivo .env, usando variables de entorno del sistema")
	}
	database.Connect()

	// En desarrollo: solo registrar migraciones disponibles (no ejecutar)
	// En producción: ejecutar todas las migraciones pendientes
	if os.Getenv("ENVIRONMENT") == "production" {
		log.Println("[MIGRATIONS] Entorno de producción detectado, ejecutando migraciones...")
		if err := migrations.RunMigrations(database.GetSQLDB()); err != nil {
			log.Fatalf("Error ejecutando migraciones: %v", err)
		}
	} else {
		log.Println("[MIGRATIONS] Entorno de desarrollo detectado - migraciones disponibles pero no ejecutadas")
		migrations.LogAvailableMigrations()
		log.Println("[MIGRATIONS] Las migraciones se ejecutarán automáticamente en producción")
	}

	database.Migrate()
	database.SeedDatabase()

	router := gin.Default()

	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "F1 Fantasy App API", "version": "1.0.0"})
	})

	// Registro de usuario
	router.POST("/api/register", func(c *gin.Context) {
		var req struct {
			Name     string `json:"name"`
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Invalid request"})
			return
		}
		var existing models.Player
		if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
			c.JSON(400, gin.H{"error": "Email already registered"})
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(500, gin.H{"error": "Error creating user"})
			return
		}
		player := models.Player{
			Name:         req.Name,
			Email:        req.Email,
			PasswordHash: string(hash),
		}
		if err := database.DB.Create(&player).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error creating user"})
			return
		}
		c.JSON(201, gin.H{"message": "User registered"})
	})

	// Login de usuario
	router.POST("/api/login", func(c *gin.Context) {
		fmt.Println("[LOGIN] Petición de login recibida")
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			fmt.Println("[LOGIN] Error en ShouldBindJSON:", err)
			c.JSON(400, gin.H{"error": "Invalid request"})
			return
		}
		fmt.Println("[LOGIN] Email recibido:", req.Email)
		var player models.Player
		if err := database.DB.Where("email = ?", req.Email).First(&player).Error; err != nil {
			fmt.Println("[LOGIN] Usuario no encontrado para email:", req.Email)
			c.JSON(401, gin.H{"error": "Invalid credentials"})
			return
		}
		fmt.Printf("[LOGIN] Usuario encontrado: ID=%v, Email=%v\n", player.ID, player.Email)
		if err := bcrypt.CompareHashAndPassword([]byte(player.PasswordHash), []byte(req.Password)); err != nil {
			fmt.Println("[LOGIN] Contraseña incorrecta para usuario:", player.Email)
			c.JSON(401, gin.H{"error": "Invalid credentials"})
			return
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": player.ID,
			"email":   player.Email,
			"exp":     time.Now().Add(30 * 24 * time.Hour).Unix(),
		})
		tokenString, err := token.SignedString(jwtSecret)
		if err != nil {
			fmt.Println("[LOGIN] Error generando token:", err)
			c.JSON(500, gin.H{"error": "Error generating token"})
			return
		}
		fmt.Println("[LOGIN] Token generado:", tokenString)
		c.JSON(200, gin.H{"token": tokenString, "user": gin.H{"id": player.ID, "name": player.Name, "email": player.Email}})
		fmt.Println("[LOGIN] Respuesta enviada con token y datos de usuario")
	})

	// CRUD de pilotos generales (Pilot)
	router.GET("/api/pilots", func(c *gin.Context) {
		var pilots []models.Pilot
		database.DB.Find(&pilots)
		// Traer también los track engineers con perfil extendido
		var trackEngineers []models.TrackEngineer
		database.DB.Find(&trackEngineers)
		var trackEngineerProfiles []map[string]interface{}
		for _, te := range trackEngineers {
			profile := map[string]interface{}{
				"id":        te.ID,
				"name":      engineerNameFromImageURL(te.ImageURL),
				"image_url": te.ImageURL,
				"value":     te.Value,
			}
			trackEngineerProfiles = append(trackEngineerProfiles, profile)
		}
		c.JSON(200, gin.H{"pilots": pilots, "track_engineers": trackEngineerProfiles})
	})

	// Endpoint para obtener información de un piloto específico por ID
	router.GET("/api/pilots/:id", func(c *gin.Context) {
		pilotID := c.Param("id")
		if pilotID == "" {
			c.JSON(400, gin.H{"error": "Falta pilot_id"})
			return
		}
		var pilot models.Pilot
		if err := database.DB.First(&pilot, pilotID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}
		c.JSON(200, gin.H{"pilot": pilot})
	})

	router.POST("/api/pilots", authMiddleware(), func(c *gin.Context) {
		var req models.Pilot
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		if err := database.DB.Create(&req).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error creando piloto"})
			return
		}
		c.JSON(201, gin.H{"pilot": req})
	})

	router.PUT("/api/pilots/:id", authMiddleware(), func(c *gin.Context) {
		id := c.Param("id")
		var pilot models.Pilot
		if err := database.DB.First(&pilot, id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}
		if err := c.ShouldBindJSON(&pilot); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		if err := database.DB.Save(&pilot).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error actualizando piloto"})
			return
		}
		c.JSON(200, gin.H{"pilot": pilot})
	})

	router.DELETE("/api/pilots/:id", authMiddleware(), func(c *gin.Context) {
		id := c.Param("id")
		if err := database.DB.Delete(&models.Pilot{}, id).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error eliminando piloto"})
			return
		}
		c.JSON(200, gin.H{"message": "Piloto eliminado"})
	})

	// Endpoint para crear una liga
	router.POST("/api/leagues", authMiddleware(), func(c *gin.Context) {
		var req struct {
			Name string `json:"name"`
			Code string `json:"code"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		if req.Code == "" {
			req.Code = generateLeagueCode()
		}
		// Obtener el user_id del creador desde el contexto (JWT)
		userID, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		log.Printf("[CREAR LIGA] user_id obtenido del contexto: %v (tipo: %T)", userID, userID)
		league := models.League{
			Name:     req.Name,
			Code:     req.Code,
			PlayerID: userID.(uint),
		}
		log.Printf("[CREAR LIGA] Liga a crear: Name=%s, Code=%s, PlayerID=%d", league.Name, league.Code, league.PlayerID)
		if err := database.DB.Create(&league).Error; err != nil {
			log.Printf("[CREAR LIGA] Error al crear liga: %v", err)
			c.JSON(500, gin.H{"error": "Error creando liga"})
			return
		}
		log.Printf("[CREAR LIGA] Liga creada exitosamente - ID=%d, Nombre=%s, PlayerID=%d", league.ID, league.Name, league.PlayerID)
		// Poblar tabla PilotByLeague con los pilotos generales
		var pilots []models.Pilot
		database.DB.Find(&pilots)
		log.Printf("[CREAR LIGA] Pilotos generales encontrados: %d", len(pilots))
		var pilotsByLeague []models.PilotByLeague
		for _, pilot := range pilots {
			pilotsByLeague = append(pilotsByLeague, models.PilotByLeague{
				PilotID:  pilot.ID,
				LeagueID: league.ID,
				OwnerID:  0,
			})
		}
		if len(pilotsByLeague) > 0 {
			database.DB.Create(&pilotsByLeague)
			log.Printf("[CREAR LIGA] PilotosByLeague creados: %d", len(pilotsByLeague))
		}
		// Comprobar si ya existe el registro en player_by_league para este usuario y liga
		userIDUint64 := uint64(userID.(uint))
		var existing models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userIDUint64, league.ID).First(&existing).Error; err == nil {
			log.Printf("El usuario %d ya tiene registro en player_by_league para la liga %d", userIDUint64, league.ID)
		} else {
			// Crear el registro en player_by_league solo para el creador
			playerByLeague := models.PlayerByLeague{
				PlayerID:              userIDUint64,
				LeagueID:              uint64(league.ID),
				Money:                 100000000, // 100M
				TeamValue:             0,
				OwnedPilots:           "[]",
				OwnedTrackEngineers:   "[]",
				OwnedChiefEngineers:   "[]",
				OwnedTeamConstructors: "[]",
				TotalPoints:           0,
			}
			if err := database.DB.Create(&playerByLeague).Error; err != nil {
				log.Printf("[CREAR LIGA] ERROR CRÍTICO: No se pudo crear player_by_league: %v", err)
				// Limpiar todos los datos de la liga de manera segura
				cleanupLeagueData(league.ID)
				c.JSON(500, gin.H{"error": "Error asociando usuario a la liga"})
				return
			} else {
				log.Printf("[CREAR LIGA] ✅ Registro player_by_league creado para player_id=%d, league_id=%d", playerByLeague.PlayerID, playerByLeague.LeagueID)
			}
		}
		// Poblar ingenieros de pista para el primer GP
		var gps []models.GrandPrix
		database.DB.Order("start_date asc").Find(&gps)
		if len(gps) > 0 {
			// Obtener todos los ingenieros globales
			var globalEngineers []models.TrackEngineer
			database.DB.Find(&globalEngineers)
			for _, globalTE := range globalEngineers {
				teb := models.TrackEngineerByLeague{
					TrackEngineerID:      globalTE.ID,
					LeagueID:             league.ID,
					OwnerID:              0,
					Bids:                 []byte("[]"),
					Venta:                nil,
					VentaExpiresAt:       nil,
					LeagueOfferValue:     nil,
					LeagueOfferExpiresAt: nil,
					Clausulatime:         nil,
					ClausulaValue:        nil,
				}
				if err := database.DB.Create(&teb).Error; err != nil {
					log.Printf("[CREAR LIGA] Error al crear TrackEngineerByLeague para ingeniero ID %d: %v", globalTE.ID, err)
				} else {
					log.Printf("[CREAR LIGA] TrackEngineerByLeague creado para ingeniero ID %d (name: %s, image_url: %s)", globalTE.ID, globalTE.Name, globalTE.ImageURL)
				}
			}

			// Obtener todos los ingenieros jefe globales
			var globalChiefEngineers []models.ChiefEngineer
			database.DB.Find(&globalChiefEngineers)
			for _, globalCE := range globalChiefEngineers {
				ceb := models.ChiefEngineerByLeague{
					ChiefEngineerID:      globalCE.ID,
					LeagueID:             league.ID,
					OwnerID:              0,
					Bids:                 []byte("[]"),
					Venta:                nil,
					VentaExpiresAt:       nil,
					LeagueOfferValue:     nil,
					LeagueOfferExpiresAt: nil,
					Clausulatime:         nil,
					ClausulaValue:        nil,
				}
				if err := database.DB.Create(&ceb).Error; err != nil {
					log.Printf("[CREAR LIGA] Error al crear ChiefEngineerByLeague para ingeniero jefe ID %d: %v", globalCE.ID, err)
				} else {
					log.Printf("[CREAR LIGA] ChiefEngineerByLeague creado para ingeniero jefe ID %d (name: %s, team: %s)", globalCE.ID, globalCE.Name, globalCE.Team)
				}
			}

			// Obtener todos los constructores globales
			var globalConstructors []models.TeamConstructor
			database.DB.Find(&globalConstructors)
			for _, globalTC := range globalConstructors {
				tcb := models.TeamConstructorByLeague{
					TeamConstructorID:    globalTC.ID,
					LeagueID:             league.ID,
					OwnerID:              0,
					Bids:                 []byte("[]"),
					Venta:                nil,
					VentaExpiresAt:       nil,
					LeagueOfferValue:     nil,
					LeagueOfferExpiresAt: nil,
					Clausulatime:         nil,
					ClausulaValue:        nil,
				}
				if err := database.DB.Create(&tcb).Error; err != nil {
					log.Printf("[CREAR LIGA] Error al crear TeamConstructorByLeague para constructor ID %d: %v", globalTC.ID, err)
				} else {
					log.Printf("[CREAR LIGA] TeamConstructorByLeague creado para constructor ID %d (name: %s)", globalTC.ID, globalTC.Name)
				}
			}
		}

		// Poblar tabla market_items con todos los elementos disponibles para el mercado
		log.Printf("[CREAR LIGA] Poblando market_items para liga %d", league.ID)

		// Verificar que se crearon los pilotos exitosamente
		if len(pilotsByLeague) == 0 {
			log.Printf("[CREAR LIGA] ERROR: No se crearon PilotsByLeague")
			// Limpiar todos los datos de la liga de manera segura
			cleanupLeagueData(league.ID)
			c.JSON(500, gin.H{"error": "Error poblando pilotos de la liga"})
			return
		}

		// Añadir todos los pilotos al mercado
		pilotMarketCount := 0
		for _, pbl := range pilotsByLeague {
			marketItem := models.MarketItem{
				LeagueID: league.ID,
				ItemType: "pilot",
				ItemID:   pbl.ID,
				IsActive: true,
			}
			if err := database.DB.Create(&marketItem).Error; err != nil {
				log.Printf("[CREAR LIGA] Error creando market_item para pilot ID %d: %v", pbl.ID, err)
			} else {
				pilotMarketCount++
			}
		}
		log.Printf("[CREAR LIGA] ✅ Market items de pilotos creados: %d/%d", pilotMarketCount, len(pilotsByLeague))

		// Añadir todos los track engineers
		var allTrackEngineers []models.TrackEngineerByLeague
		database.DB.Where("league_id = ?", league.ID).Find(&allTrackEngineers)
		trackEngMarketCount := 0
		for _, teb := range allTrackEngineers {
			marketItem := models.MarketItem{
				LeagueID: league.ID,
				ItemType: "track_engineer",
				ItemID:   teb.ID,
				IsActive: true,
			}
			if err := database.DB.Create(&marketItem).Error; err != nil {
				log.Printf("[CREAR LIGA] Error creando market_item para track engineer ID %d: %v", teb.ID, err)
			} else {
				trackEngMarketCount++
			}
		}
		log.Printf("[CREAR LIGA] ✅ Market items de track engineers creados: %d/%d", trackEngMarketCount, len(allTrackEngineers))

		// Añadir todos los chief engineers
		var allChiefEngineers []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ?", league.ID).Find(&allChiefEngineers)
		chiefEngMarketCount := 0
		for _, ceb := range allChiefEngineers {
			marketItem := models.MarketItem{
				LeagueID: league.ID,
				ItemType: "chief_engineer",
				ItemID:   ceb.ID,
				IsActive: true,
			}
			if err := database.DB.Create(&marketItem).Error; err != nil {
				log.Printf("[CREAR LIGA] Error creando market_item para chief engineer ID %d: %v", ceb.ID, err)
			} else {
				chiefEngMarketCount++
			}
		}
		log.Printf("[CREAR LIGA] ✅ Market items de chief engineers creados: %d/%d", chiefEngMarketCount, len(allChiefEngineers))

		// Añadir todos los team constructors
		var allTeamConstructors []models.TeamConstructorByLeague
		database.DB.Where("league_id = ?", league.ID).Find(&allTeamConstructors)
		teamConsMarketCount := 0
		for _, tcb := range allTeamConstructors {
			marketItem := models.MarketItem{
				LeagueID: league.ID,
				ItemType: "team_constructor",
				ItemID:   tcb.ID,
				IsActive: true,
			}
			if err := database.DB.Create(&marketItem).Error; err != nil {
				log.Printf("[CREAR LIGA] Error creando market_item para team constructor ID %d: %v", tcb.ID, err)
			} else {
				teamConsMarketCount++
			}
		}
		log.Printf("[CREAR LIGA] ✅ Market items de team constructors creados: %d/%d", teamConsMarketCount, len(allTeamConstructors))

		totalMarketItems := pilotMarketCount + trackEngMarketCount + chiefEngMarketCount + teamConsMarketCount
		log.Printf("[CREAR LIGA] ✅ Total market_items creados: %d", totalMarketItems)

		// Crear el mercado inicial de la liga (8 elementos aleatorios)
		log.Printf("[CREAR LIGA] Iniciando refresh del mercado...")
		if err := refreshMarketForLeague(league.ID); err != nil {
			log.Printf("[CREAR LIGA] Error refrescando mercado: %v", err)
			// No es crítico, la liga ya está creada
		} else {
			log.Printf("[CREAR LIGA] ✅ Mercado refrescado exitosamente")
		}

		log.Printf("[CREAR LIGA] 🎉 Liga creada exitosamente - ID=%d, Nombre='%s', Total elementos: %d",
			league.ID, league.Name, totalMarketItems)

		c.JSON(201, gin.H{"league": league})
	})

	// Endpoint para listar todas las ligas
	router.GET("/api/leagues", func(c *gin.Context) {
		var leagues []models.League
		database.DB.Find(&leagues)
		c.JSON(200, gin.H{"leagues": leagues})
	})

	// Endpoint para eliminar una liga
	router.DELETE("/api/leagues/:id", authMiddleware(), func(c *gin.Context) {
		id := c.Param("id")
		userID := c.GetUint("user_id")

		log.Printf("[SALIR/BORRAR LIGA] Usuario %d intentando salir/borrar liga %s", userID, id)

		// Verificar que la liga existe
		var league models.League
		if err := database.DB.First(&league, id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Liga no encontrada"})
			return
		}

		// Contar cuántos miembros tiene la liga
		var memberCount int64
		database.DB.Model(&models.PlayerByLeague{}).Where("league_id = ?", id).Count(&memberCount)

		log.Printf("[SALIR/BORRAR LIGA] Liga %s tiene %d miembros", id, memberCount)

		// Verificar si el usuario es miembro de la liga
		var playerInLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userID, id).First(&playerInLeague).Error; err != nil {
			c.JSON(403, gin.H{"error": "No eres miembro de esta liga"})
			return
		}

		// LÓGICA: Si es el ÚNICO miembro, eliminar liga completa
		if memberCount == 1 {
			log.Printf("[BORRAR LIGA COMPLETA] Usuario %d es el único miembro, eliminando liga completa", userID)

			// Borrar en orden correcto para evitar restricciones de clave foránea

			// 1. Borrar subastas
			database.DB.Where("league_id = ?", id).Delete(&Auction{})
			log.Printf("[BORRAR LIGA] Subastas eliminadas")

			// 2. Borrar market_items
			database.DB.Where("league_id = ?", id).Delete(&models.MarketItem{})
			log.Printf("[BORRAR LIGA] Market items eliminados")

			// 3. Borrar pilotos por liga
			database.DB.Where("league_id = ?", id).Delete(&models.PilotByLeague{})
			log.Printf("[BORRAR LIGA] Pilotos por liga eliminados")

			// 4. Borrar track engineers por liga
			database.DB.Where("league_id = ?", id).Delete(&models.TrackEngineerByLeague{})
			log.Printf("[BORRAR LIGA] Track engineers por liga eliminados")

			// 5. Borrar chief engineers por liga
			database.DB.Where("league_id = ?", id).Delete(&models.ChiefEngineerByLeague{})
			log.Printf("[BORRAR LIGA] Chief engineers por liga eliminados")

			// 6. Borrar team constructors por liga
			database.DB.Where("league_id = ?", id).Delete(&models.TeamConstructorByLeague{})
			log.Printf("[BORRAR LIGA] Team constructors por liga eliminados")

			// 7. Borrar player_by_league
			database.DB.Where("league_id = ?", id).Delete(&models.PlayerByLeague{})
			log.Printf("[BORRAR LIGA] Players por liga eliminados")

			// 8. Borrar lineups
			database.DB.Where("league_id = ?", id).Delete(&models.Lineup{})
			log.Printf("[BORRAR LIGA] Lineups eliminados")

			// Finalmente, borrar la liga
			if err := database.DB.Delete(&models.League{}, id).Error; err != nil {
				log.Printf("[BORRAR LIGA] ERROR eliminando liga: %v", err)
				c.JSON(500, gin.H{"error": "Error eliminando liga"})
				return
			}
			log.Printf("[BORRAR LIGA] Liga %s eliminada correctamente", id)
			c.JSON(200, gin.H{"message": "Liga eliminada completamente"})

		} else {
			// LÓGICA: Si hay otros miembros, devolver fichajes al mercado y eliminar relación
			log.Printf("[SALIR DE LIGA] Usuario %d saliendo de liga con otros miembros", userID)

			// Devolver todos los fichajes del usuario al mercado de la liga
			leagueIDUint, _ := strconv.ParseUint(id, 10, 32)
			if err := returnUserItemsToLeague(userID, uint(leagueIDUint)); err != nil {
				log.Printf("[SALIR DE LIGA] ERROR devolviendo fichajes: %v", err)
				c.JSON(500, gin.H{"error": "Error devolviendo fichajes al mercado"})
				return
			}

			// Eliminar solo la relación del usuario con la liga
			if err := database.DB.Where("player_id = ? AND league_id = ?", userID, id).Delete(&models.PlayerByLeague{}).Error; err != nil {
				log.Printf("[SALIR DE LIGA] ERROR eliminando relación: %v", err)
				c.JSON(500, gin.H{"error": "Error saliendo de la liga"})
				return
			}

			// Eliminar lineups del usuario en esta liga
			database.DB.Where("player_id = ? AND league_id = ?", userID, id).Delete(&models.Lineup{})
			log.Printf("[SALIR DE LIGA] Lineups del usuario eliminados")

			log.Printf("[SALIR DE LIGA] Usuario %d salió correctamente de liga %s", userID, id)
			c.JSON(200, gin.H{"message": "Has salido de la liga correctamente"})
		}
	})

	// Endpoint para que el creador elimine la liga completa (solo para creadores)
	router.DELETE("/api/leagues/:id/admin", authMiddleware(), func(c *gin.Context) {
		id := c.Param("id")
		userID := c.GetUint("user_id")

		log.Printf("[ADMIN BORRAR LIGA] Usuario %d intentando eliminar liga %s como admin", userID, id)

		// Verificar que la liga existe
		var league models.League
		if err := database.DB.First(&league, id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Liga no encontrada"})
			return
		}

		// Verificar que el usuario es el creador de la liga
		if league.PlayerID != userID {
			c.JSON(403, gin.H{"error": "Solo el creador de la liga puede eliminarla completamente"})
			return
		}

		log.Printf("[ADMIN BORRAR LIGA] Usuario %d es creador, eliminando liga completa", userID)

		// Borrar en orden correcto para evitar restricciones de clave foránea

		// 1. Borrar subastas
		database.DB.Where("league_id = ?", id).Delete(&Auction{})
		log.Printf("[ADMIN BORRAR LIGA] Subastas eliminadas")

		// 2. Borrar market_items
		database.DB.Where("league_id = ?", id).Delete(&models.MarketItem{})
		log.Printf("[ADMIN BORRAR LIGA] Market items eliminados")

		// 3. Borrar pilotos por liga
		database.DB.Where("league_id = ?", id).Delete(&models.PilotByLeague{})
		log.Printf("[ADMIN BORRAR LIGA] Pilotos por liga eliminados")

		// 4. Borrar track engineers por liga
		database.DB.Where("league_id = ?", id).Delete(&models.TrackEngineerByLeague{})
		log.Printf("[ADMIN BORRAR LIGA] Track engineers por liga eliminados")

		// 5. Borrar chief engineers por liga
		database.DB.Where("league_id = ?", id).Delete(&models.ChiefEngineerByLeague{})
		log.Printf("[ADMIN BORRAR LIGA] Chief engineers por liga eliminados")

		// 6. Borrar team constructors por liga
		database.DB.Where("league_id = ?", id).Delete(&models.TeamConstructorByLeague{})
		log.Printf("[ADMIN BORRAR LIGA] Team constructors por liga eliminados")

		// 7. Borrar player_by_league
		database.DB.Where("league_id = ?", id).Delete(&models.PlayerByLeague{})
		log.Printf("[ADMIN BORRAR LIGA] Players por liga eliminados")

		// 8. Borrar lineups
		database.DB.Where("league_id = ?", id).Delete(&models.Lineup{})
		log.Printf("[ADMIN BORRAR LIGA] Lineups eliminados")

		// Finalmente, borrar la liga
		if err := database.DB.Delete(&models.League{}, id).Error; err != nil {
			log.Printf("[ADMIN BORRAR LIGA] ERROR eliminando liga: %v", err)
			c.JSON(500, gin.H{"error": "Error eliminando liga"})
			return
		}
		log.Printf("[ADMIN BORRAR LIGA] Liga %s eliminada correctamente por admin", id)
		c.JSON(200, gin.H{"message": "Liga eliminada completamente por el administrador"})
	})

	// Endpoint para editar el nombre de una liga
	router.PUT("/api/leagues/:id", authMiddleware(), func(c *gin.Context) {
		id := c.Param("id")
		var league models.League
		if err := database.DB.First(&league, id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Liga no encontrada"})
			return
		}
		var req struct {
			Name string `json:"name"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		league.Name = req.Name
		if err := database.DB.Save(&league).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error actualizando liga"})
			return
		}
		c.JSON(200, gin.H{"league": league})
	})

	// Endpoint para obtener todos los pilotos de una liga desde PilotByLeague
	router.GET("/api/pilotsbyleague", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		var pilotsByLeague []models.PilotByLeague
		if err := database.DB.Where("league_id = ?", leagueID).Find(&pilotsByLeague).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo pilotos"})
			return
		}
		var result []map[string]interface{}
		for _, pbl := range pilotsByLeague {
			var pilot models.Pilot
			database.DB.First(&pilot, pbl.PilotID)
			item := map[string]interface{}{
				"id":             pilot.ID,
				"driver_name":    pilot.DriverName,
				"team":           pilot.Team,
				"image_url":      pilot.ImageURL,
				"mode":           pilot.Mode,
				"total_points":   pilot.TotalPoints,
				"value":          pilot.Value,
				"clausulatime":   pbl.Clausulatime,
				"clausula_value": pbl.ClausulaValue,
				"owner_id":       pbl.OwnerID,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"pilots": result})
	})

	// Endpoint para perfil de piloto
	router.GET("/api/pilot-profile/:pilot_id", func(c *gin.Context) {
		pilotID := c.Param("pilot_id")
		leagueID := c.Query("league_id")
		if pilotID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros"})
			return
		}
		var pilot models.Pilot
		if err := database.DB.First(&pilot, pilotID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}
		var pbl models.PilotByLeague
		if err := database.DB.Where("pilot_id = ? AND league_id = ?", pilotID, leagueID).First(&pbl).Error; err != nil {
			c.JSON(404, gin.H{"error": "No encontrado en la liga"})
			return
		}
		var gps []models.GrandPrix
		database.DB.Order("start_date asc").Find(&gps)
		nGPS := len(gps)
		scoring := map[string]interface{}{}
		pointsArray := make([]int, nGPS)

		// Crear un mapa para mapear gp_index a posición en el array ordenado por fecha
		gpIndexToPosition := make(map[uint64]int)
		for i, gp := range gps {
			gpIndexToPosition[gp.GPIndex] = i
		}

		// Cambiar la fuente de datos según el modo
		switch pilot.Mode {
		case "practice", "P":
			var practices []models.PilotPractice
			database.DB.Where("pilot_id = ?", pilotID).Order("gp_index asc").Find(&practices)
			for i := 0; i < nGPS; i++ {
				scoring["finish_position"] = make([]interface{}, nGPS)
				scoring["expected_position"] = make([]interface{}, nGPS)
				scoring["delta_position"] = make([]interface{}, nGPS)
				scoring["points"] = make([]interface{}, nGPS)
				scoring["caused_red_flag"] = make([]interface{}, nGPS)
			}
			for _, p := range practices {
				if idx, exists := gpIndexToPosition[p.GPIndex]; exists {
					scoring["finish_position"].([]interface{})[idx] = p.FinishPosition
					scoring["expected_position"].([]interface{})[idx] = p.ExpectedPosition
					scoring["delta_position"].([]interface{})[idx] = p.DeltaPosition
					scoring["points"].([]interface{})[idx] = p.Points
					scoring["caused_red_flag"].([]interface{})[idx] = p.CausedRedFlag
					pointsArray[idx] = p.Points
				}
			}
		case "qualifying", "Q":
			var qualies []models.PilotQualy
			database.DB.Where("pilot_id = ?", pilotID).Order("gp_index asc").Find(&qualies)
			for i := 0; i < nGPS; i++ {
				scoring["finish_position"] = make([]interface{}, nGPS)
				scoring["expected_position"] = make([]interface{}, nGPS)
				scoring["delta_position"] = make([]interface{}, nGPS)
				scoring["points"] = make([]interface{}, nGPS)
				scoring["caused_red_flag"] = make([]interface{}, nGPS)
			}
			for _, q := range qualies {
				if idx, exists := gpIndexToPosition[q.GPIndex]; exists {
					scoring["finish_position"].([]interface{})[idx] = q.FinishPosition
					scoring["expected_position"].([]interface{})[idx] = q.ExpectedPosition
					scoring["delta_position"].([]interface{})[idx] = q.DeltaPosition
					scoring["points"].([]interface{})[idx] = q.Points
					scoring["caused_red_flag"].([]interface{})[idx] = q.CausedRedFlag
					pointsArray[idx] = q.Points
				}
			}
		case "race", "R":
			var races []models.PilotRace
			database.DB.Where("pilot_id = ?", pilotID).Order("gp_index asc").Find(&races)
			for i := 0; i < nGPS; i++ {
				scoring["finish_position"] = make([]interface{}, nGPS)
				scoring["expected_position"] = make([]interface{}, nGPS)
				scoring["delta_position"] = make([]interface{}, nGPS)
				scoring["points"] = make([]interface{}, nGPS)
				scoring["positions_gained_at_start"] = make([]interface{}, nGPS)
				scoring["clean_overtakes"] = make([]interface{}, nGPS)
				scoring["net_positions_lost"] = make([]interface{}, nGPS)
				scoring["fastest_lap"] = make([]interface{}, nGPS)
				scoring["caused_vsc"] = make([]interface{}, nGPS)
				scoring["caused_sc"] = make([]interface{}, nGPS)
				scoring["caused_red_flag"] = make([]interface{}, nGPS)
				scoring["dnf_driver_error"] = make([]interface{}, nGPS)
				scoring["dnf_no_fault"] = make([]interface{}, nGPS)
			}
			for _, r := range races {
				if idx, exists := gpIndexToPosition[r.GPIndex]; exists {
					scoring["finish_position"].([]interface{})[idx] = r.FinishPosition
					scoring["expected_position"].([]interface{})[idx] = r.ExpectedPosition
					scoring["delta_position"].([]interface{})[idx] = r.DeltaPosition
					scoring["points"].([]interface{})[idx] = r.Points
					scoring["positions_gained_at_start"].([]interface{})[idx] = r.PositionsGainedAtStart
					scoring["clean_overtakes"].([]interface{})[idx] = r.CleanOvertakes
					scoring["net_positions_lost"].([]interface{})[idx] = r.NetPositionsLost
					scoring["fastest_lap"].([]interface{})[idx] = r.FastestLap
					scoring["caused_vsc"].([]interface{})[idx] = r.CausedVSC
					scoring["caused_sc"].([]interface{})[idx] = r.CausedSC
					scoring["caused_red_flag"].([]interface{})[idx] = r.CausedRedFlag
					scoring["dnf_driver_error"].([]interface{})[idx] = r.DNFDriverError
					scoring["dnf_no_fault"].([]interface{})[idx] = r.DNFNoFault
					pointsArray[idx] = r.Points
				}
			}
		}
		// Guardar los puntos en un campo separado para compatibilidad frontend
		c.JSON(200, gin.H{
			"pilot": pilot,
			"pilot_by_league": gin.H{
				"id":                      pbl.ID,
				"pilot_id":                pbl.PilotID,
				"league_id":               pbl.LeagueID,
				"owner_id":                pbl.OwnerID,
				"clausulatime":            pbl.Clausulatime,
				"clausula_value":          pbl.ClausulaValue,
				"bids":                    pbl.Bids,
				"venta":                   pbl.Venta,
				"venta_expires_at":        pbl.VentaExpiresAt,
				"league_offer_value":      pbl.LeagueOfferValue,
				"league_offer_expires_at": pbl.LeagueOfferExpiresAt,
				"created_at":              pbl.CreatedAt,
				"updated_at":              pbl.UpdatedAt,
				"points":                  pointsArray,
			},
			"grand_prix":       gps,
			"scoring_criteria": scoring,
		})
	})

	// Endpoint para refrescar subastas de una liga (selecciona 5 pilotos libres y crea subastas)
	router.POST("/api/auctions/refresh", func(c *gin.Context) {
		var req struct {
			LeagueID uint `json:"league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.LeagueID == 0 {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		// Buscar 5 pilotos libres en la liga
		var libres []models.PilotByLeague
		database.DB.Where("league_id = ? AND owner_id = 0", req.LeagueID).Limit(5).Find(&libres)
		if len(libres) == 0 {
			c.JSON(200, gin.H{"auctions": []Auction{}})
			return
		}
		// Crear subastas para esos pilotos
		var auctions []Auction
		endTime := time.Now().Add(24 * time.Hour)
		for _, pbl := range libres {
			auction := Auction{
				ItemType: "pilot",
				ItemID:   pbl.ID,
				LeagueID: req.LeagueID,
				EndTime:  endTime,
			}
			database.DB.Create(&auction)
			auctions = append(auctions, auction)
		}
		c.JSON(201, gin.H{"auctions": auctions})
	})

	// Endpoint para finalizar una subasta y asignar el piloto al ganador
	router.POST("/api/auctions/finish", authMiddleware(), func(c *gin.Context) {
		var req struct {
			AuctionID uint `json:"auction_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.AuctionID == 0 {
			c.JSON(400, gin.H{"error": "Falta auction_id"})
			return
		}
		// Buscar la subasta
		var auction Auction
		if err := database.DB.First(&auction, req.AuctionID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Subasta no encontrada"})
			return
		}
		if auction.EndTime.After(time.Now()) {
			c.JSON(400, gin.H{"error": "La subasta aún no ha terminado"})
			return
		}
		// Buscar el piloto en la liga
		var pbl models.PilotByLeague
		if err := database.DB.First(&pbl, auction.ItemID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Piloto en subasta no encontrado"})
			return
		}
		// Obtener las pujas
		var bids []Bid
		if len(pbl.Bids) > 0 {
			_ = json.Unmarshal(([]byte)(pbl.Bids), &bids)
		}
		if len(bids) == 0 {
			c.JSON(400, gin.H{"error": "No hay pujas para esta subasta"})
			return
		}
		// Buscar la puja más alta
		maxBid := bids[0]
		for _, bid := range bids {
			if bid.Valor > maxBid.Valor {
				maxBid = bid
			}
		}
		// Asignar el piloto al ganador
		pbl.OwnerID = maxBid.PlayerID
		pbl.Bids = []byte("[]") // Limpiar pujas
		database.DB.Save(&pbl)
		// Actualizar PlayerByLeague del ganador
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", maxBid.PlayerID, pbl.LeagueID).First(&playerLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "No se encontró el jugador ganador en la liga"})
			return
		}
		// Descontar el dinero solo al ganador
		if playerLeague.Money < float64(maxBid.Valor) {
			c.JSON(400, gin.H{"error": "El ganador no tiene suficiente saldo (error de integridad)"})
			return
		}
		playerLeague.Money -= float64(maxBid.Valor)
		// Actualizar owned_pilots y team_value
		var owned []uint
		if playerLeague.OwnedPilots != "" && playerLeague.OwnedPilots != "[]" {
			_ = json.Unmarshal([]byte(playerLeague.OwnedPilots), &owned)
		}
		// Añadir solo si no está ya presente
		alreadyOwned := false
		for _, pid := range owned {
			if pid == pbl.PilotID {
				alreadyOwned = true
				break
			}
		}
		if !alreadyOwned {
			owned = append(owned, pbl.PilotID)
		}
		ownedJSON, _ := json.Marshal(owned)
		playerLeague.OwnedPilots = string(ownedJSON)
		// Sumar el valor del piloto al team_value solo si es nuevo
		if !alreadyOwned {
			var pilot models.Pilot
			database.DB.First(&pilot, pbl.PilotID)
			playerLeague.TeamValue += pilot.Value
		}
		database.DB.Save(&playerLeague)
		// Guardar histórico de fichaje (subasta)
		errHist := database.DB.Exec(`INSERT INTO pilot_value_history (pilot_id, pilot_by_league_id, league_id, player_id, valor_pagado, fecha, tipo, counterparty_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, pbl.PilotID, pbl.ID, pbl.LeagueID, maxBid.PlayerID, maxBid.Valor, time.Now(), "fichaje", 0).Error
		if errHist != nil {
			log.Printf("[HISTORICO] Error guardando en pilot_value_history: %v", errHist)
		}
		c.JSON(200, gin.H{"message": "Subasta finalizada y piloto asignado", "winner": maxBid.PlayerID, "pilot_id": pbl.PilotID})
		// En /api/auctions/finish, después de asignar el piloto al ganador:
		if pbl.ClausulaValue == nil || maxBid.Valor > *pbl.ClausulaValue {
			pbl.ClausulaValue = &maxBid.Valor
		}
		clausulaExpira := auction.EndTime.Add(14 * 24 * time.Hour)
		pbl.Clausulatime = &clausulaExpira
		database.DB.Save(&pbl)
	})

	// Obtener información del jugador
	router.GET("/api/players/:player_id", authMiddleware(), func(c *gin.Context) {
		playerID := c.Param("player_id")

		var player models.Player
		if err := database.DB.First(&player, playerID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"player": player})
	})

	// Endpoint para obtener los pilotos de una liga para un usuario concreto
	router.GET("/api/players/:player_id/drivers", func(c *gin.Context) {
		playerID := c.Param("player_id")
		leagueID := c.Query("league_id")
		if playerID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros player_id o league_id"})
			return
		}
		var pilotsByLeague []models.PilotByLeague
		if err := database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&pilotsByLeague).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo pilotos"})
			return
		}
		var result []map[string]interface{}
		for _, pbl := range pilotsByLeague {
			var pilot models.Pilot
			database.DB.First(&pilot, pbl.PilotID)
			item := map[string]interface{}{
				"id":             pilot.ID,
				"driver_name":    pilot.DriverName,
				"team":           pilot.Team,
				"image_url":      pilot.ImageURL,
				"mode":           pilot.Mode,
				"total_points":   pilot.TotalPoints,
				"value":          pilot.Value,
				"clausulatime":   pbl.Clausulatime,
				"clausula_value": pbl.ClausulaValue,
				"owner_id":       pbl.OwnerID,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"pilots": result})
	})

	// Endpoint para obtener la plantilla completa de un jugador (pilotos + ingenieros + equipos)
	router.GET("/api/players/:player_id/team", func(c *gin.Context) {
		playerIDStr := c.Param("player_id")
		leagueIDStr := c.Query("league_id")
		if playerIDStr == "" || leagueIDStr == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros player_id o league_id"})
			return
		}

		// Convertir a enteros para las consultas
		playerID, err := strconv.ParseUint(playerIDStr, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{"error": "player_id inválido"})
			return
		}
		leagueID, err := strconv.ParseUint(leagueIDStr, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{"error": "league_id inválido"})
			return
		}

		log.Printf("[TEAM] Obteniendo plantilla para player_id=%d, league_id=%d", playerID, leagueID)

		// Obtener PlayerByLeague para dinero y team_value
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", playerID, leagueID).First(&playerLeague).Error; err != nil {
			log.Printf("[TEAM] Error obteniendo PlayerByLeague: %v", err)
			c.JSON(404, gin.H{"error": "Jugador no encontrado en la liga"})
			return
		}

		log.Printf("[TEAM] PlayerByLeague encontrado: Money=%.2f, TeamValue=%.2f", playerLeague.Money, playerLeague.TeamValue)

		result := map[string]interface{}{
			"player_id":         playerLeague.PlayerID,
			"league_id":         playerLeague.LeagueID,
			"money":             playerLeague.Money,
			"team_value":        playerLeague.TeamValue,
			"pilots":            []map[string]interface{}{},
			"track_engineers":   []map[string]interface{}{},
			"chief_engineers":   []map[string]interface{}{},
			"team_constructors": []map[string]interface{}{},
		}

		// 1. Buscar TODOS los pilotos que tengan owner_id = playerID en esta liga
		var pilotsByLeague []models.PilotByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&pilotsByLeague)
		log.Printf("[TEAM] Pilotos con owner_id=%d encontrados: %d", playerID, len(pilotsByLeague))

		var pilots []map[string]interface{}
		for _, pbl := range pilotsByLeague {
			var pilot models.Pilot
			if err := database.DB.First(&pilot, pbl.PilotID).Error; err != nil {
				log.Printf("[TEAM] Error obteniendo pilot ID %d: %v", pbl.PilotID, err)
				continue
			}
			pilots = append(pilots, map[string]interface{}{
				"id":                 pbl.ID, // PilotByLeague.id
				"pilot_by_league_id": pbl.ID,
				"pilot_id":           pilot.ID, // Pilot.id para navegación
				"driver_name":        pilot.DriverName,
				"team":               pilot.Team,
				"image_url":          pilot.ImageURL,
				"mode":               pilot.Mode,
				"total_points":       pilot.TotalPoints,
				"value":              pilot.Value,
				"clausulatime":       pbl.Clausulatime,
				"clausula_value":     pbl.ClausulaValue,
				"owner_id":           pbl.OwnerID,
				"type":               "pilot",
			})
		}
		result["pilots"] = pilots
		log.Printf("[TEAM] %d pilotos agregados", len(pilots))

		// 2. Buscar TODOS los track engineers que tengan owner_id = playerID en esta liga
		var trackEngineersByLeague []models.TrackEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&trackEngineersByLeague)
		log.Printf("[TEAM] Track Engineers con owner_id=%d encontrados: %d", playerID, len(trackEngineersByLeague))

		var trackEngineers []map[string]interface{}
		for _, teb := range trackEngineersByLeague {
			var te models.TrackEngineer
			if err := database.DB.First(&te, teb.TrackEngineerID).Error; err != nil {
				log.Printf("[TEAM] Error obteniendo TrackEngineer ID %d: %v", teb.TrackEngineerID, err)
				continue
			}

			// Buscar piloto relacionado
			var pilot models.Pilot
			pilotTeam := ""
			if err := database.DB.Where("track_engineer_id = ?", te.ID).First(&pilot).Error; err == nil {
				pilotTeam = pilot.Team
			}

			// Arreglar ruta de imagen
			imageURL := te.ImageURL
			if imageURL != "" {
				// Limpiar cualquier prefijo existente
				imageURL = strings.TrimPrefix(imageURL, "images/ingenierosdepista/")
				imageURL = strings.TrimPrefix(imageURL, "images/")
				imageURL = strings.TrimPrefix(imageURL, "ingenierosdepista/")
				// Dejar solo el nombre del archivo
			}

			trackEngineers = append(trackEngineers, map[string]interface{}{
				"id":                  teb.ID, // TrackEngineerByLeague.id
				"track_engineer_id":   te.ID,  // TrackEngineer.id
				"name":                te.Name,
				"image_url":           imageURL,
				"value":               te.Value,
				"team":                pilotTeam,
				"owner_id":            teb.OwnerID,
				"type":                "track_engineer",
				"clausula_value":      teb.ClausulaValue,
				"clausula_expires_at": teb.Clausulatime,
			})
		}
		result["track_engineers"] = trackEngineers
		log.Printf("[TEAM] %d track engineers agregados", len(trackEngineers))

		// 3. Buscar TODOS los chief engineers que tengan owner_id = playerID en esta liga
		var chiefEngineersByLeague []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&chiefEngineersByLeague)
		log.Printf("[TEAM] Chief Engineers con owner_id=%d encontrados: %d", playerID, len(chiefEngineersByLeague))

		var chiefEngineers []map[string]interface{}
		for _, ceb := range chiefEngineersByLeague {
			var ce models.ChiefEngineer
			if err := database.DB.First(&ce, ceb.ChiefEngineerID).Error; err != nil {
				log.Printf("[TEAM] Error obteniendo ChiefEngineer ID %d: %v", ceb.ChiefEngineerID, err)
				continue
			}

			// Arreglar ruta de imagen para chief engineers
			imageURL := ce.ImageURL
			if imageURL != "" {
				// Limpiar cualquier prefijo existente
				imageURL = strings.TrimPrefix(imageURL, "images/ingenierosdepista/")
				imageURL = strings.TrimPrefix(imageURL, "images/")
				imageURL = strings.TrimPrefix(imageURL, "ingenierosdepista/")
				// Dejar solo el nombre del archivo
			}

			chiefEngineers = append(chiefEngineers, map[string]interface{}{
				"id":                  ceb.ID, // ChiefEngineerByLeague.id
				"chief_engineer_id":   ce.ID,  // ChiefEngineer.id
				"name":                ce.Name,
				"image_url":           imageURL,
				"value":               ce.Value,
				"team":                ce.Team,
				"owner_id":            ceb.OwnerID,
				"type":                "chief_engineer",
				"clausula_value":      ceb.ClausulaValue,
				"clausula_expires_at": ceb.Clausulatime,
			})
		}
		result["chief_engineers"] = chiefEngineers
		log.Printf("[TEAM] %d chief engineers agregados", len(chiefEngineers))

		// 4. Buscar TODOS los team constructors que tengan owner_id = playerID en esta liga
		var teamConstructorsByLeague []models.TeamConstructorByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&teamConstructorsByLeague)
		log.Printf("[TEAM] Team Constructors con owner_id=%d encontrados: %d", playerID, len(teamConstructorsByLeague))

		var teamConstructors []map[string]interface{}
		for _, tcb := range teamConstructorsByLeague {
			var tc models.TeamConstructor
			if err := database.DB.First(&tc, tcb.TeamConstructorID).Error; err != nil {
				log.Printf("[TEAM] Error obteniendo TeamConstructor ID %d: %v", tcb.TeamConstructorID, err)
				continue
			}

			// Arreglar ruta de imagen para team constructors
			imageURL := tc.ImageURL
			if imageURL != "" {
				// Limpiar cualquier prefijo existente
				imageURL = strings.TrimPrefix(imageURL, "images/equipos/")
				imageURL = strings.TrimPrefix(imageURL, "images/")
				imageURL = strings.TrimPrefix(imageURL, "equipos/")
				// Dejar solo el nombre del archivo
			}

			// Buscar pilotos del equipo
			var pilots []models.Pilot
			database.DB.Where("teamconstructor_id = ? AND mode = ?", tc.ID, "race").Find(&pilots)
			var pilotNames []string
			for _, pilot := range pilots {
				pilotNames = append(pilotNames, pilot.DriverName)
			}

			teamConstructors = append(teamConstructors, map[string]interface{}{
				"id":                  tcb.ID, // TeamConstructorByLeague.id
				"team_constructor_id": tc.ID,  // TeamConstructor.id
				"name":                tc.Name,
				"image_url":           imageURL,
				"value":               tc.Value,
				"team":                tc.Name,
				"pilots":              pilotNames,
				"pilot_count":         len(pilotNames),
				"owner_id":            tcb.OwnerID,
				"type":                "team_constructor",
				"clausula_value":      tcb.ClausulaValue,
				"clausula_expires_at": tcb.Clausulatime,
			})
		}
		result["team_constructors"] = teamConstructors
		log.Printf("[TEAM] %d team constructors agregados", len(teamConstructors))

		log.Printf("[TEAM] Plantilla completa enviada: %d pilotos, %d track eng, %d chief eng, %d equipos",
			len(pilots), len(trackEngineers), len(chiefEngineers), len(teamConstructors))

		c.JSON(200, gin.H{"team": result})
	})

	// Función unificada de pujas para pilotos, ingenieros y equipos
	router.POST("/api/auctions/bid", func(c *gin.Context) {
		var req struct {
			ItemType string  `json:"item_type"` // "pilot", "track_engineer", "chief_engineer", "team_constructor"
			ItemID   uint    `json:"item_id"`   // ID del elemento específico
			LeagueID uint    `json:"league_id"`
			PlayerID uint    `json:"player_id"`
			Valor    float64 `json:"valor"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		log.Printf("[BID] ===== NUEVA PUJA =====")
		log.Printf("[BID] item_type=%s, item_id=%d, league_id=%d, player_id=%d, valor=%.2f", req.ItemType, req.ItemID, req.LeagueID, req.PlayerID, req.Valor)

		var auction Auction
		if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", req.ItemType, req.ItemID, req.LeagueID, time.Now()).First(&auction).Error; err != nil {
			log.Printf("[BID] No existe subasta activa, creando nueva para %s ID %d", req.ItemType, req.ItemID)
			// No existe subasta, crearla
			auction = Auction{
				ItemType: req.ItemType,
				ItemID:   req.ItemID,
				LeagueID: req.LeagueID,
				EndTime:  time.Now().Add(24 * time.Hour),
				Bids:     []byte("[]"),
			}
			if err := database.DB.Create(&auction).Error; err != nil {
				log.Printf("[BID] ERROR creando subasta: %v", err)
				c.JSON(500, gin.H{"error": "Error creando subasta"})
				return
			}
			log.Printf("[BID] Subasta creada exitosamente: ID=%d", auction.ID)
		} else {
			log.Printf("[BID] Subasta existente encontrada: ID=%d, EndTime=%v", auction.ID, auction.EndTime)
		}
		log.Printf("[BID] Bids actuales en subasta: %s", string(auction.Bids))
		// Leer bids actuales
		var bids []Bid
		if len(auction.Bids) > 0 {
			if err := json.Unmarshal(auction.Bids, &bids); err != nil {
				log.Printf("[BID] ERROR parseando bids: %v", err)
				bids = []Bid{}
			}
		}
		log.Printf("[BID] Bids parseados: %+v", bids)

		// Buscar si el jugador ya tiene una puja
		found := false
		for i, b := range bids {
			if b.PlayerID == req.PlayerID {
				log.Printf("[BID] Actualizando puja existente de player_id=%d de %.2f a %.2f", b.PlayerID, bids[i].Valor, req.Valor)
				bids[i].Valor = req.Valor // Actualiza el valor de la puja existente
				found = true
				break
			}
		}
		if !found {
			log.Printf("[BID] Añadiendo nueva puja para player_id=%d valor=%.2f", req.PlayerID, req.Valor)
			bids = append(bids, Bid{PlayerID: req.PlayerID, Valor: req.Valor})
		}
		log.Printf("[BID] Bids después de actualizar: %+v", bids)

		bidsJSON, _ := json.Marshal(bids)
		auction.Bids = bidsJSON
		log.Printf("[BID] JSON final a guardar: %s", string(bidsJSON))

		if err := database.DB.Save(&auction).Error; err != nil {
			log.Printf("[BID] ERROR guardando subasta: %v", err)
			c.JSON(500, gin.H{"error": "Error guardando la puja"})
			return
		}
		log.Printf("[BID] Puja guardada exitosamente en subasta ID %d", auction.ID)
		c.JSON(200, gin.H{"message": "Puja registrada", "auction_id": auction.ID})
	})

	router.GET("/api/market", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		var league models.League
		if err := database.DB.First(&league, leagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Liga no encontrada"})
			return
		}

		// Verificar si necesita refrescar el mercado
		var marketItemCount int64
		err := database.DB.Model(&models.MarketItem{}).Where("league_id = ? AND is_in_market = ?", leagueID, true).Count(&marketItemCount).Error
		if err != nil {
			log.Printf("[MARKET] Error contando elementos en mercado (probablemente falta columna is_in_market): %v", err)
			// Fallback: usar el método anterior temporalmente
			shouldRefresh := league.MarketPilots == nil || len(league.MarketPilots) == 0
			if league.MarketNextRefresh == nil || league.MarketNextRefresh.Before(time.Now()) {
				shouldRefresh = true
			}
			if shouldRefresh {
				refreshMarketForLeague(league.ID)
				next := time.Now().Add(24 * time.Hour)
				league.MarketNextRefresh = &next
				database.DB.Save(&league)
			}
		} else {
			log.Printf("[MARKET] Elementos actualmente en mercado: %d", marketItemCount)
			shouldRefresh := marketItemCount == 0
			if league.MarketNextRefresh == nil || league.MarketNextRefresh.Before(time.Now()) {
				shouldRefresh = true
			}
			if shouldRefresh {
				log.Printf("[MARKET] Refrescando mercado para liga %s", leagueID)
				refreshMarketForLeague(league.ID)
				next := time.Now().Add(24 * time.Hour)
				league.MarketNextRefresh = &next
				database.DB.Save(&league)
			}
		}

		var result []map[string]interface{}

		// Obtener elementos del mercado que están marcados como is_in_market = true
		var marketItems []models.MarketItem
		database.DB.Where("league_id = ? AND is_active = ? AND is_in_market = ?", leagueID, true, true).Find(&marketItems)

		log.Printf("[MARKET] Consulta ejecutada: league_id=%s, is_active=true, is_in_market=true", leagueID)
		log.Printf("[MARKET] Elementos encontrados con is_in_market=true: %d", len(marketItems))

		// Si no hay elementos marcados, forzar refresh del mercado
		if len(marketItems) == 0 {
			log.Printf("[MARKET] No hay elementos marcados, forzando refresh del mercado")
			refreshMarketForLeague(league.ID)
			// Volver a consultar después del refresh
			database.DB.Where("league_id = ? AND is_active = ? AND is_in_market = ?", leagueID, true, true).Find(&marketItems)
			log.Printf("[MARKET] Elementos encontrados después del refresh: %d", len(marketItems))
		}

		log.Printf("[MARKET] Elementos en el mercado para liga %s: %d", leagueID, len(marketItems))
		for _, item := range marketItems {
			log.Printf("[MARKET] - Tipo: %s, ItemID: %d", item.ItemType, item.ItemID)
		}

		for _, item := range marketItems {

			switch item.ItemType {
			case "pilot":
				var pbl models.PilotByLeague
				if err := database.DB.First(&pbl, item.ItemID).Error; err != nil {
					continue
				}
				var pilot models.Pilot
				if err := database.DB.First(&pilot, pbl.PilotID).Error; err != nil {
					continue
				}

				// Buscar subasta activa
				var auction Auction
				numBids := 0
				if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", "pilot", pbl.ID, pbl.LeagueID, time.Now()).First(&auction).Error; err == nil {
					if auction.Bids != nil && len(auction.Bids) > 0 {
						var bids []Bid
						_ = json.Unmarshal(auction.Bids, &bids)
						numBids = len(bids)
					}
					log.Printf("[MARKET] Subasta encontrada para pilot ID %d: %d pujas", pbl.ID, numBids)
				} else {
					log.Printf("[MARKET] No hay subasta activa para pilot ID %d: %v", pbl.ID, err)
				}

				marketItem := map[string]interface{}{
					"id":             pbl.ID,
					"type":           "pilot",
					"pilot_id":       pilot.ID,
					"driver_name":    pilot.DriverName,
					"team":           pilot.Team,
					"image_url":      pilot.ImageURL,
					"mode":           pilot.Mode,
					"total_points":   pilot.TotalPoints,
					"value":          pilot.Value,
					"num_bids":       numBids,
					"owner_id":       pbl.OwnerID,
					"is_direct_sale": false,
				}
				result = append(result, marketItem)

			case "track_engineer":
				var teb models.TrackEngineerByLeague
				if err := database.DB.First(&teb, item.ItemID).Error; err != nil {
					continue
				}
				var te models.TrackEngineer
				if err := database.DB.First(&te, teb.TrackEngineerID).Error; err != nil {
					continue
				}

				// Buscar piloto relacionado si existe
				var pilot models.Pilot
				pilotName := ""
				pilotTeam := ""
				if err := database.DB.Where("track_engineer_id = ?", te.ID).First(&pilot).Error; err == nil {
					pilotName = pilot.DriverName
					pilotTeam = pilot.Team
				}

				// Arreglar ruta de imagen para ingenieros de pista
				imageURL := te.ImageURL
				if imageURL != "" && !strings.Contains(imageURL, "ingenierosdepista/") {
					imageURL = "images/ingenierosdepista/" + strings.TrimPrefix(imageURL, "images/")
				}

				// Buscar subasta activa
				var auction Auction
				numBids := 0
				log.Printf("[MARKET] Buscando subasta para track_engineer: item_type=track_engineer, item_id=%d, league_id=%d", teb.ID, teb.LeagueID)
				if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", "track_engineer", teb.ID, teb.LeagueID, time.Now()).First(&auction).Error; err == nil {
					log.Printf("[MARKET] Subasta encontrada: ID=%d, Bids=%s", auction.ID, string(auction.Bids))
					if auction.Bids != nil && len(auction.Bids) > 0 && string(auction.Bids) != "[]" {
						var bids []Bid
						if err := json.Unmarshal(auction.Bids, &bids); err == nil {
							numBids = len(bids)
							log.Printf("[MARKET] Bids parseados correctamente: %d pujas", numBids)
						} else {
							log.Printf("[MARKET] ERROR parseando bids: %v", err)
						}
					}
					log.Printf("[MARKET] Subasta encontrada para track_engineer ID %d: %d pujas", teb.ID, numBids)
				} else {
					log.Printf("[MARKET] No hay subasta activa para track_engineer ID %d: %v", teb.ID, err)
				}

				marketItem := map[string]interface{}{
					"id":         teb.ID,
					"type":       "track_engineer",
					"name":       te.Name,
					"image_url":  imageURL,
					"value":      te.Value,
					"pilot_name": pilotName,
					"team":       pilotTeam,
					"owner_id":   teb.OwnerID,
					"num_bids":   numBids,
				}
				result = append(result, marketItem)

			case "chief_engineer":
				var ceb models.ChiefEngineerByLeague
				if err := database.DB.First(&ceb, item.ItemID).Error; err != nil {
					continue
				}
				var ce models.ChiefEngineer
				if err := database.DB.First(&ce, ceb.ChiefEngineerID).Error; err != nil {
					continue
				}

				// Buscar subasta activa
				var auction Auction
				numBids := 0
				log.Printf("[MARKET] Buscando subasta para chief_engineer: item_type=chief_engineer, item_id=%d, league_id=%d", ceb.ID, ceb.LeagueID)
				if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", "chief_engineer", ceb.ID, ceb.LeagueID, time.Now()).First(&auction).Error; err == nil {
					log.Printf("[MARKET] Subasta encontrada: ID=%d, Bids=%s", auction.ID, string(auction.Bids))
					if auction.Bids != nil && len(auction.Bids) > 0 && string(auction.Bids) != "[]" {
						var bids []Bid
						if err := json.Unmarshal(auction.Bids, &bids); err == nil {
							numBids = len(bids)
							log.Printf("[MARKET] Bids parseados correctamente: %d pujas", numBids)
						} else {
							log.Printf("[MARKET] ERROR parseando bids: %v", err)
						}
					}
					log.Printf("[MARKET] Subasta encontrada para chief_engineer ID %d: %d pujas", ceb.ID, numBids)
				} else {
					log.Printf("[MARKET] No hay subasta activa para chief_engineer ID %d: %v", ceb.ID, err)
				}

				marketItem := map[string]interface{}{
					"id":        ceb.ID,
					"type":      "chief_engineer",
					"name":      ce.Name,
					"image_url": ce.ImageURL,
					"value":     ce.Value,
					"team":      ce.Team,
					"owner_id":  ceb.OwnerID,
					"num_bids":  numBids,
				}
				result = append(result, marketItem)

			case "team_constructor":
				var tcb models.TeamConstructorByLeague
				if err := database.DB.First(&tcb, item.ItemID).Error; err != nil {
					continue
				}
				var tc models.TeamConstructor
				if err := database.DB.First(&tc, tcb.TeamConstructorID).Error; err != nil {
					continue
				}

				// Buscar pilotos relacionados con este equipo
				var pilots []models.Pilot
				database.DB.Where("teamconstructor_id = ? AND mode = ?", tc.ID, "race").Find(&pilots)

				var pilotNames []string
				for _, pilot := range pilots {
					pilotNames = append(pilotNames, pilot.DriverName)
				}

				// Buscar subasta activa
				var auction Auction
				numBids := 0
				if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", "team_constructor", tcb.ID, tcb.LeagueID, time.Now()).First(&auction).Error; err == nil {
					if auction.Bids != nil && len(auction.Bids) > 0 {
						var bids []Bid
						_ = json.Unmarshal(auction.Bids, &bids)
						numBids = len(bids)
					}
					log.Printf("[MARKET] Subasta encontrada para team_constructor ID %d: %d pujas", tcb.ID, numBids)
				} else {
					log.Printf("[MARKET] No hay subasta activa para team_constructor ID %d: %v", tcb.ID, err)
				}

				marketItem := map[string]interface{}{
					"id":          tcb.ID,
					"type":        "team_constructor",
					"name":        tc.Name,
					"image_url":   tc.ImageURL,
					"value":       tc.Value,
					"owner_id":    tcb.OwnerID,
					"pilots":      pilotNames,
					"pilot_count": len(pilotNames),
					"team":        tc.Name, // Añadir el nombre del equipo para los colores
					"num_bids":    numBids,
				}
				result = append(result, marketItem)
			}
		}

		log.Printf("[MARKET] Elementos enviados al frontend: %d", len(result))
		c.JSON(200, gin.H{"market": result})
	})

	router.POST("/api/market/refresh", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		id, _ := strconv.ParseUint(leagueID, 10, 64)
		// Eliminar subastas antiguas/finalizadas
		database.DB.Where("league_id = ?", id).Delete(&Auction{})
		refreshMarketForLeague(uint(id))
		updateMarketNextRefresh() // Reinicia el contador de 24h
		c.JSON(200, gin.H{"message": "Mercado reiniciado"})
	})

	// Endpoint para refrescar el mercado y finalizar subastas activas con pujas
	router.POST("/api/market/refresh-and-finish", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}

		log.Printf("[REFRESH-AND-FINISH] ===== INICIANDO FINALIZACIÓN =====")
		log.Printf("[REFRESH-AND-FINISH] LeagueID: %s", leagueID)
		log.Printf("[REFRESH-AND-FINISH] Tiempo actual: %v", time.Now())

		// Primero buscar TODAS las subastas de la liga (incluso las expiradas)
		var allAuctions []Auction
		database.DB.Where("league_id = ?", leagueID).Find(&allAuctions)
		log.Printf("[REFRESH-AND-FINISH] Total subastas en la liga: %d", len(allAuctions))

		for i, auction := range allAuctions {
			log.Printf("[REFRESH-AND-FINISH] Subasta %d: ID=%d, Type=%s, ItemID=%d, EndTime=%v, Activa=%t",
				i+1, auction.ID, auction.ItemType, auction.ItemID, auction.EndTime, auction.EndTime.After(time.Now()))
		}

		// Ahora buscar solo las activas
		var auctions []Auction
		database.DB.Where("league_id = ? AND end_time > ?", leagueID, time.Now()).Find(&auctions)
		log.Printf("[REFRESH-AND-FINISH] Subastas activas encontradas: %d", len(auctions))
		finalizados := 0
		for i, auction := range auctions {
			log.Printf("[REFRESH-AND-FINISH] Procesando subasta %d/%d: ID=%d, Type=%s, ItemID=%d",
				i+1, len(auctions), auction.ID, auction.ItemType, auction.ItemID)

			// Buscar bids
			var bids []Bid
			if len(auction.Bids) > 0 {
				if err := json.Unmarshal(auction.Bids, &bids); err != nil {
					log.Printf("[REFRESH-AND-FINISH] ERROR parseando bids de subasta %d: %v", auction.ID, err)
					continue
				}
			}
			log.Printf("[REFRESH-AND-FINISH] Bids encontrados: %d - %+v", len(bids), bids)

			if len(bids) == 0 {
				log.Printf("[REFRESH-AND-FINISH] No hay pujas en subasta %d, saltando", auction.ID)
				continue // No hay pujas, no se asigna
			}
			// Buscar la puja más alta
			maxBid := bids[0]
			for _, bid := range bids {
				if bid.Valor > maxBid.Valor {
					maxBid = bid
				}
			}

			log.Printf("[REFRESH-AND-FINISH] Procesando subasta %s ID %d, ganador: %d, valor: %.2f", auction.ItemType, auction.ItemID, maxBid.PlayerID, maxBid.Valor)

			// Verificar que el ganador tenga suficiente dinero
			var playerLeague models.PlayerByLeague
			if err := database.DB.Where("player_id = ? AND league_id = ?", maxBid.PlayerID, auction.LeagueID).First(&playerLeague).Error; err != nil {
				log.Printf("[REFRESH-AND-FINISH] Error: jugador %d no encontrado en liga %d", maxBid.PlayerID, auction.LeagueID)
				continue
			}
			if playerLeague.Money < float64(maxBid.Valor) {
				log.Printf("[REFRESH-AND-FINISH] Error: jugador %d no tiene suficiente dinero (%.2f < %.2f)", maxBid.PlayerID, playerLeague.Money, maxBid.Valor)
				continue
			}

			// Descontar dinero
			playerLeague.Money -= float64(maxBid.Valor)

			// Asignar según el tipo
			switch auction.ItemType {
			case "pilot":
				var pbl models.PilotByLeague
				if err := database.DB.First(&pbl, auction.ItemID).Error; err != nil {
					log.Printf("[REFRESH-AND-FINISH] Error: pilot_by_league %d no encontrado", auction.ItemID)
					continue
				}
				pbl.OwnerID = maxBid.PlayerID
				database.DB.Save(&pbl)

				// El owner_id ya se actualizó arriba, no necesitamos actualizar columnas JSON
				log.Printf("[REFRESH-AND-FINISH] Pilot ownership actualizado correctamente")

				// Actualizar team_value
				var pilot models.Pilot
				if err := database.DB.First(&pilot, pbl.PilotID).Error; err == nil {
					playerLeague.TeamValue += pilot.Value
				}

				// Guardar histórico
				errHist := database.DB.Exec(`INSERT INTO pilot_value_history (pilot_id, pilot_by_league_id, league_id, player_id, valor_pagado, fecha, tipo, counterparty_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, pbl.PilotID, pbl.ID, pbl.LeagueID, maxBid.PlayerID, maxBid.Valor, time.Now(), "fichaje", 0).Error
				if errHist != nil {
					log.Printf("[REFRESH-AND-FINISH] Error guardando histórico pilot: %v", errHist)
				}

				// Actualizar cláusula
				if pbl.ClausulaValue == nil || maxBid.Valor > *pbl.ClausulaValue {
					pbl.ClausulaValue = &maxBid.Valor
				}
				clausulaExpira := auction.EndTime.Add(14 * 24 * time.Hour)
				pbl.Clausulatime = &clausulaExpira
				database.DB.Save(&pbl)

				// Generar oferta de la FIA automáticamente después de la compra
				if err := database.DB.First(&pilot, pbl.PilotID).Error; err == nil {
					// Generar oferta entre 90% y 110% del valor de la puja ganadora
					fiaOfferValue := generateFIAOffer(maxBid.Valor)

					// Crear la oferta de la FIA con ID especial
					fiaBid := Bid{
						PlayerID: FIA_PLAYER_ID, // ID especial de la FIA
						Valor:    fiaOfferValue,
					}

					// Guardar en el campo bids
					bidsJSON, _ := json.Marshal([]Bid{fiaBid})
					pbl.Bids = bidsJSON
					database.DB.Save(&pbl)

					log.Printf("[REFRESH-AND-FINISH] Oferta de la FIA generada para piloto %s: %.2f€ (valor puja: %.2f€) - Propietario: %d", pilot.DriverName, fiaOfferValue, maxBid.Valor, pbl.OwnerID)
				}

			case "track_engineer":
				var teb models.TrackEngineerByLeague
				if err := database.DB.First(&teb, auction.ItemID).Error; err != nil {
					log.Printf("[REFRESH-AND-FINISH] Error: track_engineer_by_league %d no encontrado", auction.ItemID)
					continue
				}
				log.Printf("[REFRESH-AND-FINISH] Track Engineer encontrado: ID=%d, TrackEngineerID=%d, OwnerID actual=%d", teb.ID, teb.TrackEngineerID, teb.OwnerID)

				teb.OwnerID = maxBid.PlayerID
				// --- CLAUSULA ---
				if teb.ClausulaValue == nil || float64(maxBid.Valor) > *teb.ClausulaValue {
					clausula := float64(maxBid.Valor)
					teb.ClausulaValue = &clausula
				}
				clausulaExpira := auction.EndTime.Add(14 * 24 * time.Hour)
				teb.Clausulatime = &clausulaExpira
				// --- FIN CLAUSULA ---
				database.DB.Save(&teb)
				log.Printf("[REFRESH-AND-FINISH] Track Engineer owner actualizado a: %d", maxBid.PlayerID)

				// El owner_id ya se actualizó arriba, no necesitamos actualizar columnas JSON
				log.Printf("[REFRESH-AND-FINISH] Track Engineer ownership actualizado correctamente")

				// Actualizar team_value
				var te models.TrackEngineer
				if err := database.DB.First(&te, teb.TrackEngineerID).Error; err == nil {
					log.Printf("[REFRESH-AND-FINISH] Sumando valor del track engineer: %.2f", te.Value)
					playerLeague.TeamValue += te.Value
				} else {
					log.Printf("[REFRESH-AND-FINISH] Error obteniendo TrackEngineer ID %d: %v", teb.TrackEngineerID, err)
				}

				// Generar oferta de la FIA automáticamente después de la compra
				if err := database.DB.First(&te, teb.TrackEngineerID).Error; err == nil {
					// Generar oferta entre 90% y 110% del valor de la puja ganadora
					fiaOfferValue := generateFIAOffer(maxBid.Valor)

					// Crear la oferta de la FIA con ID especial
					fiaBid := Bid{
						PlayerID: FIA_PLAYER_ID, // ID especial de la FIA
						Valor:    fiaOfferValue,
					}

					// Guardar en el campo bids
					bidsJSON, _ := json.Marshal([]Bid{fiaBid})
					teb.Bids = bidsJSON
					database.DB.Save(&teb)

					log.Printf("[REFRESH-AND-FINISH] Oferta de la FIA generada para track engineer %s: %.2f€ (valor puja: %.2f€) - Propietario: %d", te.Name, fiaOfferValue, maxBid.Valor, teb.OwnerID)
				}

			case "chief_engineer":
				var ceb models.ChiefEngineerByLeague
				if err := database.DB.First(&ceb, auction.ItemID).Error; err != nil {
					log.Printf("[REFRESH-AND-FINISH] Error: chief_engineer_by_league %d no encontrado", auction.ItemID)
					continue
				}
				log.Printf("[REFRESH-AND-FINISH] Chief Engineer encontrado: ID=%d, ChiefEngineerID=%d, OwnerID actual=%d", ceb.ID, ceb.ChiefEngineerID, ceb.OwnerID)

				ceb.OwnerID = maxBid.PlayerID
				// --- CLAUSULA ---
				if ceb.ClausulaValue == nil || float64(maxBid.Valor) > *ceb.ClausulaValue {
					clausula := float64(maxBid.Valor)
					ceb.ClausulaValue = &clausula
				}
				clausulaExpira := auction.EndTime.Add(14 * 24 * time.Hour)
				ceb.Clausulatime = &clausulaExpira
				// --- FIN CLAUSULA ---
				database.DB.Save(&ceb)
				log.Printf("[REFRESH-AND-FINISH] Chief Engineer owner actualizado a: %d", maxBid.PlayerID)

				// El owner_id ya se actualizó arriba, no necesitamos actualizar columnas JSON
				log.Printf("[REFRESH-AND-FINISH] Chief Engineer ownership actualizado correctamente")

				// Actualizar team_value
				var ce models.ChiefEngineer
				if err := database.DB.First(&ce, ceb.ChiefEngineerID).Error; err == nil {
					log.Printf("[REFRESH-AND-FINISH] Sumando valor del chief engineer: %.2f", ce.Value)
					playerLeague.TeamValue += ce.Value
				} else {
					log.Printf("[REFRESH-AND-FINISH] Error obteniendo ChiefEngineer ID %d: %v", ceb.ChiefEngineerID, err)
				}

				// Generar oferta de la FIA automáticamente después de la compra
				if err := database.DB.First(&ce, ceb.ChiefEngineerID).Error; err == nil {
					// Generar oferta entre 90% y 110% del valor de la puja ganadora
					fiaOfferValue := generateFIAOffer(maxBid.Valor)

					// Crear la oferta de la FIA con ID especial
					fiaBid := Bid{
						PlayerID: FIA_PLAYER_ID, // ID especial de la FIA
						Valor:    fiaOfferValue,
					}

					// Guardar en el campo bids
					bidsJSON, _ := json.Marshal([]Bid{fiaBid})
					ceb.Bids = bidsJSON
					database.DB.Save(&ceb)

					log.Printf("[REFRESH-AND-FINISH] Oferta de la FIA generada para chief engineer %s: %.2f€ (valor puja: %.2f€) - Propietario: %d", ce.Name, fiaOfferValue, maxBid.Valor, ceb.OwnerID)
				}

			case "team_constructor":
				var tcb models.TeamConstructorByLeague
				if err := database.DB.First(&tcb, auction.ItemID).Error; err != nil {
					log.Printf("[REFRESH-AND-FINISH] Error: team_constructor_by_league %d no encontrado", auction.ItemID)
					continue
				}
				log.Printf("[REFRESH-AND-FINISH] Team Constructor encontrado: ID=%d, TeamConstructorID=%d, OwnerID actual=%d", tcb.ID, tcb.TeamConstructorID, tcb.OwnerID)

				tcb.OwnerID = maxBid.PlayerID
				// --- CLAUSULA ---
				if tcb.ClausulaValue == nil || float64(maxBid.Valor) > *tcb.ClausulaValue {
					clausula := float64(maxBid.Valor)
					tcb.ClausulaValue = &clausula
				}
				clausulaExpira := auction.EndTime.Add(14 * 24 * time.Hour)
				tcb.Clausulatime = &clausulaExpira
				// --- FIN CLAUSULA ---
				database.DB.Save(&tcb)
				log.Printf("[REFRESH-AND-FINISH] Team Constructor owner actualizado a: %d", maxBid.PlayerID)

				// El owner_id ya se actualizó arriba, no necesitamos actualizar columnas JSON
				log.Printf("[REFRESH-AND-FINISH] Team Constructor ownership actualizado correctamente")

				// Actualizar team_value
				var tc models.TeamConstructor
				if err := database.DB.First(&tc, tcb.TeamConstructorID).Error; err == nil {
					log.Printf("[REFRESH-AND-FINISH] Sumando valor del team constructor: %.2f", tc.Value)
					playerLeague.TeamValue += tc.Value
				} else {
					log.Printf("[REFRESH-AND-FINISH] Error obteniendo TeamConstructor ID %d: %v", tcb.TeamConstructorID, err)
				}

				// Generar oferta de la FIA automáticamente después de la compra
				if err := database.DB.First(&tc, tcb.TeamConstructorID).Error; err == nil {
					// Generar oferta entre 90% y 110% del valor de la puja ganadora
					fiaOfferValue := generateFIAOffer(maxBid.Valor)

					// Crear la oferta de la FIA con ID especial
					fiaBid := Bid{
						PlayerID: FIA_PLAYER_ID, // ID especial de la FIA
						Valor:    fiaOfferValue,
					}

					// Guardar en el campo bids
					bidsJSON, _ := json.Marshal([]Bid{fiaBid})
					tcb.Bids = bidsJSON
					database.DB.Save(&tcb)

					log.Printf("[REFRESH-AND-FINISH] Oferta de la FIA generada para team constructor %s: %.2f€ (valor puja: %.2f€) - Propietario: %d", tc.Name, fiaOfferValue, maxBid.Valor, tcb.OwnerID)
				}
			}

			// Guardar el player_by_league actualizado
			database.DB.Save(&playerLeague)
			finalizados++

			log.Printf("[REFRESH-AND-FINISH] Subasta finalizada exitosamente: %s ID %d -> Player %d", auction.ItemType, auction.ItemID, maxBid.PlayerID)
		}
		// Eliminar subastas antiguas/finalizadas
		id, _ := strconv.ParseUint(leagueID, 10, 64)
		database.DB.Where("league_id = ?", id).Delete(&Auction{})
		refreshMarketForLeague(uint(id))
		updateMarketNextRefresh()

		// Generar ofertas de la FIA para elementos en venta después de finalizar subastas
		log.Printf("[REFRESH-AND-FINISH] Generando ofertas de la FIA para elementos en venta")
		if err := generateFIAOffersForLeague(uint(id)); err != nil {
			log.Printf("[REFRESH-AND-FINISH] Error generando ofertas FIA: %v", err)
		} else {
			log.Printf("[REFRESH-AND-FINISH] Ofertas de la FIA generadas correctamente")
		}

		c.JSON(200, gin.H{"message": "Mercado reiniciado y subastas finalizadas", "finalizadas": finalizados})
	})

	// Endpoint para generar ofertas de la FIA manualmente (cada 24 horas)
	router.POST("/api/generate-fia-offers", authMiddleware(), func(c *gin.Context) {
		// Verificar que el usuario es admin
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}

		// Verificar si el usuario es admin
		var player models.Player
		if err := database.DB.First(&player, userID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Usuario no encontrado"})
			return
		}
		if !player.IsAdmin {
			c.JSON(403, gin.H{"error": "No tienes permisos de administrador"})
			return
		}

		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}

		id, err := strconv.ParseUint(leagueID, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "league_id inválido"})
			return
		}

		log.Printf("[FIA-OFFERS] Generando ofertas de la FIA para liga %d", id)

		if err := generateFIAOffersForLeague(uint(id)); err != nil {
			log.Printf("[FIA-OFFERS] Error generando ofertas FIA: %v", err)
			c.JSON(500, gin.H{"error": "Error generando ofertas de la FIA"})
			return
		}

		log.Printf("[FIA-OFFERS] Ofertas de la FIA generadas correctamente para liga %d", id)
		c.JSON(200, gin.H{"message": "Ofertas de la FIA generadas correctamente"})
	})

	// Endpoint para generar ofertas de la FIA para elementos con propietario
	router.POST("/api/generate-fia-offers-owned", authMiddleware(), func(c *gin.Context) {
		// Verificar que el usuario es admin
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}

		// Verificar si el usuario es admin
		var player models.Player
		if err := database.DB.First(&player, userID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Usuario no encontrado"})
			return
		}
		if !player.IsAdmin {
			c.JSON(403, gin.H{"error": "No tienes permisos de administrador"})
			return
		}

		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}

		id, err := strconv.ParseUint(leagueID, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "league_id inválido"})
			return
		}

		log.Printf("[FIA-OWNED-OFFERS] Generando ofertas de la FIA para elementos con propietario en liga %d", id)

		if err := generateFIAOffersForOwnedItems(uint(id)); err != nil {
			log.Printf("[FIA-OWNED-OFFERS] Error generando ofertas FIA: %v", err)
			c.JSON(500, gin.H{"error": "Error generando ofertas de la FIA"})
			return
		}

		log.Printf("[FIA-OWNED-OFFERS] Ofertas de la FIA generadas correctamente para elementos con propietario en liga %d", id)
		c.JSON(200, gin.H{"message": "Ofertas de la FIA generadas correctamente para elementos con propietario"})
	})

	// NOTA: Se eliminó la generación automática de ofertas de la FIA cada 24 horas
	// Ahora las ofertas de la FIA solo se generan:
	// 1. Manualmente con el botón "Generar Ofertas FIA" (admin)
	// 2. Automáticamente después de finalizar subastas

	router.GET("/api/market/next-refresh", func(c *gin.Context) {
		c.JSON(200, gin.H{"next_refresh": marketNextRefresh.Unix()})
	})

	// Endpoint para obtener información de cláusulas de un jugador en una liga
	router.GET("/api/player/clausulas", authMiddleware(), func(c *gin.Context) {
		userID := c.GetUint("user_id")
		leagueID := c.Query("league_id")

		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}

		leagueIDUint, err := strconv.ParseUint(leagueID, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{"error": "league_id inválido"})
			return
		}

		var result []map[string]interface{}

		// Obtener pilotos con cláusulas activas
		var pilotsWithClausulas []models.PilotByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND clausulatime IS NOT NULL AND clausulatime > ?", leagueIDUint, userID, time.Now()).Find(&pilotsWithClausulas)

		for _, pbl := range pilotsWithClausulas {
			var pilot models.Pilot
			if err := database.DB.First(&pilot, pbl.PilotID).Error; err != nil {
				continue
			}

			// Calcular días restantes
			daysLeft := int(pbl.Clausulatime.Sub(time.Now()).Hours() / 24)
			if daysLeft < 0 {
				daysLeft = 0
			}

			item := map[string]interface{}{
				"id":                  pbl.ID,
				"type":                "pilot",
				"name":                pilot.DriverName,
				"team":                pilot.Team,
				"image_url":           pilot.ImageURL,
				"clausula_value":      pbl.ClausulaValue,
				"clausula_expires_at": pbl.Clausulatime,
				"days_left":           daysLeft,
			}
			result = append(result, item)
		}

		// Obtener track engineers con cláusulas activas
		var trackEngineersWithClausulas []models.TrackEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND clausula_expires_at IS NOT NULL AND clausula_expires_at > ?", leagueIDUint, userID, time.Now()).Find(&trackEngineersWithClausulas)

		for _, teb := range trackEngineersWithClausulas {
			var te models.TrackEngineer
			if err := database.DB.First(&te, teb.TrackEngineerID).Error; err != nil {
				continue
			}

			// Calcular días restantes
			daysLeft := int(teb.Clausulatime.Sub(time.Now()).Hours() / 24)
			if daysLeft < 0 {
				daysLeft = 0
			}

			item := map[string]interface{}{
				"id":                  teb.ID,
				"type":                "track_engineer",
				"name":                te.Name,
				"team":                te.Name, // Track engineers no tienen equipo específico
				"image_url":           te.ImageURL,
				"clausula_value":      teb.ClausulaValue,
				"clausula_expires_at": teb.Clausulatime,
				"days_left":           daysLeft,
			}
			result = append(result, item)
		}

		// Obtener chief engineers con cláusulas activas
		var chiefEngineersWithClausulas []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND clausula_expires_at IS NOT NULL AND clausula_expires_at > ?", leagueIDUint, userID, time.Now()).Find(&chiefEngineersWithClausulas)

		for _, ceb := range chiefEngineersWithClausulas {
			var ce models.ChiefEngineer
			if err := database.DB.First(&ce, ceb.ChiefEngineerID).Error; err != nil {
				continue
			}

			// Calcular días restantes
			daysLeft := int(ceb.Clausulatime.Sub(time.Now()).Hours() / 24)
			if daysLeft < 0 {
				daysLeft = 0
			}

			item := map[string]interface{}{
				"id":                  ceb.ID,
				"type":                "chief_engineer",
				"name":                ce.Name,
				"team":                ce.Team,
				"image_url":           ce.ImageURL,
				"clausula_value":      ceb.ClausulaValue,
				"clausula_expires_at": ceb.Clausulatime,
				"days_left":           daysLeft,
			}
			result = append(result, item)
		}

		// Obtener team constructors con cláusulas activas
		var teamConstructorsWithClausulas []models.TeamConstructorByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND clausula_expires_at IS NOT NULL AND clausula_expires_at > ?", leagueIDUint, userID, time.Now()).Find(&teamConstructorsWithClausulas)

		for _, tcb := range teamConstructorsWithClausulas {
			var tc models.TeamConstructor
			if err := database.DB.First(&tc, tcb.TeamConstructorID).Error; err != nil {
				continue
			}

			// Calcular días restantes
			daysLeft := int(tcb.Clausulatime.Sub(time.Now()).Hours() / 24)
			if daysLeft < 0 {
				daysLeft = 0
			}

			item := map[string]interface{}{
				"id":                  tcb.ID,
				"type":                "team_constructor",
				"name":                tc.Name,
				"team":                tc.Name,
				"image_url":           tc.ImageURL,
				"clausula_value":      tcb.ClausulaValue,
				"clausula_expires_at": tcb.Clausulatime,
				"days_left":           daysLeft,
			}
			result = append(result, item)
		}

		c.JSON(200, gin.H{"clausulas": result})
	})

	// Endpoint temporal para debug - verificar estado de player_by_league
	router.GET("/api/debug/playerbyleague", func(c *gin.Context) {
		playerID := c.Query("player_id")
		leagueID := c.Query("league_id")
		if playerID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros player_id o league_id"})
			return
		}
		var pbLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", playerID, leagueID).First(&pbLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "No encontrado"})
			return
		}
		log.Printf("[DEBUG] PlayerByLeague encontrado:")
		log.Printf("[DEBUG] - PlayerID: %d, LeagueID: %d", pbLeague.PlayerID, pbLeague.LeagueID)
		log.Printf("[DEBUG] - OwnedPilots: %s", pbLeague.OwnedPilots)
		log.Printf("[DEBUG] - OwnedTrackEngineers: %s", pbLeague.OwnedTrackEngineers)
		log.Printf("[DEBUG] - OwnedChiefEngineers: %s", pbLeague.OwnedChiefEngineers)
		log.Printf("[DEBUG] - OwnedTeamConstructors: %s", pbLeague.OwnedTeamConstructors)
		c.JSON(200, gin.H{"player_by_league": pbLeague})
	})

	// Endpoint para consultar el saldo y datos de un jugador en una liga
	router.GET("/api/playerbyleague", func(c *gin.Context) {
		playerID := c.Query("player_id")
		leagueID := c.Query("league_id")
		if playerID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros player_id o league_id"})
			return
		}
		var pbLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", playerID, leagueID).First(&pbLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "No encontrado"})
			return
		}
		c.JSON(200, gin.H{"player_by_league": pbLeague})
	})

	// Endpoint de debug para verificar datos específicos
	router.GET("/api/debug/teamconstructor", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		playerID := c.Query("player_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}

		// Obtener PlayerByLeague para ver qué IDs tiene
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", playerID, leagueID).First(&playerLeague).Error; err == nil {
			log.Printf("[DEBUG] PlayerByLeague encontrado:")
			log.Printf("[DEBUG] - OwnedTeamConstructors: %s", playerLeague.OwnedTeamConstructors)
			log.Printf("[DEBUG] - OwnedTrackEngineers: %s", playerLeague.OwnedTrackEngineers)
			log.Printf("[DEBUG] - OwnedChiefEngineers: %s", playerLeague.OwnedChiefEngineers)
		}

		var teamConstructors []models.TeamConstructorByLeague
		database.DB.Where("league_id = ?", leagueID).Find(&teamConstructors)

		var result []map[string]interface{}
		for _, tcb := range teamConstructors {
			var tc models.TeamConstructor
			database.DB.First(&tc, tcb.TeamConstructorID)

			result = append(result, map[string]interface{}{
				"id":                  tcb.ID,
				"team_constructor_id": tcb.TeamConstructorID,
				"owner_id":            tcb.OwnerID,
				"league_id":           tcb.LeagueID,
				"team_name":           tc.Name,
				"team_id":             tc.ID,
			})
		}

		c.JSON(200, gin.H{
			"player_by_league":  playerLeague,
			"team_constructors": result,
		})
	})

	// Endpoint para sincronizar ownership entre tablas
	router.POST("/api/sync-ownership", func(c *gin.Context) {
		playerID := c.Query("player_id")
		leagueID := c.Query("league_id")
		if playerID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros player_id o league_id"})
			return
		}

		log.Printf("[SYNC] Sincronizando ownership para player_id=%s, league_id=%s", playerID, leagueID)

		// Obtener PlayerByLeague
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", playerID, leagueID).First(&playerLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "PlayerByLeague no encontrado"})
			return
		}

		// Sincronizar track engineers
		var trackEngineers []models.TrackEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&trackEngineers)
		var trackEngIDs []uint
		for _, te := range trackEngineers {
			trackEngIDs = append(trackEngIDs, te.ID)
		}
		trackEngJSON, _ := json.Marshal(trackEngIDs)
		playerLeague.OwnedTrackEngineers = string(trackEngJSON)
		log.Printf("[SYNC] Track Engineers sincronizados: %v", trackEngIDs)

		// Sincronizar chief engineers
		var chiefEngineers []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&chiefEngineers)
		var chiefEngIDs []uint
		for _, ce := range chiefEngineers {
			chiefEngIDs = append(chiefEngIDs, ce.ID)
		}
		chiefEngJSON, _ := json.Marshal(chiefEngIDs)
		playerLeague.OwnedChiefEngineers = string(chiefEngJSON)
		log.Printf("[SYNC] Chief Engineers sincronizados: %v", chiefEngIDs)

		// Sincronizar team constructors
		var teamConstructors []models.TeamConstructorByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&teamConstructors)
		var teamConsIDs []uint
		for _, tc := range teamConstructors {
			teamConsIDs = append(teamConsIDs, tc.ID)
		}
		teamConsJSON, _ := json.Marshal(teamConsIDs)
		playerLeague.OwnedTeamConstructors = string(teamConsJSON)
		log.Printf("[SYNC] Team Constructors sincronizados: %v", teamConsIDs)

		// Guardar cambios
		if err := database.DB.Save(&playerLeague).Error; err != nil {
			log.Printf("[SYNC] ERROR guardando PlayerByLeague: %v", err)
			c.JSON(500, gin.H{"error": "Error guardando cambios"})
			return
		}

		c.JSON(200, gin.H{
			"message":           "Sincronización completada",
			"track_engineers":   trackEngIDs,
			"chief_engineers":   chiefEngIDs,
			"team_constructors": teamConsIDs,
		})
	})

	// Endpoint para arreglar manualmente el owner_id de un elemento específico
	router.POST("/api/fix-ownership", func(c *gin.Context) {
		var req struct {
			PlayerID uint   `json:"player_id"`
			LeagueID uint   `json:"league_id"`
			ItemType string `json:"item_type"`
			ItemID   uint   `json:"item_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[FIX] Arreglando ownership: PlayerID=%d, LeagueID=%d, ItemType=%s, ItemID=%d",
			req.PlayerID, req.LeagueID, req.ItemType, req.ItemID)

		switch req.ItemType {
		case "team_constructor":
			var tcb models.TeamConstructorByLeague
			if err := database.DB.Where("id = ? AND league_id = ?", req.ItemID, req.LeagueID).First(&tcb).Error; err != nil {
				c.JSON(404, gin.H{"error": "TeamConstructorByLeague no encontrado"})
				return
			}
			tcb.OwnerID = req.PlayerID
			if err := database.DB.Save(&tcb).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error guardando TeamConstructorByLeague"})
				return
			}
			log.Printf("[FIX] TeamConstructorByLeague ID %d owner_id actualizado a %d", req.ItemID, req.PlayerID)

		case "track_engineer":
			var teb models.TrackEngineerByLeague
			if err := database.DB.Where("id = ? AND league_id = ?", req.ItemID, req.LeagueID).First(&teb).Error; err != nil {
				c.JSON(404, gin.H{"error": "TrackEngineerByLeague no encontrado"})
				return
			}
			teb.OwnerID = req.PlayerID
			if err := database.DB.Save(&teb).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error guardando TrackEngineerByLeague"})
				return
			}
			log.Printf("[FIX] TrackEngineerByLeague ID %d owner_id actualizado a %d", req.ItemID, req.PlayerID)

		case "chief_engineer":
			var ceb models.ChiefEngineerByLeague
			if err := database.DB.Where("id = ? AND league_id = ?", req.ItemID, req.LeagueID).First(&ceb).Error; err != nil {
				c.JSON(404, gin.H{"error": "ChiefEngineerByLeague no encontrado"})
				return
			}
			ceb.OwnerID = req.PlayerID
			if err := database.DB.Save(&ceb).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error guardando ChiefEngineerByLeague"})
				return
			}
			log.Printf("[FIX] ChiefEngineerByLeague ID %d owner_id actualizado a %d", req.ItemID, req.PlayerID)
		}

		c.JSON(200, gin.H{"message": "Owner_id actualizado correctamente"})
	})

	// Endpoint para unirse a una liga
	router.POST("/api/leagues/join", authMiddleware(), func(c *gin.Context) {
		var req struct {
			Code string `json:"code"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Code == "" {
			c.JSON(400, gin.H{"error": "Falta el código de la liga"})
			return
		}
		// Buscar la liga por código
		var league models.League
		if err := database.DB.Where("code = ?", req.Code).First(&league).Error; err != nil {
			c.JSON(404, gin.H{"error": "Liga no encontrada"})
			return
		}
		// Obtener el user_id del usuario autenticado
		userID, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		// Comprobar si ya existe el registro en player_by_league
		var existing models.PlayerByLeague
		err := database.DB.Where("player_id = ? AND league_id = ?", userID, league.ID).First(&existing).Error
		if err == nil {
			c.JSON(200, gin.H{"message": "Ya eres miembro de la liga"})
			return
		}
		// Crear el registro en player_by_league para el usuario
		playerByLeague := models.PlayerByLeague{
			PlayerID:              uint64(userID.(uint)),
			LeagueID:              uint64(league.ID),
			Money:                 100000000, // 100M
			TeamValue:             0,
			OwnedPilots:           "[]",
			OwnedTrackEngineers:   "[]",
			OwnedChiefEngineers:   "[]",
			OwnedTeamConstructors: "[]",
			TotalPoints:           0,
		}
		if err := database.DB.Create(&playerByLeague).Error; err != nil {
			log.Printf("Error creando player_by_league al unirse: %v", err)
			c.JSON(500, gin.H{"error": "Error al unirse a la liga"})
			return
		}
		log.Printf("Usuario %d unido a la liga %d", userID, league.ID)
		c.JSON(200, gin.H{"message": "Unido a la liga correctamente"})
	})

	// Endpoint para obtener una subasta concreta por id
	router.GET("/api/auctions/:id", func(c *gin.Context) {
		id := c.Param("id")
		leagueID := c.Query("league_id")
		var auction Auction
		if err := database.DB.First(&auction, id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Subasta no encontrada"})
			return
		}
		// Si se pasa league_id, incluir datos del piloto y la liga
		if leagueID != "" {
			var pbl models.PilotByLeague
			if err := database.DB.First(&pbl, auction.ItemID).Error; err == nil {
				var pilot models.Pilot
				database.DB.First(&pilot, pbl.PilotID)
				c.JSON(200, gin.H{"auction": auction, "pilot_by_league": pbl, "pilot": pilot})
				return
			}
		}
		c.JSON(200, gin.H{"auction": auction})
	})

	// Endpoint para obtener la subasta activa de cualquier elemento en una liga
	router.GET("/api/auctions/by-item", func(c *gin.Context) {
		itemType := c.Query("item_type")
		itemID := c.Query("item_id")
		leagueID := c.Query("league_id")
		if itemType == "" || itemID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros item_type, item_id o league_id"})
			return
		}
		var auction Auction
		if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", itemType, itemID, leagueID, time.Now()).First(&auction).Error; err != nil {
			c.JSON(404, gin.H{"error": "No hay subasta activa para este elemento"})
			return
		}
		c.JSON(200, gin.H{"auction": auction})
	})

	// Endpoint para obtener datos de pilot_by_league y piloto general por id de pilot_by_league
	router.GET("/api/pilot-by-league/:id", func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(400, gin.H{"error": "Falta id"})
			return
		}
		var pbl models.PilotByLeague
		if err := database.DB.First(&pbl, id).Error; err != nil {
			c.JSON(404, gin.H{"error": "pilot_by_league no encontrado"})
			return
		}
		var pilot models.Pilot
		database.DB.First(&pilot, pbl.PilotID)
		c.JSON(200, gin.H{"pilot_by_league": pbl, "pilot": pilot})
	})

	// Endpoint para obtener las ligas del usuario autenticado
	router.GET("/api/my-leagues", authMiddleware(), func(c *gin.Context) {
		userID, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		// Convertir userID a uint64 para que coincida con el tipo PlayerID en PlayerByLeague
		userIDUint64 := uint64(userID.(uint))
		log.Printf("[MY-LEAGUES] Buscando ligas para player_id=%d (tipo: uint64)", userIDUint64)

		var playerLeagues []models.PlayerByLeague
		database.DB.Where("player_id = ?", userIDUint64).Find(&playerLeagues)
		log.Printf("[MY-LEAGUES] PlayerByLeague registros encontrados: %d", len(playerLeagues))
		var leagueIDs []uint
		for _, pl := range playerLeagues {
			leagueIDs = append(leagueIDs, uint(pl.LeagueID))
			log.Printf("[MY-LEAGUES] Procesando PlayerByLeague: ID=%d, PlayerID=%d, LeagueID=%d", pl.ID, pl.PlayerID, pl.LeagueID)
		}
		log.Printf("[MY-LEAGUES] League IDs a buscar: %v", leagueIDs)

		var leagues []models.League
		if len(leagueIDs) > 0 {
			database.DB.Where("id IN ?", leagueIDs).Find(&leagues)
			log.Printf("[MY-LEAGUES] Ligas encontradas: %d", len(leagues))
			for _, league := range leagues {
				log.Printf("[MY-LEAGUES] Liga: ID=%d, Name=%s, Code=%s", league.ID, league.Name, league.Code)
			}
		} else {
			log.Printf("[MY-LEAGUES] No hay league IDs para buscar")
		}
		c.JSON(200, gin.H{"leagues": leagues})
	})

	// Endpoint para verificar todas las ligas con sus player_id (debug)
	router.GET("/api/leagues/debug", func(c *gin.Context) {
		var leagues []models.League
		database.DB.Find(&leagues)

		var result []map[string]interface{}
		for _, league := range leagues {
			// Buscar información del player
			var player models.Player
			playerInfo := map[string]interface{}{
				"player_id": league.PlayerID,
				"name":      "Usuario no encontrado",
				"email":     "",
			}
			if err := database.DB.First(&player, league.PlayerID).Error; err == nil {
				playerInfo["name"] = player.Name
				playerInfo["email"] = player.Email
			}

			item := map[string]interface{}{
				"league_id":   league.ID,
				"league_name": league.Name,
				"league_code": league.Code,
				"player_id":   league.PlayerID,
				"creator":     playerInfo,
				"created_at":  league.CreatedAt,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"leagues": result})
	})

	// Endpoint para clasificación de una liga (usando totalpoints)
	router.GET("/api/leagues/:id/classification", func(c *gin.Context) {
		leagueID := c.Param("id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}

		var playerLeagues []models.PlayerByLeague
		database.DB.Where("league_id = ?", leagueID).Find(&playerLeagues)
		var result []map[string]interface{}

		for _, pl := range playerLeagues {
			// Cast de PlayerID a uint para buscar correctamente
			playerID := uint(pl.PlayerID)
			var player models.Player
			if err := database.DB.First(&player, playerID).Error; err != nil {
				continue
			}

			// Recalcular team_value sumando todos los elementos que posee el jugador
			totalTeamValue := 0.0

			// Sumar valor de pilotos
			var pilotsByLeague []models.PilotByLeague
			database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&pilotsByLeague)
			for _, pbl := range pilotsByLeague {
				var pilot models.Pilot
				if err := database.DB.First(&pilot, pbl.PilotID).Error; err == nil {
					totalTeamValue += pilot.Value
				}
			}

			// Sumar valor de track engineers
			var trackEngineersByLeague []models.TrackEngineerByLeague
			database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&trackEngineersByLeague)
			for _, tebl := range trackEngineersByLeague {
				var trackEngineer models.TrackEngineer
				if err := database.DB.First(&trackEngineer, tebl.TrackEngineerID).Error; err == nil {
					totalTeamValue += trackEngineer.Value
				}
			}

			// Sumar valor de chief engineers
			var chiefEngineersByLeague []models.ChiefEngineerByLeague
			database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&chiefEngineersByLeague)
			for _, cebl := range chiefEngineersByLeague {
				var chiefEngineer models.ChiefEngineer
				if err := database.DB.First(&chiefEngineer, cebl.ChiefEngineerID).Error; err == nil {
					totalTeamValue += chiefEngineer.Value
				}
			}

			// Sumar valor de team constructors
			var teamConstructorsByLeague []models.TeamConstructorByLeague
			database.DB.Where("league_id = ? AND owner_id = ?", leagueID, playerID).Find(&teamConstructorsByLeague)
			for _, tcbl := range teamConstructorsByLeague {
				var teamConstructor models.TeamConstructor
				if err := database.DB.First(&teamConstructor, tcbl.TeamConstructorID).Error; err == nil {
					totalTeamValue += teamConstructor.Value
				}
			}

			// Actualizar el team_value en la base de datos si es diferente
			if pl.TeamValue != totalTeamValue {
				database.DB.Model(&pl).Update("team_value", totalTeamValue)
				pl.TeamValue = totalTeamValue
			}

			// Calcular puntos totales y por GP
			totalPoints := 0
			pointsByGP := make(map[uint64]int)

			// Obtener solo los GPs donde el jugador tiene alineaciones
			var playerLineups []models.Lineup
			leagueIDUint, _ := strconv.ParseUint(leagueID, 10, 64)
			if err := database.DB.Where("player_id = ? AND league_id = ?", playerID, leagueIDUint).Find(&playerLineups).Error; err == nil {
				for _, lineup := range playerLineups {
					points := calculatePlayerTotalPoints(playerID, leagueIDUint, lineup.GPIndex)
					totalPoints += points
					pointsByGP[lineup.GPIndex] = points
				}
			}

			// Usar puntos calculados en tiempo real en lugar de la columna estática
			item := map[string]interface{}{
				"player_id":    pl.PlayerID,
				"name":         player.Name,
				"points":       totalPoints,
				"points_by_gp": pointsByGP,
				"money":        pl.Money,
				"team_value":   pl.TeamValue,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"classification": result})
	})

	// Endpoint para obtener la plantilla completa de un jugador
	router.GET("/api/players/:player_id/squad", func(c *gin.Context) {
		playerID := c.Param("player_id")
		leagueID := c.Query("league_id")

		if playerID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros playerId o league_id"})
			return
		}

		playerIDUint, err := strconv.ParseUint(playerID, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "playerId inválido"})
			return
		}

		leagueIDUint, err := strconv.ParseUint(leagueID, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "league_id inválido"})
			return
		}

		// Obtener pilotos del jugador
		var pilotsByLeague []models.PilotByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueIDUint, playerIDUint).Find(&pilotsByLeague)

		var pilots []map[string]interface{}
		for _, pbl := range pilotsByLeague {
			var pilot models.Pilot
			if err := database.DB.First(&pilot, pbl.PilotID).Error; err != nil {
				continue
			}

			item := map[string]interface{}{
				"id":                 pbl.ID,
				"pilot_by_league_id": pbl.ID,
				"pilot_id":           pilot.ID,
				"driver_name":        pilot.DriverName,
				"team":               pilot.Team,
				"image_url":          pilot.ImageURL,
				"mode":               pilot.Mode,
				"total_points":       pilot.TotalPoints,
				"value":              pilot.Value,
				"clausulatime":       pbl.Clausulatime,
				"clausula_value":     pbl.ClausulaValue,
				"owner_id":           pbl.OwnerID,
				"venta":              pbl.Venta,
				"venta_expires_at":   pbl.VentaExpiresAt,
				"created_at":         pbl.CreatedAt,
				"updated_at":         pbl.UpdatedAt,
				"league_id":          pbl.LeagueID,
			}
			pilots = append(pilots, item)
		}

		// Obtener ingenieros de pista del jugador
		var trackEngineersByLeague []models.TrackEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueIDUint, playerIDUint).Find(&trackEngineersByLeague)

		var trackEngineers []map[string]interface{}
		for _, teb := range trackEngineersByLeague {
			var trackEngineer models.TrackEngineer
			if err := database.DB.First(&trackEngineer, teb.TrackEngineerID).Error; err != nil {
				continue
			}

			item := map[string]interface{}{
				"id":                          teb.ID,
				"track_engineer_by_league_id": teb.ID,
				"track_engineer_id":           trackEngineer.ID,
				"name":                        trackEngineer.Name,
				"image_url":                   trackEngineer.ImageURL,
				"team":                        trackEngineer.Team,
				"total_points":                trackEngineer.TotalPoints,
				"value":                       trackEngineer.Value,
				"clausulatime":                teb.Clausulatime,
				"clausula_value":              teb.ClausulaValue,
				"owner_id":                    teb.OwnerID,
				"venta":                       teb.Venta,
				"venta_expires_at":            teb.VentaExpiresAt,
				"created_at":                  teb.CreatedAt,
				"updated_at":                  teb.UpdatedAt,
				"league_id":                   teb.LeagueID,
			}
			trackEngineers = append(trackEngineers, item)
		}

		// Obtener ingenieros jefe del jugador
		var chiefEngineersByLeague []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueIDUint, playerIDUint).Find(&chiefEngineersByLeague)

		var chiefEngineers []map[string]interface{}
		for _, ceb := range chiefEngineersByLeague {
			var chiefEngineer models.ChiefEngineer
			if err := database.DB.First(&chiefEngineer, ceb.ChiefEngineerID).Error; err != nil {
				continue
			}

			item := map[string]interface{}{
				"id":                          ceb.ID,
				"chief_engineer_by_league_id": ceb.ID,
				"chief_engineer_id":           chiefEngineer.ID,
				"name":                        chiefEngineer.Name,
				"image_url":                   chiefEngineer.ImageURL,
				"team":                        chiefEngineer.Team,
				"total_points":                chiefEngineer.TotalPoints,
				"value":                       chiefEngineer.Value,
				"clausulatime":                ceb.Clausulatime,
				"clausula_value":              ceb.ClausulaValue,
				"owner_id":                    ceb.OwnerID,
				"venta":                       ceb.Venta,
				"venta_expires_at":            ceb.VentaExpiresAt,
				"created_at":                  ceb.CreatedAt,
				"updated_at":                  ceb.UpdatedAt,
				"league_id":                   ceb.LeagueID,
			}
			chiefEngineers = append(chiefEngineers, item)
		}

		// Obtener equipos del jugador
		var teamConstructorsByLeague []models.TeamConstructorByLeague
		database.DB.Where("league_id = ? AND owner_id = ?", leagueIDUint, playerIDUint).Find(&teamConstructorsByLeague)

		var teamConstructors []map[string]interface{}
		for _, tcb := range teamConstructorsByLeague {
			var teamConstructor models.TeamConstructor
			if err := database.DB.First(&teamConstructor, tcb.TeamConstructorID).Error; err != nil {
				continue
			}

			item := map[string]interface{}{
				"id":                            tcb.ID,
				"team_constructor_by_league_id": tcb.ID,
				"team_constructor_id":           teamConstructor.ID,
				"name":                          teamConstructor.Name,
				"image_url":                     teamConstructor.ImageURL,
				"value":                         teamConstructor.Value,
				"clausulatime":                  tcb.Clausulatime,
				"clausula_value":                tcb.ClausulaValue,
				"owner_id":                      tcb.OwnerID,
				"venta":                         tcb.Venta,
				"venta_expires_at":              tcb.VentaExpiresAt,
				"created_at":                    tcb.CreatedAt,
				"updated_at":                    tcb.UpdatedAt,
				"league_id":                     tcb.LeagueID,
			}
			teamConstructors = append(teamConstructors, item)
		}

		c.JSON(200, gin.H{
			"pilots":            pilots,
			"track_engineers":   trackEngineers,
			"chief_engineers":   chiefEngineers,
			"team_constructors": teamConstructors,
		})
	})

	// Endpoint para obtener el historial de puntos de un jugador
	router.GET("/api/players/:player_id/points", func(c *gin.Context) {
		playerID := c.Param("player_id")
		leagueID := c.Query("league_id")

		if playerID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros playerId o league_id"})
			return
		}

		playerIDUint, err := strconv.ParseUint(playerID, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "playerId inválido"})
			return
		}

		leagueIDUint, err := strconv.ParseUint(leagueID, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "league_id inválido"})
			return
		}

		// Obtener el historial de puntos del jugador
		var points []map[string]interface{}

		// Buscar en la tabla de puntos por GP
		rows, err := database.DB.Raw(`
			SELECT 
				gp.gp_index,
				gp.name as gp_name,
				gp.start_date,
				COALESCE(SUM(p.points), 0) as total_points
			FROM grand_prix gp
			LEFT JOIN player_points_by_gp p ON p.player_id = ? AND p.league_id = ? AND p.gp_index = gp.gp_index
			WHERE gp.gp_index > 0
			GROUP BY gp.gp_index, gp.name, gp.start_date
			ORDER BY gp.start_date ASC
		`, playerIDUint, leagueIDUint).Rows()

		if err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo puntos"})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var gpIndex int
			var gpName string
			var startDate time.Time
			var totalPoints int

			if err := rows.Scan(&gpIndex, &gpName, &startDate, &totalPoints); err != nil {
				continue
			}

			point := map[string]interface{}{
				"gp_index": gpIndex,
				"gp_name":  gpName,
				"date":     startDate,
				"points":   totalPoints,
			}
			points = append(points, point)
		}

		c.JSON(200, gin.H{"points": points})
	})

	// Endpoint para obtener los perfiles de varios pilotos por sus IDs en una liga
	router.GET("/api/pilotsbyleague/owned", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		idsParam := c.Query("ids")
		playerID := c.Query("player_id")
		if leagueID == "" || idsParam == "" || playerID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros league_id, player_id o ids"})
			return
		}
		var ids []uint
		if err := json.Unmarshal([]byte(idsParam), &ids); err != nil {
			c.JSON(400, gin.H{"error": "Formato de ids inválido"})
			return
		}
		var pilotsByLeague []models.PilotByLeague
		if err := database.DB.Where("league_id = ? AND pilot_id IN ? AND owner_id = ?", leagueID, ids, playerID).Find(&pilotsByLeague).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo pilotos"})
			return
		}
		var result []map[string]interface{}
		for _, pbl := range pilotsByLeague {
			var pilot models.Pilot
			database.DB.First(&pilot, pbl.PilotID)
			item := map[string]interface{}{
				"id":                 pbl.ID, // id de pilot_by_leagues
				"pilot_by_league_id": pbl.ID,
				"pilot_id":           pilot.ID,
				"driver_name":        pilot.DriverName,
				"team":               pilot.Team,
				"image_url":          pilot.ImageURL,
				"mode":               pilot.Mode,
				"total_points":       pilot.TotalPoints,
				"value":              pilot.Value,
				"clausulatime":       pbl.Clausulatime,
				"clausula_value":     pbl.ClausulaValue,
				"owner_id":           pbl.OwnerID,
				"venta":              pbl.Venta,
				"venta_expires_at":   pbl.VentaExpiresAt,
				"created_at":         pbl.CreatedAt,
				"updated_at":         pbl.UpdatedAt,
				"league_id":          pbl.LeagueID,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"pilots": result})
	})

	// Endpoint para poner a la venta un piloto (guardar precio de venta) o quitarlo del mercado
	router.POST("/api/pilotbyleague/sell", authMiddleware(), func(c *gin.Context) {
		fmt.Println("[LOG] Entrando en /api/pilotbyleague/sell")
		userIDRaw, ok := c.Get("user_id")
		fmt.Printf("[LOG] Valor crudo de user_id en contexto: %v (tipo: %T)\n", userIDRaw, userIDRaw)
		if !ok {
			fmt.Println("[LOG] No se pudo obtener user_id del contexto")
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			fmt.Printf("[LOG] user_id no es uint, es: %T\n", userIDRaw)
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		fmt.Println("[LOG] Usuario autenticado (uint):", userID)
		var req struct {
			PilotByLeagueID uint `json:"pilot_by_league_id"`
			Venta           int  `json:"venta"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			fmt.Println("[LOG] Error en ShouldBindJSON:", err)
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		fmt.Printf("[LOG] Body recibido: %+v\n", req)
		var pbl models.PilotByLeague
		fmt.Printf("[LOG] Buscando PilotByLeague con id=%v\n", req.PilotByLeagueID)
		if err := database.DB.First(&pbl, req.PilotByLeagueID).Error; err != nil {
			fmt.Println("[LOG] No se encontró PilotByLeague con ese ID:", req.PilotByLeagueID)
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}
		fmt.Printf("[LOG] PilotByLeague encontrado: %+v\n", pbl)
		fmt.Printf("[LOG] Comparando owner_id (pbl.OwnerID=%v, tipo %T) con userID=%v (tipo %T)\n", pbl.OwnerID, pbl.OwnerID, userID, userID)
		if pbl.OwnerID != userID {
			fmt.Println("[LOG] El usuario no es el propietario del piloto. OwnerID:", pbl.OwnerID, "userID:", userID)
			c.JSON(401, gin.H{"error": "No autorizado"})
			return
		}

		// Si venta es -1, quitar del mercado
		if req.Venta == -1 {
			fmt.Println("[LOG] Solicitud de quitar piloto del mercado")
			pbl.Venta = nil
			pbl.VentaExpiresAt = nil
			pbl.LeagueOfferValue = nil
			pbl.LeagueOfferExpiresAt = nil

			if err := database.DB.Save(&pbl).Error; err != nil {
				fmt.Println("[LOG] Error al quitar piloto del mercado:", err)
				c.JSON(500, gin.H{"error": "Error al quitar del mercado"})
				return
			}
			fmt.Println("[LOG] Piloto retirado del mercado correctamente:", pbl.ID, "por usuario:", userID)
			c.JSON(200, gin.H{"message": "Piloto retirado del mercado"})
			return
		}

		// Si venta es positiva, poner a la venta
		now := time.Now()
		expires := now.Add(72 * time.Hour)
		pbl.Venta = &req.Venta
		pbl.VentaExpiresAt = &expires
		// NO generar oferta de la FIA inmediatamente - se generará automáticamente
		if err := database.DB.Save(&pbl).Error; err != nil {
			fmt.Println("[LOG] Error al guardar PilotByLeague:", err)
			c.JSON(500, gin.H{"error": "Error al guardar"})
			return
		}
		fmt.Println("[LOG] Piloto puesto en venta correctamente:", pbl.ID, "por usuario:", userID)
		c.JSON(200, gin.H{"message": "Piloto puesto a la venta"})
		// Guardar histórico de venta directa (sin oferta FIA por ahora)
		errHist := database.DB.Exec(`INSERT INTO pilot_value_history (pilot_id, pilot_by_league_id, league_id, player_id, valor_pagado, fecha, tipo, counterparty_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, pbl.PilotID, pbl.ID, pbl.LeagueID, userID, req.Venta, time.Now(), "venta", 0).Error
		if errHist != nil {
			log.Printf("[HISTORICO] Error guardando en pilot_value_history (venta): %v", errHist)
		}
	})

	// Endpoint para aceptar la oferta de la liga por un piloto en venta
	router.POST("/api/pilotbyleague/accept-league-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			PilotByLeagueID uint `json:"pilot_by_league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		var pbl models.PilotByLeague
		if err := database.DB.First(&pbl, req.PilotByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "PilotByLeague no encontrado"})
			return
		}
		if pbl.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No eres el propietario"})
			return
		}
		if pbl.LeagueOfferValue == nil || pbl.LeagueOfferExpiresAt == nil || pbl.Venta == nil {
			c.JSON(400, gin.H{"error": "No hay oferta activa de la liga"})
			return
		}
		// Sumar el dinero al usuario (PlayerByLeague)
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userID, pbl.LeagueID).First(&playerLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "PlayerByLeague no encontrado"})
			return
		}
		playerLeague.Money += *pbl.LeagueOfferValue
		// Eliminar el piloto vendido del array owned_pilots
		var owned []uint
		if playerLeague.OwnedPilots != "" && playerLeague.OwnedPilots != "[]" {
			_ = json.Unmarshal([]byte(playerLeague.OwnedPilots), &owned)
		}
		nuevaOwned := make([]uint, 0, len(owned))
		for _, pid := range owned {
			if pid != pbl.PilotID {
				nuevaOwned = append(nuevaOwned, pid)
			}
		}
		ownedJSON, _ := json.Marshal(nuevaOwned)
		playerLeague.OwnedPilots = string(ownedJSON)
		database.DB.Save(&playerLeague)
		// Guardar histórico de venta directa ANTES de limpiar LeagueOfferValue
		errHist := database.DB.Exec(`INSERT INTO pilot_value_history (pilot_id, pilot_by_league_id, league_id, player_id, valor_pagado, fecha, tipo, counterparty_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, pbl.PilotID, pbl.ID, pbl.LeagueID, userID, *pbl.LeagueOfferValue, time.Now(), "venta", 0).Error
		if errHist != nil {
			log.Printf("[HISTORICO] Error guardando en pilot_value_history (venta): %v", errHist)
		}
		// Poner owner_id a 0, borrar venta y oferta
		pbl.OwnerID = 0
		pbl.Venta = nil
		pbl.VentaExpiresAt = nil
		pbl.LeagueOfferValue = nil
		pbl.LeagueOfferExpiresAt = nil
		database.DB.Save(&pbl)
		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para rechazar la oferta de la liga por un piloto en venta
	router.POST("/api/pilotbyleague/reject-league-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			PilotByLeagueID uint `json:"pilot_by_league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		var pbl models.PilotByLeague
		if err := database.DB.First(&pbl, req.PilotByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "PilotByLeague no encontrado"})
			return
		}
		if pbl.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No eres el propietario"})
			return
		}
		pbl.LeagueOfferValue = nil
		pbl.LeagueOfferExpiresAt = nil
		database.DB.Save(&pbl)
		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para vender track engineer o quitarlo del mercado
	router.POST("/api/trackengineerbyleague/sell", authMiddleware(), func(c *gin.Context) {
		var req struct {
			TrackEngineerByLeagueID uint `json:"track_engineer_by_league_id"`
			Venta                   int  `json:"venta"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		userID := c.GetUint("user_id")
		var teb models.TrackEngineerByLeague
		if err := database.DB.First(&teb, req.TrackEngineerByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Ingeniero de pista no encontrado"})
			return
		}

		if teb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No autorizado"})
			return
		}

		// Si venta es -1, quitar del mercado
		if req.Venta == -1 {
			teb.Venta = nil
			teb.VentaExpiresAt = nil
			teb.LeagueOfferValue = nil
			teb.LeagueOfferExpiresAt = nil

			if err := database.DB.Save(&teb).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error al quitar del mercado"})
				return
			}
			c.JSON(200, gin.H{"message": "Ingeniero de pista retirado del mercado"})
			return
		}

		// Si venta es positiva, poner a la venta
		now := time.Now()
		expires := now.Add(72 * time.Hour)
		teb.Venta = &req.Venta
		teb.VentaExpiresAt = &expires
		// NO generar oferta de la FIA inmediatamente - se generará automáticamente

		database.DB.Save(&teb)
		c.JSON(200, gin.H{"message": "Ingeniero de pista puesto a la venta"})
	})

	// Endpoint para aceptar oferta de la FIA para track engineer
	router.POST("/api/trackengineerbyleague/accept-league-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			TrackEngineerByLeagueID uint `json:"track_engineer_by_league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		userID := c.GetUint("user_id")
		var teb models.TrackEngineerByLeague
		if err := database.DB.First(&teb, req.TrackEngineerByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Ingeniero de pista no encontrado"})
			return
		}

		if teb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No autorizado"})
			return
		}

		if teb.LeagueOfferValue == nil {
			c.JSON(400, gin.H{"error": "No hay oferta de la FIA"})
			return
		}

		// Procesar la venta a la FIA
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userID, teb.LeagueID).First(&playerLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "Jugador no encontrado en la liga"})
			return
		}

		var te models.TrackEngineer
		database.DB.First(&te, teb.TrackEngineerID)

		// Añadir dinero al jugador
		playerLeague.Money += *teb.LeagueOfferValue
		playerLeague.TeamValue -= te.Value

		// Limpiar venta y oferta
		teb.Venta = nil
		teb.VentaExpiresAt = nil
		teb.LeagueOfferValue = nil
		teb.LeagueOfferExpiresAt = nil
		teb.OwnerID = 0 // Volver a estar libre

		// Guardar cambios
		database.DB.Save(&playerLeague)
		database.DB.Save(&teb)

		c.JSON(200, gin.H{"message": "Oferta de la FIA aceptada"})
	})

	// Endpoint para rechazar oferta de la FIA para track engineer
	router.POST("/api/trackengineerbyleague/reject-league-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			TrackEngineerByLeagueID uint `json:"track_engineer_by_league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		userID := c.GetUint("user_id")
		var teb models.TrackEngineerByLeague
		if err := database.DB.First(&teb, req.TrackEngineerByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Ingeniero de pista no encontrado"})
			return
		}

		if teb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No autorizado"})
			return
		}

		teb.LeagueOfferValue = nil
		teb.LeagueOfferExpiresAt = nil
		database.DB.Save(&teb)
		c.JSON(200, gin.H{"message": "Oferta de la FIA rechazada"})
	})

	// Endpoint para vender chief engineer o quitarlo del mercado
	router.POST("/api/chiefengineerbyleague/sell", authMiddleware(), func(c *gin.Context) {
		var req struct {
			ChiefEngineerByLeagueID uint `json:"chief_engineer_by_league_id"`
			Venta                   int  `json:"venta"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		userID := c.GetUint("user_id")
		var ceb models.ChiefEngineerByLeague
		if err := database.DB.First(&ceb, req.ChiefEngineerByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Ingeniero jefe no encontrado"})
			return
		}

		if ceb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No autorizado"})
			return
		}

		// Si venta es -1, quitar del mercado
		if req.Venta == -1 {
			ceb.Venta = nil
			ceb.VentaExpiresAt = nil
			ceb.LeagueOfferValue = nil
			ceb.LeagueOfferExpiresAt = nil

			if err := database.DB.Save(&ceb).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error al quitar del mercado"})
				return
			}
			c.JSON(200, gin.H{"message": "Ingeniero jefe retirado del mercado"})
			return
		}

		// Si venta es positiva, poner a la venta
		now := time.Now()
		expires := now.Add(72 * time.Hour)
		ceb.Venta = &req.Venta
		ceb.VentaExpiresAt = &expires
		// NO generar oferta de la FIA inmediatamente - se generará automáticamente

		database.DB.Save(&ceb)
		c.JSON(200, gin.H{"message": "Ingeniero jefe puesto a la venta"})
	})

	// Endpoint para aceptar oferta de la FIA para chief engineer
	router.POST("/api/chiefengineerbyleague/accept-league-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			ChiefEngineerByLeagueID uint `json:"chief_engineer_by_league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		var ceb models.ChiefEngineerByLeague
		if err := database.DB.First(&ceb, req.ChiefEngineerByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "ChiefEngineerByLeague no encontrado"})
			return
		}
		if ceb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No eres el propietario"})
			return
		}
		if ceb.LeagueOfferValue == nil || ceb.LeagueOfferExpiresAt == nil || ceb.Venta == nil {
			c.JSON(400, gin.H{"error": "No hay oferta activa de la FIA"})
			return
		}
		// Sumar el dinero al usuario (PlayerByLeague)
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userID, ceb.LeagueID).First(&playerLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "PlayerByLeague no encontrado"})
			return
		}
		playerLeague.Money += *ceb.LeagueOfferValue
		// Eliminar el ingeniero vendido del array owned_chief_engineers
		var owned []uint
		if playerLeague.OwnedChiefEngineers != "" && playerLeague.OwnedChiefEngineers != "[]" {
			_ = json.Unmarshal([]byte(playerLeague.OwnedChiefEngineers), &owned)
		}
		nuevaOwned := make([]uint, 0, len(owned))
		for _, cid := range owned {
			if cid != ceb.ChiefEngineerID {
				nuevaOwned = append(nuevaOwned, cid)
			}
		}
		ownedJSON, _ := json.Marshal(nuevaOwned)
		playerLeague.OwnedChiefEngineers = string(ownedJSON)
		database.DB.Save(&playerLeague)
		// Poner owner_id a 0, borrar venta y oferta
		ceb.OwnerID = 0
		ceb.Venta = nil
		ceb.VentaExpiresAt = nil
		ceb.LeagueOfferValue = nil
		ceb.LeagueOfferExpiresAt = nil
		database.DB.Save(&ceb)
		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para rechazar oferta de la FIA para chief engineer
	router.POST("/api/chiefengineerbyleague/reject-league-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			ChiefEngineerByLeagueID uint `json:"chief_engineer_by_league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		var ceb models.ChiefEngineerByLeague
		if err := database.DB.First(&ceb, req.ChiefEngineerByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "ChiefEngineerByLeague no encontrado"})
			return
		}
		if ceb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No eres el propietario"})
			return
		}
		ceb.LeagueOfferValue = nil
		ceb.LeagueOfferExpiresAt = nil
		database.DB.Save(&ceb)
		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para vender team constructor o quitarlo del mercado
	router.POST("/api/teamconstructorbyleague/sell", authMiddleware(), func(c *gin.Context) {
		var req struct {
			TeamConstructorByLeagueID uint `json:"team_constructor_by_league_id"`
			Venta                     int  `json:"venta"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		userID := c.GetUint("user_id")
		var tcb models.TeamConstructorByLeague
		if err := database.DB.First(&tcb, req.TeamConstructorByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Equipo constructor no encontrado"})
			return
		}

		if tcb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No autorizado"})
			return
		}

		// Si venta es -1, quitar del mercado
		if req.Venta == -1 {
			tcb.Venta = nil
			tcb.VentaExpiresAt = nil
			tcb.LeagueOfferValue = nil
			tcb.LeagueOfferExpiresAt = nil

			if err := database.DB.Save(&tcb).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error al quitar del mercado"})
				return
			}
			c.JSON(200, gin.H{"message": "Equipo constructor retirado del mercado"})
			return
		}

		// Si venta es positiva, poner a la venta
		now := time.Now()
		expires := now.Add(72 * time.Hour)
		tcb.Venta = &req.Venta
		tcb.VentaExpiresAt = &expires
		// NO generar oferta de la FIA inmediatamente - se generará automáticamente

		database.DB.Save(&tcb)
		c.JSON(200, gin.H{"message": "Equipo constructor puesto a la venta"})
	})

	// Endpoint para aceptar oferta de la FIA para team constructor
	router.POST("/api/teamconstructorbyleague/accept-league-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			TeamConstructorByLeagueID uint `json:"team_constructor_by_league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		var tcb models.TeamConstructorByLeague
		if err := database.DB.First(&tcb, req.TeamConstructorByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "TeamConstructorByLeague no encontrado"})
			return
		}
		if tcb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No eres el propietario"})
			return
		}
		if tcb.LeagueOfferValue == nil || tcb.LeagueOfferExpiresAt == nil || tcb.Venta == nil {
			c.JSON(400, gin.H{"error": "No hay oferta activa de la FIA"})
			return
		}
		// Sumar el dinero al usuario (PlayerByLeague)
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userID, tcb.LeagueID).First(&playerLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "PlayerByLeague no encontrado"})
			return
		}
		playerLeague.Money += *tcb.LeagueOfferValue
		// Eliminar el equipo vendido del array owned_team_constructors
		var owned []uint
		if playerLeague.OwnedTeamConstructors != "" && playerLeague.OwnedTeamConstructors != "[]" {
			_ = json.Unmarshal([]byte(playerLeague.OwnedTeamConstructors), &owned)
		}
		nuevaOwned := make([]uint, 0, len(owned))
		for _, tcid := range owned {
			if tcid != tcb.TeamConstructorID {
				nuevaOwned = append(nuevaOwned, tcid)
			}
		}
		ownedJSON, _ := json.Marshal(nuevaOwned)
		playerLeague.OwnedTeamConstructors = string(ownedJSON)
		database.DB.Save(&playerLeague)
		// Poner owner_id a 0, borrar venta y oferta
		tcb.OwnerID = 0
		tcb.Venta = nil
		tcb.VentaExpiresAt = nil
		tcb.LeagueOfferValue = nil
		tcb.LeagueOfferExpiresAt = nil
		database.DB.Save(&tcb)
		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para rechazar oferta de la FIA para team constructor
	router.POST("/api/teamconstructorbyleague/reject-league-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			TeamConstructorByLeagueID uint `json:"team_constructor_by_league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		var tcb models.TeamConstructorByLeague
		if err := database.DB.First(&tcb, req.TeamConstructorByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "TeamConstructorByLeague no encontrado"})
			return
		}
		if tcb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No eres el propietario"})
			return
		}
		tcb.LeagueOfferValue = nil
		tcb.LeagueOfferExpiresAt = nil
		database.DB.Save(&tcb)
		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para limpiar pujas antiguas de la FIA
	router.POST("/api/market/cleanup-fia-bids", authMiddleware(), func(c *gin.Context) {
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}

		log.Printf("[CLEANUP-FIA] Limpiando pujas antiguas de la FIA para liga %s", leagueID)
		id, _ := strconv.ParseUint(leagueID, 10, 64)

		// Limpiar pujas de la FIA en pilotos
		var pilotBids []models.PilotByLeague
		database.DB.Where("league_id = ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", id).Find(&pilotBids)
		for _, pbl := range pilotBids {
			var bids []Bid
			if len(pbl.Bids) > 0 {
				if err := json.Unmarshal(pbl.Bids, &bids); err != nil {
					log.Printf("[CLEANUP-FIA] Error parseando bids de piloto %d: %v", pbl.ID, err)
					continue
				}
			}

			// Filtrar solo pujas que NO son de la FIA
			newBids := make([]Bid, 0)
			for _, bid := range bids {
				if bid.PlayerID != FIA_PLAYER_ID {
					newBids = append(newBids, bid)
				}
			}

			if len(newBids) != len(bids) {
				bidsJSON, _ := json.Marshal(newBids)
				pbl.Bids = bidsJSON
				database.DB.Save(&pbl)
				log.Printf("[CLEANUP-FIA] Limpiadas %d pujas FIA del piloto %d", len(bids)-len(newBids), pbl.ID)
			}
		}

		// Limpiar pujas de la FIA en track engineers
		var trackEngineerBids []models.TrackEngineerByLeague
		database.DB.Where("league_id = ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", id).Find(&trackEngineerBids)
		for _, teb := range trackEngineerBids {
			var bids []Bid
			if len(teb.Bids) > 0 {
				if err := json.Unmarshal(teb.Bids, &bids); err != nil {
					log.Printf("[CLEANUP-FIA] Error parseando bids de track engineer %d: %v", teb.ID, err)
					continue
				}
			}

			// Filtrar solo pujas que NO son de la FIA
			newBids := make([]Bid, 0)
			for _, bid := range bids {
				if bid.PlayerID != FIA_PLAYER_ID {
					newBids = append(newBids, bid)
				}
			}

			if len(newBids) != len(bids) {
				bidsJSON, _ := json.Marshal(newBids)
				teb.Bids = bidsJSON
				database.DB.Save(&teb)
				log.Printf("[CLEANUP-FIA] Limpiadas %d pujas FIA del track engineer %d", len(bids)-len(newBids), teb.ID)
			}
		}

		// Limpiar pujas de la FIA en chief engineers
		var chiefEngineerBids []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", id).Find(&chiefEngineerBids)
		for _, ceb := range chiefEngineerBids {
			var bids []Bid
			if len(ceb.Bids) > 0 {
				if err := json.Unmarshal(ceb.Bids, &bids); err != nil {
					log.Printf("[CLEANUP-FIA] Error parseando bids de chief engineer %d: %v", ceb.ID, err)
					continue
				}
			}

			// Filtrar solo pujas que NO son de la FIA
			newBids := make([]Bid, 0)
			for _, bid := range bids {
				if bid.PlayerID != FIA_PLAYER_ID {
					newBids = append(newBids, bid)
				}
			}

			if len(newBids) != len(bids) {
				bidsJSON, _ := json.Marshal(newBids)
				ceb.Bids = bidsJSON
				database.DB.Save(&ceb)
				log.Printf("[CLEANUP-FIA] Limpiadas %d pujas FIA del chief engineer %d", len(bids)-len(newBids), ceb.ID)
			}
		}

		// Limpiar pujas de la FIA en team constructors
		var teamConstructorBids []models.TeamConstructorByLeague
		database.DB.Where("league_id = ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", id).Find(&teamConstructorBids)
		for _, tcb := range teamConstructorBids {
			var bids []Bid
			if len(tcb.Bids) > 0 {
				if err := json.Unmarshal(tcb.Bids, &bids); err != nil {
					log.Printf("[CLEANUP-FIA] Error parseando bids de team constructor %d: %v", tcb.ID, err)
					continue
				}
			}

			// Filtrar solo pujas que NO son de la FIA
			newBids := make([]Bid, 0)
			for _, bid := range bids {
				if bid.PlayerID != FIA_PLAYER_ID {
					newBids = append(newBids, bid)
				}
			}

			if len(newBids) != len(bids) {
				bidsJSON, _ := json.Marshal(newBids)
				tcb.Bids = bidsJSON
				database.DB.Save(&tcb)
				log.Printf("[CLEANUP-FIA] Limpiadas %d pujas FIA del team constructor %d", len(bids)-len(newBids), tcb.ID)
			}
		}

		log.Printf("[CLEANUP-FIA] Limpieza de pujas FIA completada para liga %s", leagueID)
		c.JSON(200, gin.H{"message": "Pujas de la FIA limpiadas correctamente"})
	})

	// Endpoint para actualizar ventas7fichajes y value de todos los pilotos

	// Endpoint para rechazar oferta de jugador para piloto
	router.POST("/api/pilotbyleague/reject-player-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			PilotByLeagueID uint `json:"pilot_by_league_id"`
			OfferID         uint `json:"offer_id"`
			LeagueID        uint `json:"league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		var pbl models.PilotByLeague
		if err := database.DB.First(&pbl, req.PilotByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "PilotByLeague no encontrado"})
			return
		}
		if pbl.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No eres el propietario"})
			return
		}
		// Remover la oferta específica del array de bids
		var bids []Bid
		if len(pbl.Bids) > 0 {
			json.Unmarshal(pbl.Bids, &bids)
		}
		var newBids []Bid
		for _, bid := range bids {
			if bid.PlayerID != req.OfferID {
				newBids = append(newBids, bid)
			}
		}
		bidsJSON, _ := json.Marshal(newBids)
		pbl.Bids = bidsJSON
		database.DB.Save(&pbl)
		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para rechazar oferta de jugador para track engineer
	router.POST("/api/trackengineerbyleague/reject-player-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			TrackEngineerByLeagueID uint `json:"track_engineer_by_league_id"`
			OfferID                 uint `json:"offer_id"`
			LeagueID                uint `json:"league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		var teb models.TrackEngineerByLeague
		if err := database.DB.First(&teb, req.TrackEngineerByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "TrackEngineerByLeague no encontrado"})
			return
		}
		if teb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No eres el propietario"})
			return
		}
		// Remover la oferta específica del array de bids
		var bids []Bid
		if len(teb.Bids) > 0 {
			json.Unmarshal(teb.Bids, &bids)
		}
		var newBids []Bid
		for _, bid := range bids {
			if bid.PlayerID != req.OfferID {
				newBids = append(newBids, bid)
			}
		}
		bidsJSON, _ := json.Marshal(newBids)
		teb.Bids = bidsJSON
		database.DB.Save(&teb)
		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para rechazar oferta de jugador para chief engineer
	router.POST("/api/chiefengineerbyleague/reject-player-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			ChiefEngineerByLeagueID uint `json:"chief_engineer_by_league_id"`
			OfferID                 uint `json:"offer_id"`
			LeagueID                uint `json:"league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		var ceb models.ChiefEngineerByLeague
		if err := database.DB.First(&ceb, req.ChiefEngineerByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "ChiefEngineerByLeague no encontrado"})
			return
		}
		if ceb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No eres el propietario"})
			return
		}
		// Remover la oferta específica del array de bids
		var bids []Bid
		if len(ceb.Bids) > 0 {
			json.Unmarshal(ceb.Bids, &bids)
		}
		var newBids []Bid
		for _, bid := range bids {
			if bid.PlayerID != req.OfferID {
				newBids = append(newBids, bid)
			}
		}
		bidsJSON, _ := json.Marshal(newBids)
		ceb.Bids = bidsJSON
		database.DB.Save(&ceb)
		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para rechazar oferta de jugador para team constructor
	router.POST("/api/teamconstructorbyleague/reject-player-offer", authMiddleware(), func(c *gin.Context) {
		var req struct {
			TeamConstructorByLeagueID uint `json:"team_constructor_by_league_id"`
			OfferID                   uint `json:"offer_id"`
			LeagueID                  uint `json:"league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		var tcb models.TeamConstructorByLeague
		if err := database.DB.First(&tcb, req.TeamConstructorByLeagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "TeamConstructorByLeague no encontrado"})
			return
		}
		if tcb.OwnerID != userID {
			c.JSON(401, gin.H{"error": "No eres el propietario"})
			return
		}
		// Remover la oferta específica del array de bids
		var bids []Bid
		if len(tcb.Bids) > 0 {
			json.Unmarshal(tcb.Bids, &bids)
		}
		var newBids []Bid
		for _, bid := range bids {
			if bid.PlayerID != req.OfferID {
				newBids = append(newBids, bid)
			}
		}
		bidsJSON, _ := json.Marshal(newBids)
		tcb.Bids = bidsJSON
		database.DB.Save(&tcb)
		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para obtener todos los elementos en venta del usuario en la liga
	router.GET("/api/my-market-sales", authMiddleware(), func(c *gin.Context) {
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		var result []map[string]interface{}

		// 1. Obtener pilotos en venta
		var pilotVentas []models.PilotByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND venta IS NOT NULL AND venta_expires_at > ?", leagueID, userID, time.Now()).Find(&pilotVentas)
		for _, pbl := range pilotVentas {
			var pilot models.Pilot
			database.DB.First(&pilot, pbl.PilotID)
			item := map[string]interface{}{
				"id":                      pbl.ID,
				"type":                    "pilot",
				"pilot_id":                pilot.ID,
				"driver_name":             pilot.DriverName,
				"team":                    pilot.Team,
				"image_url":               pilot.ImageURL,
				"value":                   pilot.Value,
				"venta":                   pbl.Venta,
				"venta_expires_at":        pbl.VentaExpiresAt,
				"clausulatime":            pbl.Clausulatime,
				"clausula_value":          pbl.ClausulaValue,
				"owner_id":                pbl.OwnerID,
				"league_offer_value":      pbl.LeagueOfferValue,
				"league_offer_expires_at": pbl.LeagueOfferExpiresAt,
			}
			result = append(result, item)
		}

		// 2. Obtener track engineers en venta
		var trackEngineerVentas []models.TrackEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND venta IS NOT NULL AND venta_expires_at > ?", leagueID, userID, time.Now()).Find(&trackEngineerVentas)
		for _, teb := range trackEngineerVentas {
			var te models.TrackEngineer
			database.DB.First(&te, teb.TrackEngineerID)

			// Buscar piloto relacionado para obtener el equipo
			var pilot models.Pilot
			pilotTeam := ""
			if err := database.DB.Where("track_engineer_id = ?", te.ID).First(&pilot).Error; err == nil {
				pilotTeam = pilot.Team
			}

			item := map[string]interface{}{
				"id":                      teb.ID,
				"type":                    "track_engineer",
				"track_engineer_id":       te.ID,
				"name":                    te.Name,
				"team":                    pilotTeam,
				"image_url":               te.ImageURL,
				"value":                   te.Value,
				"venta":                   teb.Venta,
				"venta_expires_at":        teb.VentaExpiresAt,
				"owner_id":                teb.OwnerID,
				"league_offer_value":      teb.LeagueOfferValue,
				"league_offer_expires_at": teb.LeagueOfferExpiresAt,
			}
			result = append(result, item)
		}

		// 3. Obtener chief engineers en venta
		var chiefEngineerVentas []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND venta IS NOT NULL AND venta_expires_at > ?", leagueID, userID, time.Now()).Find(&chiefEngineerVentas)
		for _, ceb := range chiefEngineerVentas {
			var ce models.ChiefEngineer
			database.DB.First(&ce, ceb.ChiefEngineerID)

			item := map[string]interface{}{
				"id":                      ceb.ID,
				"type":                    "chief_engineer",
				"chief_engineer_id":       ce.ID,
				"name":                    ce.Name,
				"team":                    ce.Team,
				"image_url":               ce.ImageURL,
				"value":                   ce.Value,
				"venta":                   ceb.Venta,
				"venta_expires_at":        ceb.VentaExpiresAt,
				"owner_id":                ceb.OwnerID,
				"league_offer_value":      ceb.LeagueOfferValue,
				"league_offer_expires_at": ceb.LeagueOfferExpiresAt,
			}
			result = append(result, item)
		}

		// 4. Obtener team constructors en venta
		var teamConstructorVentas []models.TeamConstructorByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND venta IS NOT NULL AND venta_expires_at > ?", leagueID, userID, time.Now()).Find(&teamConstructorVentas)
		for _, tcb := range teamConstructorVentas {
			var tc models.TeamConstructor
			database.DB.First(&tc, tcb.TeamConstructorID)

			item := map[string]interface{}{
				"id":                      tcb.ID,
				"type":                    "team_constructor",
				"team_constructor_id":     tc.ID,
				"name":                    tc.Name,
				"image_url":               tc.ImageURL,
				"value":                   tc.Value,
				"venta":                   tcb.Venta,
				"venta_expires_at":        tcb.VentaExpiresAt,
				"owner_id":                tcb.OwnerID,
				"league_offer_value":      tcb.LeagueOfferValue,
				"league_offer_expires_at": tcb.LeagueOfferExpiresAt,
			}
			result = append(result, item)
		}

		c.JSON(200, gin.H{"sales": result})
	})

	// Endpoint para obtener todos los elementos donde el usuario tiene pujas activas pero no es propietario
	router.GET("/api/my-market-bids", authMiddleware(), func(c *gin.Context) {
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}

		var result []map[string]interface{}

		// 1. Buscar ofertas en subastas activas
		var auctions []Auction
		database.DB.Where("league_id = ? AND end_time > ?", leagueID, time.Now()).Find(&auctions)
		log.Printf("[MY-BIDS] Encontradas %d subastas activas para liga %s", len(auctions), leagueID)

		for _, auction := range auctions {
			var bids []Bid
			if len(auction.Bids) > 0 {
				_ = json.Unmarshal(auction.Bids, &bids)
			}
			found := false
			var myBidValue *float64
			for _, bid := range bids {
				if bid.PlayerID == userID {
					v := float64(bid.Valor)
					myBidValue = &v
					found = true
					break
				}
			}
			if found {
				log.Printf("[MY-BIDS] Usuario %d tiene puja en subasta %s ID %d", userID, auction.ItemType, auction.ItemID)

				switch auction.ItemType {
				case "pilot":
					var pbl models.PilotByLeague
					if err := database.DB.First(&pbl, auction.ItemID).Error; err != nil {
						log.Printf("[MY-BIDS] Error buscando pilot ID %d: %v", auction.ItemID, err)
						continue
					}
					if pbl.OwnerID == userID {
						continue // No mostrar si es propietario
					}
					var pilot models.Pilot
					database.DB.First(&pilot, pbl.PilotID)
					item := map[string]interface{}{
						"id":               pbl.ID,
						"type":             "pilot",
						"pilot_id":         pilot.ID,
						"driver_name":      pilot.DriverName,
						"name":             pilot.DriverName,
						"team":             pilot.Team,
						"image_url":        pilot.ImageURL,
						"value":            pilot.Value,
						"mode":             pilot.Mode, // Agregar el modo del piloto
						"venta":            pbl.Venta,
						"venta_expires_at": pbl.VentaExpiresAt,
						"clausulatime":     pbl.Clausulatime,
						"clausula_value":   pbl.ClausulaValue,
						"owner_id":         pbl.OwnerID,
						"my_bid":           myBidValue,
						"is_auction":       true, // Es una subasta activa
					}
					result = append(result, item)

				case "track_engineer":
					var teb models.TrackEngineerByLeague
					if err := database.DB.First(&teb, auction.ItemID).Error; err != nil {
						log.Printf("[MY-BIDS] Error buscando track_engineer ID %d: %v", auction.ItemID, err)
						continue
					}
					if teb.OwnerID == userID {
						continue // No mostrar si es propietario
					}
					var te models.TrackEngineer
					database.DB.First(&te, teb.TrackEngineerID)

					// Buscar piloto relacionado
					var pilot models.Pilot
					pilotTeam := ""
					if err := database.DB.Where("track_engineer_id = ?", te.ID).First(&pilot).Error; err == nil {
						pilotTeam = pilot.Team
					}

					// Arreglar ruta de imagen para ingenieros de pista
					imageURL := te.ImageURL
					if imageURL != "" && !strings.Contains(imageURL, "ingenierosdepista/") {
						imageURL = "images/ingenierosdepista/" + strings.TrimPrefix(imageURL, "images/")
					}

					item := map[string]interface{}{
						"id":               teb.ID,
						"type":             "track_engineer",
						"name":             te.Name,
						"driver_name":      te.Name,
						"team":             pilotTeam,
						"image_url":        imageURL,
						"value":            te.Value,
						"mode":             "T", // Track Engineer
						"venta":            teb.Venta,
						"venta_expires_at": teb.VentaExpiresAt,
						"owner_id":         teb.OwnerID,
						"my_bid":           myBidValue,
						"is_auction":       true, // Es una subasta
					}
					result = append(result, item)

				case "chief_engineer":
					var ceb models.ChiefEngineerByLeague
					if err := database.DB.First(&ceb, auction.ItemID).Error; err != nil {
						log.Printf("[MY-BIDS] Error buscando chief_engineer ID %d: %v", auction.ItemID, err)
						continue
					}
					if ceb.OwnerID == userID {
						continue // No mostrar si es propietario
					}
					var ce models.ChiefEngineer
					database.DB.First(&ce, ceb.ChiefEngineerID)
					item := map[string]interface{}{
						"id":               ceb.ID,
						"type":             "chief_engineer",
						"name":             ce.Name,
						"driver_name":      ce.Name,
						"team":             ce.Team,
						"image_url":        ce.ImageURL,
						"value":            ce.Value,
						"mode":             "C", // Chief Engineer
						"venta":            ceb.Venta,
						"venta_expires_at": ceb.VentaExpiresAt,
						"owner_id":         ceb.OwnerID,
						"my_bid":           myBidValue,
						"is_auction":       true, // Es una subasta
					}
					result = append(result, item)

				case "team_constructor":
					var tcb models.TeamConstructorByLeague
					if err := database.DB.First(&tcb, auction.ItemID).Error; err != nil {
						log.Printf("[MY-BIDS] Error buscando team_constructor ID %d: %v", auction.ItemID, err)
						continue
					}
					if tcb.OwnerID == userID {
						continue // No mostrar si es propietario
					}
					var tc models.TeamConstructor
					database.DB.First(&tc, tcb.TeamConstructorID)
					item := map[string]interface{}{
						"id":               tcb.ID,
						"type":             "team_constructor",
						"name":             tc.Name,
						"driver_name":      tc.Name,
						"team":             tc.Name,
						"image_url":        tc.ImageURL,
						"value":            tc.Value,
						"mode":             "E", // Team Constructor
						"venta":            tcb.Venta,
						"venta_expires_at": tcb.VentaExpiresAt,
						"owner_id":         tcb.OwnerID,
						"my_bid":           myBidValue,
						"is_auction":       true, // Es una subasta
					}
					result = append(result, item)
				}
			}
		}

		// 2. Buscar ofertas directas a elementos con propietario (solo las que ha hecho el usuario)
		// Pilotos con ofertas directas del usuario (NO siendo propietario)
		var pilotsWithOffers []models.PilotByLeague
		database.DB.Where("league_id = ? AND owner_id > 0 AND owner_id != ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", leagueID, userID).Find(&pilotsWithOffers)

		for _, pbl := range pilotsWithOffers {
			var bids []Bid
			if len(pbl.Bids) > 0 {
				json.Unmarshal(pbl.Bids, &bids)
			}

			// Buscar si el usuario tiene una oferta en este piloto
			var myBidValue *float64
			found := false
			for _, bid := range bids {
				if bid.PlayerID == userID {
					v := float64(bid.Valor)
					myBidValue = &v
					found = true
					break
				}
			}

			if found {
				var pilot models.Pilot
				database.DB.First(&pilot, pbl.PilotID)

				item := map[string]interface{}{
					"id":               pbl.ID,
					"type":             "pilot",
					"pilot_id":         pilot.ID,
					"driver_name":      pilot.DriverName,
					"name":             pilot.DriverName,
					"team":             pilot.Team,
					"image_url":        pilot.ImageURL,
					"value":            pilot.Value,
					"mode":             pilot.Mode, // Agregar el modo del piloto
					"venta":            pbl.Venta,
					"venta_expires_at": pbl.VentaExpiresAt,
					"clausulatime":     pbl.Clausulatime,
					"clausula_value":   pbl.ClausulaValue,
					"owner_id":         pbl.OwnerID,
					"my_bid":           myBidValue,
					"is_auction":       false, // Es una oferta directa
				}
				result = append(result, item)
			}
		}

		// Track Engineers con ofertas directas del usuario (NO siendo propietario)
		var trackEngineersWithOffers []models.TrackEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id > 0 AND owner_id != ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", leagueID, userID).Find(&trackEngineersWithOffers)

		for _, teb := range trackEngineersWithOffers {
			var bids []Bid
			if len(teb.Bids) > 0 {
				json.Unmarshal(teb.Bids, &bids)
			}

			var myBidValue *float64
			found := false
			for _, bid := range bids {
				if bid.PlayerID == userID {
					v := float64(bid.Valor)
					myBidValue = &v
					found = true
					break
				}
			}

			if found {
				var te models.TrackEngineer
				database.DB.First(&te, teb.TrackEngineerID)

				// Buscar piloto relacionado
				var pilot models.Pilot
				pilotTeam := ""
				if err := database.DB.Where("track_engineer_id = ?", te.ID).First(&pilot).Error; err == nil {
					pilotTeam = pilot.Team
				}

				// Arreglar ruta de imagen para ingenieros de pista
				imageURL := te.ImageURL
				if imageURL != "" && !strings.Contains(imageURL, "ingenierosdepista/") {
					imageURL = "images/ingenierosdepista/" + strings.TrimPrefix(imageURL, "images/")
				}

				item := map[string]interface{}{
					"id":               teb.ID,
					"type":             "track_engineer",
					"name":             te.Name,
					"driver_name":      te.Name,
					"team":             pilotTeam,
					"image_url":        imageURL,
					"value":            te.Value,
					"mode":             "T", // Track Engineer
					"venta":            teb.Venta,
					"venta_expires_at": teb.VentaExpiresAt,
					"owner_id":         teb.OwnerID,
					"my_bid":           myBidValue,
					"is_auction":       false, // Es una oferta directa
				}
				result = append(result, item)
			}
		}

		// Chief Engineers con ofertas directas del usuario (NO siendo propietario)
		var chiefEngineersWithOffers []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id > 0 AND owner_id != ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", leagueID, userID).Find(&chiefEngineersWithOffers)

		for _, ceb := range chiefEngineersWithOffers {
			var bids []Bid
			if len(ceb.Bids) > 0 {
				json.Unmarshal(ceb.Bids, &bids)
			}

			var myBidValue *float64
			found := false
			for _, bid := range bids {
				if bid.PlayerID == userID {
					v := float64(bid.Valor)
					myBidValue = &v
					found = true
					break
				}
			}

			if found {
				var ce models.ChiefEngineer
				database.DB.First(&ce, ceb.ChiefEngineerID)

				item := map[string]interface{}{
					"id":               ceb.ID,
					"type":             "chief_engineer",
					"name":             ce.Name,
					"driver_name":      ce.Name,
					"team":             ce.Team,
					"image_url":        ce.ImageURL,
					"value":            ce.Value,
					"venta":            ceb.Venta,
					"venta_expires_at": ceb.VentaExpiresAt,
					"owner_id":         ceb.OwnerID,
					"my_bid":           myBidValue,
					"is_auction":       false, // Es una oferta directa
				}
				result = append(result, item)
			}
		}

		// Team Constructors con ofertas directas del usuario (NO siendo propietario)
		var teamConstructorsWithOffers []models.TeamConstructorByLeague
		database.DB.Where("league_id = ? AND owner_id > 0 AND owner_id != ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", leagueID, userID).Find(&teamConstructorsWithOffers)

		for _, tcb := range teamConstructorsWithOffers {
			var bids []Bid
			if len(tcb.Bids) > 0 {
				json.Unmarshal(tcb.Bids, &bids)
			}

			var myBidValue *float64
			found := false
			for _, bid := range bids {
				if bid.PlayerID == userID {
					v := float64(bid.Valor)
					myBidValue = &v
					found = true
					break
				}
			}

			if found {
				var tc models.TeamConstructor
				database.DB.First(&tc, tcb.TeamConstructorID)

				item := map[string]interface{}{
					"id":               tcb.ID,
					"type":             "team_constructor",
					"name":             tc.Name,
					"driver_name":      tc.Name,
					"team":             tc.Name,
					"image_url":        tc.ImageURL,
					"value":            tc.Value,
					"mode":             "E", // Team Constructor
					"venta":            tcb.Venta,
					"venta_expires_at": tcb.VentaExpiresAt,
					"owner_id":         tcb.OwnerID,
					"my_bid":           myBidValue,
					"is_auction":       false, // Es una oferta directa
				}
				result = append(result, item)
			}
		}

		log.Printf("[MY-BIDS] Devolviendo %d elementos con pujas del usuario %d", len(result), userID)
		c.JSON(200, gin.H{"bids": result})
	})

	// Alias para mantener compatibilidad con el frontend
	router.GET("/api/my-bids", authMiddleware(), func(c *gin.Context) {
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}

		var result []map[string]interface{}

		// 1. Buscar ofertas en subastas activas
		var auctions []Auction
		database.DB.Where("league_id = ? AND end_time > ?", leagueID, time.Now()).Find(&auctions)
		log.Printf("[MY-BIDS-ALIAS] Encontradas %d subastas activas para liga %s", len(auctions), leagueID)

		for _, auction := range auctions {
			var bids []Bid
			if len(auction.Bids) > 0 {
				_ = json.Unmarshal(auction.Bids, &bids)
			}
			found := false
			var myBidValue *float64
			for _, bid := range bids {
				if bid.PlayerID == userID {
					v := float64(bid.Valor)
					myBidValue = &v
					found = true
					break
				}
			}
			if found {
				log.Printf("[MY-BIDS-ALIAS] Usuario %d tiene puja en subasta %s ID %d", userID, auction.ItemType, auction.ItemID)

				switch auction.ItemType {
				case "pilot":
					var pbl models.PilotByLeague
					if err := database.DB.First(&pbl, auction.ItemID).Error; err != nil {
						log.Printf("[MY-BIDS-ALIAS] Error buscando pilot ID %d: %v", auction.ItemID, err)
						continue
					}
					if pbl.OwnerID == userID {
						continue // No mostrar si es propietario
					}
					var pilot models.Pilot
					database.DB.First(&pilot, pbl.PilotID)
					item := map[string]interface{}{
						"id":               pbl.ID,
						"type":             "pilot",
						"pilot_id":         pilot.ID,
						"driver_name":      pilot.DriverName,
						"name":             pilot.DriverName,
						"team":             pilot.Team,
						"image_url":        pilot.ImageURL,
						"value":            pilot.Value,
						"mode":             pilot.Mode, // Agregar el modo del piloto
						"venta":            pbl.Venta,
						"venta_expires_at": pbl.VentaExpiresAt,
						"clausulatime":     pbl.Clausulatime,
						"clausula_value":   pbl.ClausulaValue,
						"owner_id":         pbl.OwnerID,
						"my_bid":           myBidValue,
						"is_auction":       true, // Es una subasta activa
					}
					result = append(result, item)

				case "track_engineer":
					var teb models.TrackEngineerByLeague
					if err := database.DB.First(&teb, auction.ItemID).Error; err != nil {
						log.Printf("[MY-BIDS-ALIAS] Error buscando track_engineer ID %d: %v", auction.ItemID, err)
						continue
					}
					if teb.OwnerID == userID {
						continue // No mostrar si es propietario
					}
					var te models.TrackEngineer
					database.DB.First(&te, teb.TrackEngineerID)

					// Buscar piloto relacionado
					var pilot models.Pilot
					pilotTeam := ""
					if err := database.DB.Where("track_engineer_id = ?", te.ID).First(&pilot).Error; err == nil {
						pilotTeam = pilot.Team
					}

					// Arreglar ruta de imagen para ingenieros de pista
					imageURL := te.ImageURL
					if imageURL != "" && !strings.Contains(imageURL, "ingenierosdepista/") {
						imageURL = "images/ingenierosdepista/" + strings.TrimPrefix(imageURL, "images/")
					}

					item := map[string]interface{}{
						"id":               teb.ID,
						"type":             "track_engineer",
						"name":             te.Name,
						"driver_name":      te.Name,
						"team":             pilotTeam,
						"image_url":        imageURL,
						"value":            te.Value,
						"mode":             "T", // Track Engineer
						"venta":            teb.Venta,
						"venta_expires_at": teb.VentaExpiresAt,
						"owner_id":         teb.OwnerID,
						"my_bid":           myBidValue,
						"is_auction":       true, // Es una subasta
					}
					result = append(result, item)

				case "chief_engineer":
					var ceb models.ChiefEngineerByLeague
					if err := database.DB.First(&ceb, auction.ItemID).Error; err != nil {
						log.Printf("[MY-BIDS-ALIAS] Error buscando chief_engineer ID %d: %v", auction.ItemID, err)
						continue
					}
					if ceb.OwnerID == userID {
						continue // No mostrar si es propietario
					}
					var ce models.ChiefEngineer
					database.DB.First(&ce, ceb.ChiefEngineerID)
					item := map[string]interface{}{
						"id":               ceb.ID,
						"type":             "chief_engineer",
						"name":             ce.Name,
						"driver_name":      ce.Name,
						"team":             ce.Team,
						"image_url":        ce.ImageURL,
						"value":            ce.Value,
						"mode":             "C", // Chief Engineer
						"venta":            ceb.Venta,
						"venta_expires_at": ceb.VentaExpiresAt,
						"owner_id":         ceb.OwnerID,
						"my_bid":           myBidValue,
						"is_auction":       true, // Es una subasta
					}
					result = append(result, item)

				case "team_constructor":
					var tcb models.TeamConstructorByLeague
					if err := database.DB.First(&tcb, auction.ItemID).Error; err != nil {
						log.Printf("[MY-BIDS-ALIAS] Error buscando team_constructor ID %d: %v", auction.ItemID, err)
						continue
					}
					if tcb.OwnerID == userID {
						continue // No mostrar si es propietario
					}
					var tc models.TeamConstructor
					database.DB.First(&tc, tcb.TeamConstructorID)
					item := map[string]interface{}{
						"id":               tcb.ID,
						"type":             "team_constructor",
						"name":             tc.Name,
						"driver_name":      tc.Name,
						"team":             tc.Name,
						"image_url":        tc.ImageURL,
						"value":            tc.Value,
						"mode":             "E", // Team Constructor
						"venta":            tcb.Venta,
						"venta_expires_at": tcb.VentaExpiresAt,
						"owner_id":         tcb.OwnerID,
						"my_bid":           myBidValue,
						"is_auction":       true, // Es una subasta
					}
					result = append(result, item)
				}
			}
		}

		// 2. Buscar ofertas directas a elementos con propietario (solo las que ha hecho el usuario)
		// Pilotos con ofertas directas del usuario (NO siendo propietario)
		var pilotsWithOffers []models.PilotByLeague
		database.DB.Where("league_id = ? AND owner_id > 0 AND owner_id != ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", leagueID, userID).Find(&pilotsWithOffers)

		for _, pbl := range pilotsWithOffers {
			var bids []Bid
			if len(pbl.Bids) > 0 {
				_ = json.Unmarshal(pbl.Bids, &bids)
			}
			found := false
			var myBidValue *float64
			for _, bid := range bids {
				if bid.PlayerID == userID {
					v := float64(bid.Valor)
					myBidValue = &v
					found = true
					break
				}
			}
			if found {
				var pilot models.Pilot
				database.DB.First(&pilot, pbl.PilotID)
				item := map[string]interface{}{
					"id":               pbl.ID,
					"type":             "pilot",
					"pilot_id":         pilot.ID,
					"driver_name":      pilot.DriverName,
					"name":             pilot.DriverName,
					"team":             pilot.Team,
					"image_url":        pilot.ImageURL,
					"value":            pilot.Value,
					"mode":             pilot.Mode, // Agregar el modo del piloto
					"venta":            pbl.Venta,
					"venta_expires_at": pbl.VentaExpiresAt,
					"clausulatime":     pbl.Clausulatime,
					"clausula_value":   pbl.ClausulaValue,
					"owner_id":         pbl.OwnerID,
					"my_bid":           myBidValue,
					"is_auction":       false, // Es una oferta directa
				}
				result = append(result, item)
			}
		}

		// Track Engineers con ofertas directas del usuario
		var trackEngineersWithOffers []models.TrackEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id > 0 AND owner_id != ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", leagueID, userID).Find(&trackEngineersWithOffers)

		for _, teb := range trackEngineersWithOffers {
			var bids []Bid
			if len(teb.Bids) > 0 {
				_ = json.Unmarshal(teb.Bids, &bids)
			}
			found := false
			var myBidValue *float64
			for _, bid := range bids {
				if bid.PlayerID == userID {
					v := float64(bid.Valor)
					myBidValue = &v
					found = true
					break
				}
			}
			if found {
				var te models.TrackEngineer
				database.DB.First(&te, teb.TrackEngineerID)

				// Buscar piloto relacionado
				var pilot models.Pilot
				pilotTeam := ""
				if err := database.DB.Where("track_engineer_id = ?", te.ID).First(&pilot).Error; err == nil {
					pilotTeam = pilot.Team
				}

				// Arreglar ruta de imagen para ingenieros de pista
				imageURL := te.ImageURL
				if imageURL != "" && !strings.Contains(imageURL, "ingenierosdepista/") {
					imageURL = "images/ingenierosdepista/" + strings.TrimPrefix(imageURL, "images/")
				}

				item := map[string]interface{}{
					"id":               teb.ID,
					"type":             "track_engineer",
					"name":             te.Name,
					"driver_name":      te.Name,
					"team":             pilotTeam,
					"image_url":        imageURL,
					"value":            te.Value,
					"mode":             "T", // Track Engineer
					"venta":            teb.Venta,
					"venta_expires_at": teb.VentaExpiresAt,
					"owner_id":         teb.OwnerID,
					"my_bid":           myBidValue,
					"is_auction":       false, // Es una oferta directa
				}
				result = append(result, item)
			}
		}

		// Chief Engineers con ofertas directas del usuario
		var chiefEngineersWithOffers []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id > 0 AND owner_id != ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", leagueID, userID).Find(&chiefEngineersWithOffers)

		for _, ceb := range chiefEngineersWithOffers {
			var bids []Bid
			if len(ceb.Bids) > 0 {
				_ = json.Unmarshal(ceb.Bids, &bids)
			}
			found := false
			var myBidValue *float64
			for _, bid := range bids {
				if bid.PlayerID == userID {
					v := float64(bid.Valor)
					myBidValue = &v
					found = true
					break
				}
			}
			if found {
				var ce models.ChiefEngineer
				database.DB.First(&ce, ceb.ChiefEngineerID)
				item := map[string]interface{}{
					"id":               ceb.ID,
					"type":             "chief_engineer",
					"name":             ce.Name,
					"driver_name":      ce.Name,
					"team":             ce.Team,
					"image_url":        ce.ImageURL,
					"value":            ce.Value,
					"mode":             "C", // Chief Engineer
					"venta":            ceb.Venta,
					"venta_expires_at": ceb.VentaExpiresAt,
					"owner_id":         ceb.OwnerID,
					"my_bid":           myBidValue,
					"is_auction":       false, // Es una oferta directa
				}
				result = append(result, item)
			}
		}

		// Team Constructors con ofertas directas del usuario
		var teamConstructorsWithOffers []models.TeamConstructorByLeague
		database.DB.Where("league_id = ? AND owner_id > 0 AND owner_id != ? AND bids IS NOT NULL AND bids != '[]' AND bids != 'null'", leagueID, userID).Find(&teamConstructorsWithOffers)

		for _, tcb := range teamConstructorsWithOffers {
			var bids []Bid
			if len(tcb.Bids) > 0 {
				_ = json.Unmarshal(tcb.Bids, &bids)
			}
			found := false
			var myBidValue *float64
			for _, bid := range bids {
				if bid.PlayerID == userID {
					v := float64(bid.Valor)
					myBidValue = &v
					found = true
					break
				}
			}
			if found {
				var tc models.TeamConstructor
				database.DB.First(&tc, tcb.TeamConstructorID)
				item := map[string]interface{}{
					"id":               tcb.ID,
					"type":             "team_constructor",
					"name":             tc.Name,
					"driver_name":      tc.Name,
					"team":             tc.Name,
					"image_url":        tc.ImageURL,
					"value":            tc.Value,
					"mode":             "E", // Team Constructor
					"venta":            tcb.Venta,
					"venta_expires_at": tcb.VentaExpiresAt,
					"owner_id":         tcb.OwnerID,
					"my_bid":           myBidValue,
					"is_auction":       false, // Es una oferta directa
				}
				result = append(result, item)
			}
		}

		log.Printf("[MY-BIDS-ALIAS] Devolviendo %d elementos con pujas del usuario %d", len(result), userID)
		c.JSON(200, gin.H{"bids": result})
	})

	// Endpoint para eliminar la puja de un usuario sobre cualquier elemento en una liga
	router.POST("/api/auctions/remove-bid", authMiddleware(), func(c *gin.Context) {
		var req struct {
			ItemType string `json:"item_type"`
			ItemID   uint   `json:"item_id"`
			LeagueID uint   `json:"league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}

		// Primero intentar buscar en subastas activas
		var auction Auction
		if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", req.ItemType, req.ItemID, req.LeagueID, time.Now()).First(&auction).Error; err == nil {
			// Es una subasta activa
			var bids []Bid
			if len(auction.Bids) > 0 {
				_ = json.Unmarshal(auction.Bids, &bids)
			}
			newBids := make([]Bid, 0)
			for _, b := range bids {
				if b.PlayerID != userID {
					newBids = append(newBids, b)
				}
			}
			bidsJSON, _ := json.Marshal(newBids)
			auction.Bids = bidsJSON
			if err := database.DB.Save(&auction).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error guardando la subasta"})
				return
			}
			c.JSON(200, gin.H{"success": true})
			return
		}

		// Si no es una subasta activa, buscar en ofertas directas según el tipo
		switch req.ItemType {
		case "pilot":
			var pbl models.PilotByLeague
			if err := database.DB.First(&pbl, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Elemento no encontrado"})
				return
			}
			var bids []Bid
			if len(pbl.Bids) > 0 {
				_ = json.Unmarshal(pbl.Bids, &bids)
			}
			newBids := make([]Bid, 0)
			for _, b := range bids {
				if b.PlayerID != userID {
					newBids = append(newBids, b)
				}
			}
			bidsJSON, _ := json.Marshal(newBids)
			pbl.Bids = bidsJSON
			database.DB.Save(&pbl)

		case "track_engineer":
			var teb models.TrackEngineerByLeague
			if err := database.DB.First(&teb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Elemento no encontrado"})
				return
			}
			var bids []Bid
			if len(teb.Bids) > 0 {
				_ = json.Unmarshal(teb.Bids, &bids)
			}
			newBids := make([]Bid, 0)
			for _, b := range bids {
				if b.PlayerID != userID {
					newBids = append(newBids, b)
				}
			}
			bidsJSON, _ := json.Marshal(newBids)
			teb.Bids = bidsJSON
			database.DB.Save(&teb)

		case "chief_engineer":
			var ceb models.ChiefEngineerByLeague
			if err := database.DB.First(&ceb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Elemento no encontrado"})
				return
			}
			var bids []Bid
			if len(ceb.Bids) > 0 {
				_ = json.Unmarshal(ceb.Bids, &bids)
			}
			newBids := make([]Bid, 0)
			for _, b := range bids {
				if b.PlayerID != userID {
					newBids = append(newBids, b)
				}
			}
			bidsJSON, _ := json.Marshal(newBids)
			ceb.Bids = bidsJSON
			database.DB.Save(&ceb)

		case "team_constructor":
			var tcb models.TeamConstructorByLeague
			if err := database.DB.First(&tcb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Elemento no encontrado"})
				return
			}
			var bids []Bid
			if len(tcb.Bids) > 0 {
				_ = json.Unmarshal(tcb.Bids, &bids)
			}
			newBids := make([]Bid, 0)
			for _, b := range bids {
				if b.PlayerID != userID {
					newBids = append(newBids, b)
				}
			}
			bidsJSON, _ := json.Marshal(newBids)
			tcb.Bids = bidsJSON
			database.DB.Save(&tcb)

		default:
			c.JSON(400, gin.H{"error": "Tipo de elemento no soportado"})
			return
		}

		c.JSON(200, gin.H{"success": true})
	})

	// Endpoint para actualizar ventas7fichajes y value de todos los pilotos
	router.POST("/api/drivers/update-values", authMiddleware(), func(c *gin.Context) {
		// Verificar que el usuario es admin
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}

		// Verificar si el usuario es admin
		var player models.Player
		if err := database.DB.First(&player, userID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Usuario no encontrado"})
			return
		}
		if !player.IsAdmin {
			c.JSON(403, gin.H{"error": "No tienes permisos de administrador"})
			return
		}
		log.Println("[UPDATE-VALUES] Iniciando actualización de valores y ventas7fichajes usando pilot_value_history y driver_value_update_log...")
		// Obtener la última fecha de actualización
		var lastUpdate time.Time
		database.DB.Raw("SELECT last_update FROM driver_value_update_log ORDER BY id DESC LIMIT 1").Scan(&lastUpdate)
		log.Printf("[UPDATE-VALUES] Última actualización: %v", lastUpdate)
		var pilots []models.Pilot
		database.DB.Find(&pilots)
		for _, pilot := range pilots {
			log.Printf("[UPDATE-VALUES] Piloto: %s (ID: %d)", pilot.DriverName, pilot.ID)
			var history []struct {
				ValorPagado float64
				Tipo        string
			}
			database.DB.Raw(`SELECT valor_pagado, tipo FROM pilot_value_history WHERE pilot_id = ? AND fecha > ?`, pilot.ID, lastUpdate).Scan(&history)
			numFichajes := 0
			numVentas := 0
			totalFichajes := 0.0
			totalVentas := 0.0
			valorActual := pilot.Value
			penalizacionExtra := 0.0
			for _, h := range history {
				if h.Tipo == "fichaje" {
					numFichajes++
					totalFichajes += h.ValorPagado
				}
				if h.Tipo == "venta" {
					numVentas++
					totalVentas += h.ValorPagado
					if h.ValorPagado < valorActual {
						penalizacion := (valorActual - h.ValorPagado) / valorActual
						penalizacionExtra += penalizacion * 0.1 * valorActual
					}
				}
			}
			ventas7fichajes := numFichajes - numVentas
			impactoFichajes := 0.0
			impactoVentas := 0.0
			if valorActual > 0 {
				impactoFichajes = (totalFichajes / valorActual) * 0.05 * valorActual
				impactoVentas = (totalVentas / valorActual) * 0.05 * valorActual
			}
			nuevoValor := valorActual + impactoFichajes - impactoVentas - penalizacionExtra
			if nuevoValor < 0 {
				nuevoValor = 0
			}
			log.Printf("[UPDATE-VALUES] totalFichajes: %.2f, totalVentas: %.2f, penalizacionExtra: %.2f, nuevoValor: %.2f", totalFichajes, totalVentas, penalizacionExtra, nuevoValor)
			dbRes1 := database.DB.Model(&models.Pilot{}).Where("id = ?", pilot.ID).Update("ventas7fichajes", ventas7fichajes)
			if dbRes1.Error != nil {
				log.Printf("[UPDATE-VALUES] Error actualizando ventas7fichajes para piloto %d: %v", pilot.ID, dbRes1.Error)
			}
			dbRes2 := database.DB.Model(&models.Pilot{}).Where("id = ?", pilot.ID).Update("value", nuevoValor)
			if dbRes2.Error != nil {
				log.Printf("[UPDATE-VALUES] Error actualizando value para piloto %d: %v", pilot.ID, dbRes2.Error)
			}
			var updatedPilot models.Pilot
			database.DB.First(&updatedPilot, pilot.ID)
			log.Printf("[UPDATE-VALUES] Valor actualizado ventas7fichajes: %d, value: %.2f", updatedPilot.Ventas7Fichajes, updatedPilot.Value)
			// En /api/drivers/update-values, después de actualizar el valor de cada piloto:
			// Buscar todos los pilot_by_leagues de este piloto
			var pbls []models.PilotByLeague
			database.DB.Where("pilot_id = ?", pilot.ID).Find(&pbls)
			for _, pbl := range pbls {
				if pbl.ClausulaValue == nil || nuevoValor > *pbl.ClausulaValue {
					pbl.ClausulaValue = &nuevoValor
					database.DB.Save(&pbl)
				}
			}
		}
		// Guardar la nueva fecha de actualización
		database.DB.Exec("INSERT INTO driver_value_update_log (last_update) VALUES (?)", time.Now())
		log.Println("[UPDATE-VALUES] Proceso finalizado.")
		c.JSON(200, gin.H{"message": "Valores y ventas7fichajes actualizados usando pilot_value_history y driver_value_update_log"})
	})

	// Endpoint para obtener el historial de actividad de mercado
	router.GET("/api/activity", func(c *gin.Context) {
		// Últimas 50 transacciones
		var results []struct {
			Tipo        string
			ValorPagado float64
			Fecha       time.Time
			PilotName   string
			PilotMode   string
			PlayerName  string
			CounterName string
		}
		database.DB.Raw(`
			SELECT h.tipo, h.valor_pagado, h.fecha, p.driver_name as pilot_name, p.mode as pilot_mode,
				pl.name as player_name,
				COALESCE(cp.name, 'FIA') as counter_name
			FROM pilot_value_history h
			LEFT JOIN pilots p ON h.pilot_id = p.id
			LEFT JOIN players pl ON h.player_id = pl.id
			LEFT JOIN players cp ON h.counterparty_id = cp.id
			ORDER BY h.fecha DESC
			LIMIT 50
		`).Scan(&results)
		c.JSON(200, gin.H{"history": results})
	})

	// Endpoint para crear o actualizar puntuaciones manuales de carrera
	router.POST("/api/admin/pilot-race", func(c *gin.Context) {
		var req models.PilotRace
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		// Obtener el piloto para saber su modo
		var pilot models.Pilot
		if err := database.DB.First(&pilot, req.PilotID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}

		// Calcular puntos por posición final
		positionPoints := getPositionPoints(pilot.Mode, req.FinishPosition)
		originalPoints := req.Points
		req.Points += positionPoints

		log.Printf("[RACE-POINTS] Piloto %s (Pos: %d): Delta=%d + Position=%d = Total=%d",
			pilot.DriverName, req.FinishPosition, originalPoints, positionPoints, req.Points)

		// Buscar si ya existe para ese piloto y GP
		var existing models.PilotRace
		if err := database.DB.Where("pilot_id = ? AND gp_index = ?", req.PilotID, req.GPIndex).First(&existing).Error; err == nil {
			req.ID = existing.ID
			database.DB.Save(&req)
		} else {
			if err := database.DB.Create(&req).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error guardando puntuación"})
				return
			}
		}

		// Actualizar puntos de todos los jugadores que tengan este piloto alineado
		go updatePlayerPointsForPilot(req.PilotID, req.GPIndex, req.Points, "race")

		c.JSON(200, gin.H{
			"message": "Puntuación guardada y puntos de jugadores actualizados",
			"points_breakdown": gin.H{
				"delta_points":    originalPoints,
				"position_points": positionPoints,
				"total_points":    req.Points,
				"position":        req.FinishPosition,
				"mode":            pilot.Mode,
			},
		})
	})

	// Endpoint para crear o actualizar puntuaciones manuales de qualy
	router.POST("/api/admin/pilot-qualy", func(c *gin.Context) {
		var req models.PilotQualy
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		// Obtener el piloto para saber su modo
		var pilot models.Pilot
		if err := database.DB.First(&pilot, req.PilotID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}

		// Calcular puntos por posición final
		positionPoints := getPositionPoints(pilot.Mode, req.FinishPosition)
		originalPoints := req.Points
		req.Points += positionPoints

		log.Printf("[QUALY-POINTS] Piloto %s (Pos: %d): Delta=%d + Position=%d = Total=%d",
			pilot.DriverName, req.FinishPosition, originalPoints, positionPoints, req.Points)

		var existing models.PilotQualy
		if err := database.DB.Where("pilot_id = ? AND gp_index = ?", req.PilotID, req.GPIndex).First(&existing).Error; err == nil {
			req.ID = existing.ID
			database.DB.Save(&req)
		} else {
			if err := database.DB.Create(&req).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error guardando puntuación"})
				return
			}
		}

		// Actualizar puntos de todos los jugadores que tengan este piloto alineado
		go updatePlayerPointsForPilot(req.PilotID, req.GPIndex, req.Points, "qualy")

		c.JSON(200, gin.H{
			"message": "Puntuación guardada y puntos de jugadores actualizados",
			"points_breakdown": gin.H{
				"delta_points":    originalPoints,
				"position_points": positionPoints,
				"total_points":    req.Points,
				"position":        req.FinishPosition,
				"mode":            pilot.Mode,
			},
		})
	})

	// Endpoint para crear o actualizar puntuaciones manuales de práctica
	router.POST("/api/admin/pilot-practice", func(c *gin.Context) {
		var req models.PilotPractice
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		// Obtener el piloto para saber su modo
		var pilot models.Pilot
		if err := database.DB.First(&pilot, req.PilotID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}

		// Calcular puntos por posición final
		positionPoints := getPositionPoints(pilot.Mode, req.FinishPosition)
		originalPoints := req.Points
		req.Points += positionPoints

		log.Printf("[PRACTICE-POINTS] Piloto %s (Pos: %d): Delta=%d + Position=%d = Total=%d",
			pilot.DriverName, req.FinishPosition, originalPoints, positionPoints, req.Points)

		var existing models.PilotPractice
		if err := database.DB.Where("pilot_id = ? AND gp_index = ?", req.PilotID, req.GPIndex).First(&existing).Error; err == nil {
			req.ID = existing.ID
			database.DB.Save(&req)
		} else {
			if err := database.DB.Create(&req).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error guardando puntuación"})
				return
			}
		}

		// Actualizar puntos de todos los jugadores que tengan este piloto alineado
		go updatePlayerPointsForPilot(req.PilotID, req.GPIndex, req.Points, "practice")

		c.JSON(200, gin.H{
			"message": "Puntuación guardada y puntos de jugadores actualizados",
			"points_breakdown": gin.H{
				"delta_points":    originalPoints,
				"position_points": positionPoints,
				"total_points":    req.Points,
				"position":        req.FinishPosition,
				"mode":            pilot.Mode,
			},
		})
	})

	// Endpoint para obtener la lista de GPs para el formulario
	router.GET("/api/grand-prix", func(c *gin.Context) {
		var gps []models.GrandPrix
		database.DB.Order("start_date asc").Find(&gps)
		c.JSON(200, gin.H{"gps": gps})
	})

	// Endpoint para obtener puntos actuales de un piloto en un GP específico
	router.GET("/api/pilot-points", func(c *gin.Context) {
		pilotID := c.Query("pilot_id")
		gpIndex := c.Query("gp_index")

		if pilotID == "" || gpIndex == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros pilot_id o gp_index"})
			return
		}

		log.Printf("[PILOT-POINTS] Buscando puntos para pilot_id=%s, gp_index=%s", pilotID, gpIndex)

		// Obtener el piloto para saber su modo
		var pilot models.Pilot
		if err := database.DB.First(&pilot, pilotID).Error; err != nil {
			log.Printf("[PILOT-POINTS] Error: Piloto no encontrado con ID %s", pilotID)
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}

		log.Printf("[PILOT-POINTS] Piloto encontrado: %s (ID: %d, Mode: %s)", pilot.DriverName, pilot.ID, pilot.Mode)

		var points int = 0
		var finishPosition int = 0
		var table string

		// Determinar la tabla según el modo del piloto
		switch pilot.Mode {
		case "race", "R":
			table = "pilot_races"
		case "qualy", "Q":
			table = "pilot_qualies"
		case "practice", "P":
			table = "pilot_practices"
		default:
			log.Printf("[PILOT-POINTS] Error: Modo de piloto inválido: %s", pilot.Mode)
			c.JSON(400, gin.H{"error": "Modo de piloto inválido"})
			return
		}

		log.Printf("[PILOT-POINTS] Buscando en tabla: %s", table)

		// Obtener puntos de la tabla correspondiente
		var result map[string]interface{}
		if err := database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).Take(&result).Error; err != nil {
			log.Printf("[PILOT-POINTS] No se encontraron puntos en %s para pilot_id=%s, gp_index=%s: %v", table, pilotID, gpIndex, err)
		} else {
			log.Printf("[PILOT-POINTS] Resultado encontrado: %+v", result)

			// Manejar diferentes tipos de datos para el campo points (puntos base)
			pointsRaw := result["points"]
			if pointsRaw == nil {
				log.Printf("[PILOT-POINTS] Campo points es NULL")
				points = 0
			} else if pointsVal, ok := pointsRaw.(float64); ok {
				points = int(pointsVal)
				log.Printf("[PILOT-POINTS] Puntos base extraídos (float64): %d", points)
			} else if pointsVal, ok := pointsRaw.(int); ok {
				points = pointsVal
				log.Printf("[PILOT-POINTS] Puntos base extraídos (int): %d", points)
			} else if pointsVal, ok := pointsRaw.(int64); ok {
				points = int(pointsVal)
				log.Printf("[PILOT-POINTS] Puntos base extraídos (int64): %d", points)
			} else {
				log.Printf("[PILOT-POINTS] Tipo de datos no manejado para points: %T, valor: %v", pointsRaw, pointsRaw)
				points = 0
			}

			// Obtener posición final para calcular puntos por posición
			finishPosRaw := result["finish_position"]
			if finishPosRaw != nil {
				if finishPosVal, ok := finishPosRaw.(float64); ok {
					finishPosition = int(finishPosVal)
				} else if finishPosVal, ok := finishPosRaw.(int); ok {
					finishPosition = finishPosVal
				} else if finishPosVal, ok := finishPosRaw.(int64); ok {
					finishPosition = int(finishPosVal)
				}
			}

			// Agregar puntos por posición final
			positionPoints := getPositionPoints(pilot.Mode, finishPosition)
			points += positionPoints

			log.Printf("[PILOT-POINTS] Pos: %d, Puntos por posición: %d", finishPosition, positionPoints)
		}

		log.Printf("[PILOT-POINTS] Devolviendo puntos totales: %d", points)
		c.JSON(200, gin.H{"points": points})
	})

	// Endpoint para obtener todos los datos de un piloto en pilot_practices
	router.GET("/api/pilot-practice-data", func(c *gin.Context) {
		pilotID := c.Query("pilot_id")
		gpIndex := c.Query("gp_index")

		if pilotID == "" {
			c.JSON(400, gin.H{"error": "Falta parámetro pilot_id"})
			return
		}

		log.Printf("[PILOT-PRACTICE-DATA] Buscando datos para pilot_id=%s, gp_index=%s", pilotID, gpIndex)

		// Obtener el piloto para verificar que existe
		var pilot models.Pilot
		if err := database.DB.First(&pilot, pilotID).Error; err != nil {
			log.Printf("[PILOT-PRACTICE-DATA] Error: Piloto no encontrado con ID %s", pilotID)
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}

		log.Printf("[PILOT-PRACTICE-DATA] Piloto encontrado: %s (ID: %d, Mode: %s)", pilot.DriverName, pilot.ID, pilot.Mode)

		// Construir la consulta
		query := database.DB.Table("pilot_practices").Where("pilot_id = ?", pilotID)
		if gpIndex != "" {
			query = query.Where("gp_index = ?", gpIndex)
		}

		// Obtener todos los registros
		var results []map[string]interface{}
		if err := query.Find(&results).Error; err != nil {
			log.Printf("[PILOT-PRACTICE-DATA] Error consultando pilot_practices: %v", err)
			c.JSON(500, gin.H{"error": "Error consultando base de datos"})
			return
		}

		log.Printf("[PILOT-PRACTICE-DATA] Encontrados %d registros", len(results))

		// Procesar los resultados para mostrar mejor los datos
		var processedResults []map[string]interface{}
		for _, result := range results {
			processed := make(map[string]interface{})

			// Copiar todos los campos
			for key, value := range result {
				processed[key] = value
			}

			// Calcular puntos esperados por posición para comparar
			if finishPos, ok := result["finish_position"].(float64); ok && finishPos > 0 {
				expectedPoints := getPositionPoints(pilot.Mode, int(finishPos))
				processed["expected_position_points"] = expectedPoints

				// Verificar si los puntos guardados coinciden con los esperados
				if savedPoints, ok := result["points"].(float64); ok {
					processed["points_match_expected"] = int(savedPoints) == expectedPoints
					processed["points_difference"] = int(savedPoints) - expectedPoints
				}
			}

			processedResults = append(processedResults, processed)
		}

		c.JSON(200, gin.H{
			"pilot": gin.H{
				"id":   pilot.ID,
				"name": pilot.DriverName,
				"mode": pilot.Mode,
			},
			"total_records": len(processedResults),
			"data":          processedResults,
		})
	})

	// Endpoint para corregir puntos de un piloto específico
	router.POST("/api/fix-pilot-points", func(c *gin.Context) {
		var req struct {
			PilotID uint   `json:"pilot_id"`
			GPIndex uint64 `json:"gp_index"`
			Mode    string `json:"mode"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[FIX-POINTS] Corrigiendo puntos para pilot_id=%d, gp_index=%d, mode=%s", req.PilotID, req.GPIndex, req.Mode)

		// Obtener el piloto
		var pilot models.Pilot
		if err := database.DB.First(&pilot, req.PilotID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}

		// Determinar tabla
		var table string
		switch req.Mode {
		case "race":
			table = "pilot_races"
		case "qualy":
			table = "pilot_qualies"
		case "practice":
			table = "pilot_practices"
		default:
			c.JSON(400, gin.H{"error": "Modo inválido"})
			return
		}

		// Obtener datos actuales
		var result map[string]interface{}
		if err := database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", req.PilotID, req.GPIndex).Take(&result).Error; err != nil {
			c.JSON(404, gin.H{"error": "Datos no encontrados"})
			return
		}

		// Extraer datos
		finishPosition := 0
		deltaPosition := 0

		if finishPosRaw := result["finish_position"]; finishPosRaw != nil {
			if finishPosVal, ok := finishPosRaw.(float64); ok {
				finishPosition = int(finishPosVal)
			}
		}

		if deltaPosRaw := result["delta_position"]; deltaPosRaw != nil {
			if deltaPosVal, ok := deltaPosRaw.(float64); ok {
				deltaPosition = int(deltaPosVal)
			}
		}

		// Calcular puntos correctos
		positionPoints := getPositionPoints(pilot.Mode, finishPosition)
		correctTotalPoints := deltaPosition + positionPoints

		log.Printf("[FIX-POINTS] Posición: %d, Delta: %d, Puntos por posición: %d, Total correcto: %d",
			finishPosition, deltaPosition, positionPoints, correctTotalPoints)

		// Actualizar puntos en la base de datos
		if err := database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", req.PilotID, req.GPIndex).
			Update("points", correctTotalPoints).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error actualizando puntos"})
			return
		}

		// Actualizar puntos de jugadores
		go updatePlayerPointsForPilot(req.PilotID, req.GPIndex, correctTotalPoints, req.Mode)

		c.JSON(200, gin.H{
			"message": "Puntos corregidos",
			"details": gin.H{
				"pilot_id":             req.PilotID,
				"gp_index":             req.GPIndex,
				"mode":                 req.Mode,
				"finish_position":      finishPosition,
				"delta_position":       deltaPosition,
				"position_points":      positionPoints,
				"correct_total_points": correctTotalPoints,
			},
		})
	})

	// Endpoint para corregir automáticamente todos los puntos incorrectos
	router.POST("/api/fix-all-pilot-points", func(c *gin.Context) {
		log.Printf("[FIX-ALL-POINTS] Iniciando corrección automática de todos los puntos")

		// Corregir pilot_practices
		var practiceResults []map[string]interface{}
		if err := database.DB.Table("pilot_practices").Find(&practiceResults).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error consultando pilot_practices"})
			return
		}

		corrections := []map[string]interface{}{}

		for _, result := range practiceResults {
			pilotID := uint(result["pilot_id"].(float64))
			gpIndex := uint(result["gp_index"].(float64))
			finishPosition := int(result["finish_position"].(float64))
			deltaPosition := int(result["delta_position"].(float64))
			currentPoints := int(result["points"].(float64))

			// Obtener el piloto
			var pilot models.Pilot
			if err := database.DB.First(&pilot, pilotID).Error; err != nil {
				continue
			}

			// Calcular puntos correctos
			positionPoints := getPositionPoints(pilot.Mode, finishPosition)
			correctTotalPoints := deltaPosition + positionPoints

			// Si los puntos son incorrectos, corregir
			if currentPoints != correctTotalPoints {
				log.Printf("[FIX-ALL-POINTS] Corrigiendo pilot_id=%d, gp_index=%d: %d → %d",
					pilotID, gpIndex, currentPoints, correctTotalPoints)

				// Actualizar en la base de datos
				if err := database.DB.Table("pilot_practices").
					Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).
					Update("points", correctTotalPoints).Error; err != nil {
					log.Printf("[FIX-ALL-POINTS] Error actualizando pilot_id=%d: %v", pilotID, err)
					continue
				}

				// Actualizar puntos de jugadores
				go updatePlayerPointsForPilot(pilotID, uint64(gpIndex), correctTotalPoints, "practice")

				corrections = append(corrections, map[string]interface{}{
					"pilot_id":        pilotID,
					"pilot_name":      pilot.DriverName,
					"gp_index":        gpIndex,
					"mode":            "practice",
					"finish_position": finishPosition,
					"delta_position":  deltaPosition,
					"old_points":      currentPoints,
					"new_points":      correctTotalPoints,
					"position_points": positionPoints,
				})
			}
		}

		// Corregir pilot_qualies
		var qualyResults []map[string]interface{}
		if err := database.DB.Table("pilot_qualies").Find(&qualyResults).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error consultando pilot_qualies"})
			return
		}

		for _, result := range qualyResults {
			pilotID := uint(result["pilot_id"].(float64))
			gpIndex := uint(result["gp_index"].(float64))
			finishPosition := int(result["finish_position"].(float64))
			deltaPosition := int(result["delta_position"].(float64))
			currentPoints := int(result["points"].(float64))

			var pilot models.Pilot
			if err := database.DB.First(&pilot, pilotID).Error; err != nil {
				continue
			}

			positionPoints := getPositionPoints(pilot.Mode, finishPosition)
			correctTotalPoints := deltaPosition + positionPoints

			if currentPoints != correctTotalPoints {
				log.Printf("[FIX-ALL-POINTS] Corrigiendo pilot_id=%d, gp_index=%d: %d → %d",
					pilotID, gpIndex, currentPoints, correctTotalPoints)

				if err := database.DB.Table("pilot_qualies").
					Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).
					Update("points", correctTotalPoints).Error; err != nil {
					continue
				}

				go updatePlayerPointsForPilot(pilotID, uint64(gpIndex), correctTotalPoints, "qualy")

				corrections = append(corrections, map[string]interface{}{
					"pilot_id":        pilotID,
					"pilot_name":      pilot.DriverName,
					"gp_index":        gpIndex,
					"mode":            "qualy",
					"finish_position": finishPosition,
					"delta_position":  deltaPosition,
					"old_points":      currentPoints,
					"new_points":      correctTotalPoints,
					"position_points": positionPoints,
				})
			}
		}

		// Corregir pilot_races
		var raceResults []map[string]interface{}
		if err := database.DB.Table("pilot_races").Find(&raceResults).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error consultando pilot_races"})
			return
		}

		for _, result := range raceResults {
			pilotID := uint(result["pilot_id"].(float64))
			gpIndex := uint(result["gp_index"].(float64))
			finishPosition := int(result["finish_position"].(float64))
			deltaPosition := int(result["delta_position"].(float64))
			currentPoints := int(result["points"].(float64))

			var pilot models.Pilot
			if err := database.DB.First(&pilot, pilotID).Error; err != nil {
				continue
			}

			positionPoints := getPositionPoints(pilot.Mode, finishPosition)
			correctTotalPoints := deltaPosition + positionPoints

			if currentPoints != correctTotalPoints {
				log.Printf("[FIX-ALL-POINTS] Corrigiendo pilot_id=%d, gp_index=%d: %d → %d",
					pilotID, gpIndex, currentPoints, correctTotalPoints)

				if err := database.DB.Table("pilot_races").
					Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).
					Update("points", correctTotalPoints).Error; err != nil {
					continue
				}

				go updatePlayerPointsForPilot(pilotID, uint64(gpIndex), correctTotalPoints, "race")

				corrections = append(corrections, map[string]interface{}{
					"pilot_id":        pilotID,
					"pilot_name":      pilot.DriverName,
					"gp_index":        gpIndex,
					"mode":            "race",
					"finish_position": finishPosition,
					"delta_position":  deltaPosition,
					"old_points":      currentPoints,
					"new_points":      correctTotalPoints,
					"position_points": positionPoints,
				})
			}
		}

		c.JSON(200, gin.H{
			"message":           "Corrección automática completada",
			"total_corrections": len(corrections),
			"corrections":       corrections,
		})
	})

	// Endpoint para obtener puntos actuales de un team constructor en un GP específico
	router.GET("/api/team-constructor-points", func(c *gin.Context) {
		teamConstructorID := c.Query("team_constructor_id")
		gpIndex := c.Query("gp_index")

		if teamConstructorID == "" || gpIndex == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros team_constructor_id o gp_index"})
			return
		}

		// Obtener el team constructor
		var teamConstructor models.TeamConstructorByLeague
		if err := database.DB.First(&teamConstructor, teamConstructorID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Team constructor no encontrado"})
			return
		}

		// Obtener puntos de la tabla team_races
		var result map[string]interface{}
		points := 0
		if err := database.DB.Table("team_races").Where("teamconstructor_id = ? AND gp_index = ?", teamConstructor.TeamConstructorID, gpIndex).Take(&result).Error; err == nil {
			if pointsRaw := result["points"]; pointsRaw != nil {
				if pointsVal, ok := pointsRaw.(float64); ok {
					points = int(pointsVal)
				} else if pointsVal, ok := pointsRaw.(int); ok {
					points = pointsVal
				} else if pointsVal, ok := pointsRaw.(int64); ok {
					points = int(pointsVal)
				}
			}
		}

		c.JSON(200, gin.H{"points": points})
	})

	// Endpoint para obtener puntos actuales de un chief engineer en un GP específico
	router.GET("/api/chief-engineer-points", func(c *gin.Context) {
		chiefEngineerID := c.Query("chief_engineer_id")
		gpIndex := c.Query("gp_index")

		if chiefEngineerID == "" || gpIndex == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros chief_engineer_id o gp_index"})
			return
		}

		// Obtener el chief engineer by league
		var chiefEngineerByLeague models.ChiefEngineerByLeague
		if err := database.DB.First(&chiefEngineerByLeague, chiefEngineerID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Chief engineer no encontrado"})
			return
		}

		// Obtener el chief engineer para conocer su equipo
		var chiefEngineer models.ChiefEngineer
		if err := database.DB.First(&chiefEngineer, chiefEngineerByLeague.ChiefEngineerID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Chief engineer details no encontrado"})
			return
		}

		// Buscar el team constructor correspondiente al equipo del chief engineer
		var teamConstructor models.TeamConstructor
		if err := database.DB.Where("name = ? AND gp_index = ?", chiefEngineer.Team, gpIndex).First(&teamConstructor).Error; err != nil {
			c.JSON(404, gin.H{"error": "Team constructor no encontrado para el equipo del chief engineer"})
			return
		}

		// Obtener puntos de la tabla team_races basándose en el team constructor
		var result map[string]interface{}
		points := 0
		if err := database.DB.Table("team_races").Where("teamconstructor_id = ? AND gp_index = ?", teamConstructor.ID, gpIndex).Take(&result).Error; err == nil {
			if pointsRaw := result["points"]; pointsRaw != nil {
				if pointsVal, ok := pointsRaw.(float64); ok {
					points = int(pointsVal)
				} else if pointsVal, ok := pointsRaw.(int); ok {
					points = pointsVal
				} else if pointsVal, ok := pointsRaw.(int64); ok {
					points = int(pointsVal)
				}
			}
		}

		c.JSON(200, gin.H{"points": points})
	})

	// Endpoint para obtener puntos actuales de un track engineer en un GP específico
	router.GET("/api/track-engineers", func(c *gin.Context) {
		var trackEngineers []models.TrackEngineer
		if err := database.DB.Find(&trackEngineers).Error; err != nil {
			log.Printf("[TRACK-ENG-API] Error obteniendo track engineers: %v", err)
			c.JSON(500, gin.H{"error": "Error obteniendo track engineers"})
			return
		}

		// Enriquecer con información del piloto asociado
		type TrackEngineerWithPilot struct {
			models.TrackEngineer
			PilotName string `json:"pilot_name"`
		}

		var enrichedTrackEngineers []TrackEngineerWithPilot
		for _, te := range trackEngineers {
			enriched := TrackEngineerWithPilot{
				TrackEngineer: te,
				PilotName:     "Sin piloto",
			}

			// Buscar el piloto asociado
			var pilot models.Pilot
			if err := database.DB.Where("track_engineer_id = ?", te.ID).First(&pilot).Error; err == nil {
				enriched.PilotName = pilot.DriverName
			}

			enrichedTrackEngineers = append(enrichedTrackEngineers, enriched)
		}

		log.Printf("[TRACK-ENG-API] Track engineers encontrados: %d", len(enrichedTrackEngineers))
		for _, te := range enrichedTrackEngineers {
			log.Printf("[TRACK-ENG-API] - ID: %d, Name: %s, Pilot: %s", te.ID, te.Name, te.PilotName)
		}

		c.JSON(200, gin.H{"track_engineers": enrichedTrackEngineers})
	})

	// Endpoint para obtener datos existentes de track engineer points (filtrado por modo opcional)
	router.GET("/api/admin/track-engineer-points-existing", func(c *gin.Context) {
		gpIndex := c.Query("gp_index")
		trackEngineerID := c.Query("track_engineer_id")
		mode := c.Query("mode") // Opcional

		if gpIndex == "" || trackEngineerID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros gp_index o track_engineer_id"})
			return
		}

		var existingRecords []models.TrackEngineerPoints
		query := database.DB.Where("track_engineer_id = ? AND gp_index = ?", trackEngineerID, gpIndex)

		// Si se especifica modo, filtrar por él
		if mode != "" {
			query = query.Where("session_type = ?", mode)
		}

		err := query.Find(&existingRecords).Error

		if err != nil || len(existingRecords) == 0 {
			c.JSON(200, gin.H{"exists": false, "records": []models.TrackEngineerPoints{}})
		} else {
			c.JSON(200, gin.H{
				"exists":  true,
				"records": existingRecords,
				"count":   len(existingRecords),
			})
		}
	})

	// Endpoint temporal para debug: ver track engineers y sus pilotos asociados
	router.GET("/api/debug/track-engineers-pilots", func(c *gin.Context) {
		var trackEngineers []models.TrackEngineer
		database.DB.Find(&trackEngineers)

		var pilots []models.Pilot
		database.DB.Find(&pilots)

		result := make(map[string]interface{})
		result["track_engineers"] = trackEngineers
		result["pilots"] = pilots

		// Asociaciones
		associations := []map[string]interface{}{}
		for _, te := range trackEngineers {
			for _, pilot := range pilots {
				if pilot.TrackEngineerID == te.ID {
					associations = append(associations, map[string]interface{}{
						"track_engineer_id":   te.ID,
						"track_engineer_name": te.Name,
						"pilot_id":            pilot.ID,
						"pilot_name":          pilot.DriverName,
						"pilot_team":          pilot.Team,
						"pilot_mode":          pilot.Mode,
					})
				}
			}
		}
		result["associations"] = associations

		c.JSON(200, result)
	})

	// Endpoint para asignar track engineers a pilotos (FIX)
	router.POST("/api/admin/fix-track-engineer-assignments", func(c *gin.Context) {
		// Asignaciones basadas en F1 2025
		assignments := map[string]uint{
			"Max Verstappen":    1,  // Gianpiero Lambiase
			"Yuki Tsunoda":      2,  // Richard Wood
			"George Russell":    7,  // Marcus Dudley
			"Kimi Antonelli":    8,  // Peter Bonnington
			"Oscar Piastri":     5,  // Will Joseph
			"Lando Norris":      6,  // Tom Stallard
			"Charles Leclerc":   4,  // Bryan Bozzi
			"Lewis Hamilton":    3,  // Riccardo Adami
			"Fernando Alonso":   9,  // Andrew Vizard
			"Lance Stroll":      10, // Gary Gannon
			"Pierre Gasly":      11, // John Howard
			"Franco Colapinto":  12, // Laura Mueller
			"Nico Hulkenberg":   13, // Ronan Ohare
			"Gabriel Bortoleto": 14, // Steven Petrik
			"Esteban Ocon":      15, // Jose M Lopez
			"Oliver Bearman":    16, // Pierre Hamelin
			"Alexander Albon":   17, // Ernesto Desiderio
			"Carlos Sainz":      18, // Gaetan Jego
			"Isack Hadjar":      19, // James Urwin
			"Liam Lawson":       1,  // Reutilizar Gianpiero Lambiase
		}

		updated := 0
		for driverName, trackEngineerID := range assignments {
			result := database.DB.Model(&models.Pilot{}).
				Where("driver_name = ?", driverName).
				Update("track_engineer_id", trackEngineerID)

			if result.Error != nil {
				log.Printf("Error actualizando %s: %v", driverName, result.Error)
			} else {
				updated += int(result.RowsAffected)
				log.Printf("✅ %s -> Track Engineer %d", driverName, trackEngineerID)
			}
		}

		c.JSON(200, gin.H{
			"message":        "Asignaciones completadas",
			"updated_pilots": updated,
		})
	})

	// Endpoint para poblar datos de ejemplo de track engineers (solo para desarrollo)
	router.POST("/api/admin/seed-track-engineers", func(c *gin.Context) {
		// Verificar si ya existen datos
		var count int64
		database.DB.Model(&models.TrackEngineer{}).Count(&count)
		if count > 0 {
			c.JSON(200, gin.H{"message": fmt.Sprintf("Ya existen %d track engineers", count)})
			return
		}

		// Crear datos de ejemplo
		sampleTrackEngineers := []models.TrackEngineer{
			{Name: "Gianpiero Lambiase", Value: 5.0, ImageURL: "/images/ingenierosdepista/Gianpiero _Lambiase.png", Team: "Red Bull Racing", GPIndex: 1},
			{Name: "Peter Bonnington", Value: 4.8, ImageURL: "/images/ingenierosdepista/Peter_Bonnington.png", Team: "Mercedes", GPIndex: 1},
			{Name: "Riccardo Adami", Value: 4.5, ImageURL: "/images/ingenierosdepista/Riccardo_Adami.png", Team: "Ferrari", GPIndex: 1},
			{Name: "Tom Stallard", Value: 4.3, ImageURL: "/images/ingenierosdepista/Tom_Stallard.png", Team: "McLaren", GPIndex: 1},
			{Name: "Josh Peckett", Value: 4.0, ImageURL: "/images/ingenierosdepista/Josh_Peckett.png", Team: "Aston Martin", GPIndex: 1},
		}

		for _, te := range sampleTrackEngineers {
			if err := database.DB.Create(&te).Error; err != nil {
				log.Printf("Error creando track engineer %s: %v", te.Name, err)
			}
		}

		c.JSON(200, gin.H{"message": fmt.Sprintf("Creados %d track engineers de ejemplo", len(sampleTrackEngineers))})
	})

	router.GET("/api/track-engineer-points", func(c *gin.Context) {
		trackEngineerID := c.Query("track_engineer_id")
		gpIndex := c.Query("gp_index")

		if trackEngineerID == "" || gpIndex == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros track_engineer_id o gp_index"})
			return
		}

		// Obtener el track engineer
		var trackEngineer models.TrackEngineerByLeague
		if err := database.DB.First(&trackEngineer, trackEngineerID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Track engineer no encontrado"})
			return
		}

		// Obtener puntos de la tabla track_engineers
		var result map[string]interface{}
		points := 0
		if err := database.DB.Table("track_engineers").Where("id = ? AND gp_index = ?", trackEngineer.TrackEngineerID, gpIndex).Take(&result).Error; err == nil {
			if pointsVal, ok := result["total_points"].(float64); ok {
				points = int(pointsVal)
			}
		}

		c.JSON(200, gin.H{"points": points})
	})

	// Endpoint para obtener puntos de track engineer por GP
	router.GET("/api/track-engineer-gp-points", func(c *gin.Context) {
		trackEngineerID := c.Query("track_engineer_id")
		gpIndex := c.Query("gp_index")

		if trackEngineerID == "" || gpIndex == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "track_engineer_id y gp_index son requeridos"})
			return
		}

		var trackEngineerPoints []models.TrackEngineerPoints
		if err := database.DB.Where("track_engineer_id = ? AND gp_index = ?", trackEngineerID, gpIndex).Find(&trackEngineerPoints).Error; err != nil {
			log.Printf("[TRACK-ENG-GP-POINTS] ❌ Error al buscar puntos: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener puntos"})
			return
		}

		// Calcular puntos totales y crear criterios de puntuación
		totalPoints := 0
		performance := "No"
		var scoringCriteria []map[string]interface{}

		for _, point := range trackEngineerPoints {
			totalPoints += point.TotalPoints

			// Si algún multiplicador es 0.5, significa que tuvo buen performance
			if point.Multiplier == 0.5 {
				performance = "Yes"
			}

			// Agregar criterio de puntuación para cada sesión
			sessionType := point.SessionType
			if sessionType == "" {
				sessionType = "race"
			}

			scoringCriteria = append(scoringCriteria, map[string]interface{}{
				"session_type":      sessionType,
				"pilot_position":    point.PilotPosition,
				"teammate_position": point.TeammatePosition,
				"base_points":       point.BasePoints,
				"multiplier":        point.Multiplier,
				"total_points":      point.TotalPoints,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"points":           totalPoints,
			"performance":      performance,
			"scoring_criteria": scoringCriteria,
		})
	})

	// Endpoint para obtener puntos de chief engineers por GP (para la pestaña de puntos)
	router.GET("/api/chief-engineer-gp-points", func(c *gin.Context) {
		chiefEngineerID := c.Query("chief_engineer_id")
		gpIndex := c.Query("gp_index")

		if chiefEngineerID == "" || gpIndex == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros chief_engineer_id o gp_index"})
			return
		}

		// Obtener el chief engineer by league
		var chiefEngineerByLeague models.ChiefEngineerByLeague
		if err := database.DB.First(&chiefEngineerByLeague, chiefEngineerID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Chief engineer no encontrado"})
			return
		}

		// Obtener el chief engineer para conocer su equipo
		var chiefEngineer models.ChiefEngineer
		if err := database.DB.First(&chiefEngineer, chiefEngineerByLeague.ChiefEngineerID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Chief engineer details no encontrado"})
			return
		}

		// Buscar el team constructor correspondiente al equipo del chief engineer
		var teamConstructor models.TeamConstructor
		if err := database.DB.Where("name = ? AND gp_index = ?", chiefEngineer.Team, gpIndex).First(&teamConstructor).Error; err != nil {
			c.JSON(404, gin.H{"error": "Team constructor no encontrado para el equipo del chief engineer"})
			return
		}

		// Obtener puntos de la tabla team_races basándose en el team constructor
		var result map[string]interface{}
		points := 0
		if err := database.DB.Table("team_races").Where("teamconstructor_id = ? AND gp_index = ?", teamConstructor.ID, gpIndex).Take(&result).Error; err == nil {
			if pointsRaw := result["points"]; pointsRaw != nil {
				if pointsVal, ok := pointsRaw.(float64); ok {
					points = int(pointsVal)
				} else if pointsVal, ok := pointsRaw.(int); ok {
					points = pointsVal
				} else if pointsVal, ok := pointsRaw.(int64); ok {
					points = int(pointsVal)
				}
			}
		}

		// Obtener información adicional del GP
		var grandPrix models.GrandPrix
		database.DB.Where("gp_index = ?", gpIndex).First(&grandPrix)

		// Obtener criterios de puntuación de team_races
		var teamRaceResult map[string]interface{}
		expectedPosition := 0.0
		finishPosition := 0.0
		deltaPosition := 0.0

		if err := database.DB.Table("team_races").Where("teamconstructor_id = ? AND gp_index = ?", teamConstructor.ID, gpIndex).Take(&teamRaceResult).Error; err == nil {
			// Obtener posición esperada
			if expPos, ok := teamRaceResult["expected_position"].(float64); ok {
				expectedPosition = expPos
			}

			// Obtener posición final
			if finPos, ok := teamRaceResult["finish_position"].(float64); ok {
				finishPosition = finPos
			}

			// Calcular delta
			deltaPosition = expectedPosition - finishPosition
		}

		c.JSON(200, gin.H{
			"points":              points,
			"gp_name":             grandPrix.Name,
			"gp_index":            gpIndex,
			"chief_engineer_name": chiefEngineer.Name,
			"team":                chiefEngineer.Team,
			"scoring_criteria": gin.H{
				"expected_position": expectedPosition,
				"finish_position":   finishPosition,
				"delta_position":    deltaPosition,
				"total_points":      points,
			},
		})
	})

	// Endpoint de prueba para verificar datos en pilot_races
	router.GET("/api/debug/pilot-races", func(c *gin.Context) {
		pilotID := c.Query("pilot_id")
		gpIndex := c.Query("gp_index")

		if pilotID == "" || gpIndex == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros pilot_id o gp_index"})
			return
		}

		log.Printf("[DEBUG] Buscando en pilot_races para pilot_id=%s, gp_index=%s", pilotID, gpIndex)

		// Buscar en pilot_races
		var raceResults []map[string]interface{}
		database.DB.Table("pilot_races").Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).Find(&raceResults)

		// Buscar en pilot_qualies
		var qualyResults []map[string]interface{}
		database.DB.Table("pilot_qualies").Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).Find(&qualyResults)

		// Buscar en pilot_practices
		var practiceResults []map[string]interface{}
		database.DB.Table("pilot_practices").Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).Find(&practiceResults)

		log.Printf("[DEBUG] Resultados encontrados - Race: %d, Qualy: %d, Practice: %d",
			len(raceResults), len(qualyResults), len(practiceResults))

		c.JSON(200, gin.H{
			"pilot_id":         pilotID,
			"gp_index":         gpIndex,
			"race_results":     raceResults,
			"qualy_results":    qualyResults,
			"practice_results": practiceResults,
		})
	})

	// DEBUG: Endpoint para verificar el estado completo de una liga
	router.GET("/api/debug/league/:id", func(c *gin.Context) {
		leagueID := c.Param("id")

		// Obtener la liga
		var league models.League
		if err := database.DB.First(&league, leagueID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Liga no encontrada"})
			return
		}

		// Obtener PlayerByLeague registros
		var playersByLeague []models.PlayerByLeague
		database.DB.Where("league_id = ?", leagueID).Find(&playersByLeague)

		// Obtener MarketItems
		var marketItems []models.MarketItem
		database.DB.Where("league_id = ?", leagueID).Find(&marketItems)

		// Contar por tipo
		marketStats := map[string]int{
			"pilot":            0,
			"track_engineer":   0,
			"chief_engineer":   0,
			"team_constructor": 0,
			"total":            len(marketItems),
			"active":           0,
			"in_market":        0,
		}

		for _, item := range marketItems {
			marketStats[item.ItemType]++
			if item.IsActive {
				marketStats["active"]++
			}
			if item.IsInMarket {
				marketStats["in_market"]++
			}
		}

		// Obtener información de los players
		var playersInfo []gin.H
		for _, pbl := range playersByLeague {
			var player models.Player
			if err := database.DB.First(&player, pbl.PlayerID).Error; err == nil {
				playersInfo = append(playersInfo, gin.H{
					"player_id":    pbl.PlayerID,
					"player_name":  player.Name,
					"player_email": player.Email,
					"money":        pbl.Money,
					"team_value":   pbl.TeamValue,
				})
			}
		}

		// Sample de market items
		var marketSample []gin.H
		limit := 5
		if len(marketItems) < limit {
			limit = len(marketItems)
		}
		for i := 0; i < limit; i++ {
			marketSample = append(marketSample, gin.H{
				"id":           marketItems[i].ID,
				"item_type":    marketItems[i].ItemType,
				"item_id":      marketItems[i].ItemID,
				"is_active":    marketItems[i].IsActive,
				"is_in_market": marketItems[i].IsInMarket,
			})
		}

		c.JSON(200, gin.H{
			"league": gin.H{
				"id":         league.ID,
				"name":       league.Name,
				"code":       league.Code,
				"player_id":  league.PlayerID,
				"created_at": league.CreatedAt,
			},
			"players_count":       len(playersByLeague),
			"players":             playersInfo,
			"market_stats":        marketStats,
			"market_items_sample": marketSample,
		})
	})

	// Endpoint para guardar posiciones esperadas manualmente
	router.POST("/api/admin/expected-positions", func(c *gin.Context) {
		var req struct {
			GPIndex   uint64 `json:"gp_index"`
			Mode      string `json:"mode"`
			Positions []struct {
				PilotID          uint `json:"pilot_id"`
				ExpectedPosition int  `json:"expected_position"`
			} `json:"positions"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("[EXPECTED-POSITIONS] Error ShouldBindJSON: %v", err)
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		log.Printf("[EXPECTED-POSITIONS] Request recibido: gp_index=%d, mode=%s, positions=%+v", req.GPIndex, req.Mode, req.Positions)
		var table string
		switch req.Mode {
		case "race":
			table = "pilot_races"
		case "qualy":
			table = "pilot_qualies"
		case "practice":
			table = "pilot_practices"
		default:
			c.JSON(400, gin.H{"error": "Modo inválido"})
			return
		}
		for _, pos := range req.Positions {
			log.Printf("[EXPECTED-POSITIONS] Procesando pilot_id=%d, gp_index=%d, expected_position=%d en tabla=%s", pos.PilotID, req.GPIndex, pos.ExpectedPosition, table)

			// Buscar si ya existe
			var count int64
			err := database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", pos.PilotID, req.GPIndex).Count(&count).Error
			if err != nil {
				log.Printf("[EXPECTED-POSITIONS] Error contando registros: %v", err)
				c.JSON(500, gin.H{"error": "Error en base de datos"})
				return
			}

			log.Printf("[EXPECTED-POSITIONS] Registros encontrados: %d", count)

			if count > 0 {
				// Actualizar
				err = database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", pos.PilotID, req.GPIndex).Update("expected_position", pos.ExpectedPosition).Error
				if err != nil {
					log.Printf("[EXPECTED-POSITIONS] Error actualizando: %v", err)
					c.JSON(500, gin.H{"error": "Error actualizando registro"})
					return
				}
				log.Printf("[EXPECTED-POSITIONS] Registro actualizado exitosamente")
			} else {
				// Crear
				err = database.DB.Exec("INSERT INTO "+table+" (pilot_id, gp_index, expected_position) VALUES (?, ?, ?)", pos.PilotID, req.GPIndex, pos.ExpectedPosition).Error
				if err != nil {
					log.Printf("[EXPECTED-POSITIONS] Error creando: %v", err)
					c.JSON(500, gin.H{"error": "Error creando registro"})
					return
				}
				log.Printf("[EXPECTED-POSITIONS] Registro creado exitosamente")
			}
		}
		c.JSON(200, gin.H{"message": "Posiciones esperadas guardadas"})
	})

	// Endpoint para obtener posiciones esperadas ya guardadas para un GP y modo
	router.GET("/api/admin/expected-positions", func(c *gin.Context) {
		gpIndex := c.Query("gp_index")
		mode := c.Query("mode")
		var table string
		switch mode {
		case "race":
			table = "pilot_races"
		case "qualy":
			table = "pilot_qualies"
		case "practice":
			table = "pilot_practices"
		default:
			c.JSON(400, gin.H{"error": "Modo inválido"})
			return
		}
		var results []struct {
			PilotID          uint `json:"pilot_id"`
			ExpectedPosition int  `json:"expected_position"`
		}
		database.DB.Table(table).Select("pilot_id, expected_position").Where("gp_index = ?", gpIndex).Order("expected_position ASC").Scan(&results)
		c.JSON(200, gin.H{"positions": results})
	})

	// Endpoint para obtener los resultados de sesión de un piloto en un GP y modo
	router.GET("/api/admin/session-result", func(c *gin.Context) {
		gpIndex := c.Query("gp_index")
		mode := c.Query("mode")
		pilotID := c.Query("pilot_id")
		var table string
		switch mode {
		case "race":
			table = "pilot_races"
		case "qualy":
			table = "pilot_qualies"
		case "practice":
			table = "pilot_practices"
		default:
			c.JSON(400, gin.H{"error": "Modo inválido"})
			return
		}
		var result map[string]interface{}
		database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).Take(&result)
		c.JSON(200, gin.H{"result": result})
	})

	// Endpoint para obtener posiciones esperadas de equipos para un GP
	router.GET("/api/admin/team-expected-positions", func(c *gin.Context) {
		gpIndex := c.Query("gp_index")
		if gpIndex == "" {
			c.JSON(400, gin.H{"error": "Falta gp_index"})
			return
		}

		var teamConstructors []models.TeamConstructor
		database.DB.Where("gp_index = ?", gpIndex).Find(&teamConstructors)

		var positions []map[string]interface{}
		for _, tc := range teamConstructors {
			// Buscar si ya existe un registro en team_races
			var teamRace models.TeamRace
			database.DB.Where("teamconstructor_id = ? AND gp_index = ?", tc.ID, gpIndex).First(&teamRace)

			positions = append(positions, map[string]interface{}{
				"team":                 tc.Name,
				"expected_position":    teamRace.ExpectedPosition,
				"teamconstructor_id":   tc.ID,
				"teamconstructor_name": tc.Name,
			})
		}

		c.JSON(200, gin.H{"positions": positions})
	})

	// Endpoint para guardar posiciones esperadas de equipos
	router.POST("/api/admin/team-expected-positions", func(c *gin.Context) {
		var req struct {
			GPIndex   uint64 `json:"gp_index"`
			Positions []struct {
				Team             string  `json:"team"`
				ExpectedPosition float64 `json:"expected_position"`
			} `json:"positions"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("[TEAM-EXPECTED-POSITIONS] Error ShouldBindJSON: %v", err)
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[TEAM-EXPECTED-POSITIONS] Request recibido: gp_index=%d, positions=%+v", req.GPIndex, req.Positions)

		updatedCount := 0
		createdCount := 0
		for _, pos := range req.Positions {
			// Buscar el team constructor por nombre
			var teamConstructor models.TeamConstructor
			if err := database.DB.Where("name = ? AND gp_index = ?", pos.Team, req.GPIndex).First(&teamConstructor).Error; err != nil {
				log.Printf("[TEAM-EXPECTED-POSITIONS] Error encontrando team constructor %s: %v", pos.Team, err)
				continue
			}

			// Buscar si ya existe un registro en team_races
			var teamRace models.TeamRace
			if err := database.DB.Where("teamconstructor_id = ? AND gp_index = ?", teamConstructor.ID, req.GPIndex).First(&teamRace).Error; err != nil {
				// No existe, crear nuevo registro
				teamRace = models.TeamRace{
					TeamConstructorID: teamConstructor.ID,
					GPIndex:           req.GPIndex,
					ExpectedPosition:  &pos.ExpectedPosition,
				}
				if err := database.DB.Create(&teamRace).Error; err != nil {
					log.Printf("[TEAM-EXPECTED-POSITIONS] Error creando registro para %s: %v", pos.Team, err)
					continue
				}
				createdCount++
				log.Printf("[TEAM-EXPECTED-POSITIONS] Creado registro para %s", pos.Team)
			} else {
				// Existe, actualizar
				teamRace.ExpectedPosition = &pos.ExpectedPosition
				if err := database.DB.Save(&teamRace).Error; err != nil {
					log.Printf("[TEAM-EXPECTED-POSITIONS] Error actualizando registro para %s: %v", pos.Team, err)
					continue
				}
				updatedCount++
				log.Printf("[TEAM-EXPECTED-POSITIONS] Actualizado registro para %s", pos.Team)
			}
		}

		c.JSON(200, gin.H{
			"message":       fmt.Sprintf("Procesados %d registros de posiciones esperadas de equipos (%d creados, %d actualizados)", createdCount+updatedCount, createdCount, updatedCount),
			"created_count": createdCount,
			"updated_count": updatedCount,
			"gp_index":      req.GPIndex,
		})
	})

	// Endpoint para obtener posiciones finales de equipos para un GP
	router.GET("/api/admin/team-finish-positions", func(c *gin.Context) {
		gpIndex := c.Query("gp_index")
		if gpIndex == "" {
			c.JSON(400, gin.H{"error": "Falta gp_index"})
			return
		}

		var teamConstructors []models.TeamConstructor
		database.DB.Where("gp_index = ?", gpIndex).Find(&teamConstructors)

		var positions []map[string]interface{}
		for _, tc := range teamConstructors {
			// Buscar si ya existe un registro en team_races
			var teamRace models.TeamRace
			database.DB.Where("teamconstructor_id = ? AND gp_index = ?", tc.ID, gpIndex).First(&teamRace)

			positions = append(positions, map[string]interface{}{
				"team":                 tc.Name,
				"finish_position":      teamRace.FinishPosition,
				"teamconstructor_id":   tc.ID,
				"teamconstructor_name": tc.Name,
			})
		}

		c.JSON(200, gin.H{"positions": positions})
	})

	// Endpoint para guardar posiciones finales de equipos
	router.POST("/api/admin/team-finish-positions", func(c *gin.Context) {
		var req struct {
			GPIndex   uint64 `json:"gp_index"`
			Positions []struct {
				Team           string  `json:"team"`
				FinishPosition float64 `json:"finish_position"`
			} `json:"positions"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("[TEAM-FINISH-POSITIONS] Error ShouldBindJSON: %v", err)
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[TEAM-FINISH-POSITIONS] Request recibido: gp_index=%d, positions=%+v", req.GPIndex, req.Positions)

		updatedCount := 0
		createdCount := 0
		for _, pos := range req.Positions {
			// Buscar el team constructor por nombre
			var teamConstructor models.TeamConstructor
			if err := database.DB.Where("name = ? AND gp_index = ?", pos.Team, req.GPIndex).First(&teamConstructor).Error; err != nil {
				log.Printf("[TEAM-FINISH-POSITIONS] Error encontrando team constructor %s: %v", pos.Team, err)
				continue
			}

			// Buscar el registro existente en team_races
			var teamRace models.TeamRace
			if err := database.DB.Where("teamconstructor_id = ? AND gp_index = ?", teamConstructor.ID, req.GPIndex).First(&teamRace).Error; err != nil {
				// No existe, crear nuevo registro con solo finish_position
				finishPos := int(pos.FinishPosition)
				teamRace = models.TeamRace{
					TeamConstructorID: teamConstructor.ID,
					GPIndex:           req.GPIndex,
					FinishPosition:    &finishPos,
					ExpectedPosition:  nil,                              // No hay expected_position
					DeltaPosition:     nil,                              // No se puede calcular sin expected
					Points:            getTeamPositionPoints(finishPos), // Solo puntos por posición
				}
				if err := database.DB.Create(&teamRace).Error; err != nil {
					log.Printf("[TEAM-FINISH-POSITIONS] Error creando registro para %s: %v", pos.Team, err)
					continue
				}
				createdCount++
				log.Printf("[TEAM-FINISH-POSITIONS] Creado registro para %s (sin expected_position)", pos.Team)
			} else {
				// Existe, actualizar
				finishPos := int(pos.FinishPosition)
				var deltaPosition int
				if teamRace.ExpectedPosition != nil {
					deltaPosition = int(*teamRace.ExpectedPosition) - finishPos
				} else {
					deltaPosition = 0
					log.Printf("[TEAM-FINISH-POSITIONS] ADVERTENCIA: No hay expected_position para %s", pos.Team)
				}

				// Calcular puntos de posición (1º=10, 2º=9, ..., 10º=1)
				positionPoints := getTeamPositionPoints(finishPos)

				// Calcular puntos totales (delta + position points)
				totalPoints := deltaPosition + positionPoints

				// Actualizar registro
				teamRace.FinishPosition = &finishPos
				teamRace.DeltaPosition = &deltaPosition
				teamRace.Points = totalPoints

				if err := database.DB.Save(&teamRace).Error; err != nil {
					log.Printf("[TEAM-FINISH-POSITIONS] Error guardando registro para %s: %v", pos.Team, err)
					continue
				}

				log.Printf("[TEAM-FINISH-POSITIONS] %s: Finish=%d, Expected=%.1f, Delta=%d, PositionPoints=%d, Total=%d",
					pos.Team, finishPos, *teamRace.ExpectedPosition, deltaPosition, positionPoints, totalPoints)
				updatedCount++
			}
		}

		c.JSON(200, gin.H{
			"message":       fmt.Sprintf("Procesados %d registros de posiciones finales de equipos (%d creados, %d actualizados)", createdCount+updatedCount, createdCount, updatedCount),
			"created_count": createdCount,
			"updated_count": updatedCount,
			"gp_index":      req.GPIndex,
		})
	})

	// Endpoint para resetear posiciones esperadas de equipos
	router.POST("/api/admin/reset-team-expected-positions", func(c *gin.Context) {
		var req struct {
			GPIndex uint64 `json:"gp_index"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[RESET-TEAM-EXPECTED-POSITIONS] Reseteando expected_position para GP %d", req.GPIndex)

		result := database.DB.Model(&models.TeamRace{}).
			Where("gp_index = ?", req.GPIndex).
			Update("expected_position", nil)

		if result.Error != nil {
			c.JSON(500, gin.H{"error": "Error reseteando posiciones esperadas"})
			return
		}

		c.JSON(200, gin.H{
			"message":     fmt.Sprintf("Reseteadas posiciones esperadas de %d equipos", result.RowsAffected),
			"reset_count": result.RowsAffected,
			"gp_index":    req.GPIndex,
		})
	})

	// Endpoint para resetear posiciones finales de equipos
	router.POST("/api/admin/reset-team-finish-positions", func(c *gin.Context) {
		var req struct {
			GPIndex uint64 `json:"gp_index"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[RESET-TEAM-FINISH-POSITIONS] Reseteando finish_position para GP %d", req.GPIndex)

		result := database.DB.Model(&models.TeamRace{}).
			Where("gp_index = ?", req.GPIndex).
			Updates(map[string]interface{}{
				"finish_position": nil,
				"delta_position":  nil,
				"points":          0,
			})

		if result.Error != nil {
			c.JSON(500, gin.H{"error": "Error reseteando posiciones finales"})
			return
		}

		c.JSON(200, gin.H{
			"message":     fmt.Sprintf("Reseteadas posiciones finales de %d equipos", result.RowsAffected),
			"reset_count": result.RowsAffected,
			"gp_index":    req.GPIndex,
		})
	})

	// Endpoint para obtener team constructors de un GP
	router.GET("/api/admin/team-constructors", func(c *gin.Context) {
		gpIndex := c.Query("gp_index")
		if gpIndex == "" {
			c.JSON(400, gin.H{"error": "Falta gp_index"})
			return
		}

		log.Printf("[TEAM-CONSTRUCTORS] Buscando equipos para GP %s", gpIndex)

		var teamConstructors []models.TeamConstructor
		database.DB.Where("gp_index = ?", gpIndex).Find(&teamConstructors)

		log.Printf("[TEAM-CONSTRUCTORS] Encontrados %d equipos para GP %s", len(teamConstructors), gpIndex)

		// Si no hay equipos para este GP, crear automáticamente basándose en el GP 1
		if len(teamConstructors) == 0 {
			log.Printf("[TEAM-CONSTRUCTORS] No hay equipos para GP %s, creando automáticamente...", gpIndex)

			// Obtener equipos del GP 1 como plantilla
			var templateTeamConstructors []models.TeamConstructor
			database.DB.Where("gp_index = ?", 1).Find(&templateTeamConstructors)

			if len(templateTeamConstructors) > 0 {
				// Crear equipos para el GP actual basándose en el GP 1
				for _, template := range templateTeamConstructors {
					gpIndexUint, _ := strconv.ParseUint(gpIndex, 10, 64)
					newTeamConstructor := models.TeamConstructor{
						Name:     template.Name,
						Value:    template.Value,
						GPIndex:  gpIndexUint,
						ImageURL: template.ImageURL,
					}

					if err := database.DB.Create(&newTeamConstructor).Error; err != nil {
						log.Printf("[TEAM-CONSTRUCTORS] Error creando equipo %s para GP %s: %v", template.Name, gpIndex, err)
					} else {
						log.Printf("[TEAM-CONSTRUCTORS] Creado equipo %s para GP %s", template.Name, gpIndex)
					}
				}

				// Volver a buscar los equipos recién creados
				database.DB.Where("gp_index = ?", gpIndex).Find(&teamConstructors)
				log.Printf("[TEAM-CONSTRUCTORS] Creados %d equipos para GP %s", len(teamConstructors), gpIndex)
			} else {
				log.Printf("[TEAM-CONSTRUCTORS] No hay plantilla de equipos en GP 1")
			}
		}

		var result []map[string]interface{}
		for _, tc := range teamConstructors {
			result = append(result, map[string]interface{}{
				"id":        tc.ID,
				"name":      tc.Name,
				"value":     tc.Value,
				"image_url": tc.ImageURL,
			})
		}

		c.JSON(200, gin.H{"team_constructors": result})
	})

	// Endpoint para obtener resultados de sesión de un equipo
	router.GET("/api/admin/team-session-result", func(c *gin.Context) {
		gpIndex := c.Query("gp_index")
		team := c.Query("team")

		if gpIndex == "" || team == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros gp_index o team"})
			return
		}

		// Buscar el team constructor por nombre
		var teamConstructor models.TeamConstructor
		if err := database.DB.Where("name = ? AND gp_index = ?", team, gpIndex).First(&teamConstructor).Error; err != nil {
			c.JSON(404, gin.H{"error": "Team constructor no encontrado"})
			return
		}

		// Buscar el registro en team_races
		var teamRace models.TeamRace
		if err := database.DB.Where("teamconstructor_id = ? AND gp_index = ?", teamConstructor.ID, gpIndex).First(&teamRace).Error; err != nil {
			c.JSON(200, gin.H{"result": nil})
			return
		}

		c.JSON(200, gin.H{"result": teamRace})
	})

	// Endpoint para guardar resultados de sesión de un equipo
	router.POST("/api/admin/team-session-result", func(c *gin.Context) {
		var req struct {
			GPIndex          uint64   `json:"gp_index"`
			Team             string   `json:"team"`
			ExpectedPosition float64  `json:"expected_position"`
			FinishPosition   int      `json:"finish_position"`
			DeltaPosition    int      `json:"delta_position"`
			PitstopTime      *float64 `json:"pitstop_time"`
			Points           int      `json:"points"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("[TEAM-SESSION-RESULT] Error ShouldBindJSON: %v", err)
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[TEAM-SESSION-RESULT] Request recibido: %+v", req)

		// Buscar el team constructor por nombre
		var teamConstructor models.TeamConstructor
		if err := database.DB.Where("name = ? AND gp_index = ?", req.Team, req.GPIndex).First(&teamConstructor).Error; err != nil {
			c.JSON(404, gin.H{"error": "Team constructor no encontrado"})
			return
		}

		// Buscar si ya existe un registro en team_races
		var teamRace models.TeamRace
		result := database.DB.Where("teamconstructor_id = ? AND gp_index = ?", teamConstructor.ID, req.GPIndex).First(&teamRace)

		if result.Error != nil {
			// Crear nuevo registro
			teamRace = models.TeamRace{
				TeamConstructorID: teamConstructor.ID,
				GPIndex:           req.GPIndex,
				ExpectedPosition:  &req.ExpectedPosition,
				FinishPosition:    &req.FinishPosition,
				DeltaPosition:     &req.DeltaPosition,
				PitstopTime:       req.PitstopTime,
				Points:            req.Points,
			}
			database.DB.Create(&teamRace)
		} else {
			// Actualizar registro existente
			teamRace.ExpectedPosition = &req.ExpectedPosition
			teamRace.FinishPosition = &req.FinishPosition
			teamRace.DeltaPosition = &req.DeltaPosition
			teamRace.PitstopTime = req.PitstopTime
			teamRace.Points = req.Points
			database.DB.Save(&teamRace)
		}

		c.JSON(200, gin.H{"message": "Resultados del equipo guardados"})
	})

	// Endpoint para guardar los resultados de sesión de un piloto en un GP y modo
	router.POST("/api/admin/session-result", func(c *gin.Context) {
		log.Printf("[SESSION-RESULT] Endpoint llamado - Method: %s, URL: %s", c.Request.Method, c.Request.URL.Path)

		var body map[string]interface{}
		if err := c.ShouldBindJSON(&body); err != nil {
			log.Printf("[SESSION-RESULT] Error ShouldBindJSON body: %v", err)
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		log.Printf("[SESSION-RESULT] Body recibido: %+v", body)

		// Extraer campos fijos
		gpIndex, ok1 := body["gp_index"].(float64)
		mode, ok2 := body["mode"].(string)
		pilotID, ok3 := body["pilot_id"].(float64)
		if !ok1 || !ok2 || !ok3 {
			log.Printf("[SESSION-RESULT] Faltan campos fijos en el body: gp_index=%v, mode=%v, pilot_id=%v", body["gp_index"], body["mode"], body["pilot_id"])
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		// Obtener el piloto para saber su modo
		var pilot models.Pilot
		if err := database.DB.First(&pilot, uint(pilotID)).Error; err != nil {
			c.JSON(404, gin.H{"error": "Piloto no encontrado"})
			return
		}

		// Extraer posición final y puntos delta con mejor manejo de tipos
		finishPosition := 0
		if fp, ok := body["finish_position"].(float64); ok {
			finishPosition = int(fp)
		} else if fp, ok := body["finish_position"].(int); ok {
			finishPosition = fp
		} else if fp, ok := body["finish_position"].(string); ok {
			if fp != "" && fp != "null" && fp != "0" {
				if fpInt, err := strconv.Atoi(fp); err == nil {
					finishPosition = fpInt
				}
			}
		}

		log.Printf("[SESSION-RESULT] finish_position extraído: %v (tipo: %T)", body["finish_position"], body["finish_position"])
		log.Printf("[SESSION-RESULT] finishPosition procesado: %d", finishPosition)

		// Los puntos se calculan automáticamente basados en expected_position y finish_position

		// Calcular el delta real sin multiplicadores: expected_position - actual_position
		expectedPosition := 0
		if ep, ok := body["expected_position"].(float64); ok {
			expectedPosition = int(ep)
		} else if ep, ok := body["expected_position"].(int); ok {
			expectedPosition = ep
		} else if ep, ok := body["expected_position"].(string); ok {
			if ep != "" && ep != "null" {
				if epInt, err := strconv.Atoi(ep); err == nil {
					expectedPosition = epInt
				}
			}
		}

		// Calcular delta real sin multiplicadores
		realDelta := expectedPosition - finishPosition
		log.Printf("[SESSION-RESULT] Delta real sin multiplicadores: %d (esperada: %d - final: %d)", realDelta, expectedPosition, finishPosition)

		// Calcular puntos por posición final
		positionPoints := getPositionPoints(pilot.Mode, finishPosition)

		// Calcular bonificaciones y penalizaciones
		bonusPoints := 0

		// Debug: mostrar todos los valores recibidos
		log.Printf("[SESSION-RESULT] Valores recibidos en body: %+v", body)

		// Posiciones ganadas/perdidas en salida - multiplicar por cantidad (permite negativos)
		positionsGainedAtStartVal := body["positions_gained_at_start"]
		log.Printf("[SESSION-RESULT] Procesando positions_gained_at_start: %v (tipo: %T)", positionsGainedAtStartVal, positionsGainedAtStartVal)

		if positionsGainedAtStart, ok := positionsGainedAtStartVal.(float64); ok && positionsGainedAtStart != 0 {
			bonusPoints += int(positionsGainedAtStart) * 3
			log.Printf("[SESSION-RESULT] Bonificación/penalización por posiciones en salida: %+d (valor: %v)", int(positionsGainedAtStart)*3, positionsGainedAtStart)
		} else if positionsGainedAtStart, ok := positionsGainedAtStartVal.(int); ok && positionsGainedAtStart != 0 {
			bonusPoints += positionsGainedAtStart * 3
			log.Printf("[SESSION-RESULT] Bonificación/penalización por posiciones en salida: %+d (valor: %v)", positionsGainedAtStart*3, positionsGainedAtStart)
		} else if positionsGainedAtStart, ok := positionsGainedAtStartVal.(string); ok && positionsGainedAtStart != "" && positionsGainedAtStart != "null" {
			if positionsGainedAtStartInt, err := strconv.Atoi(positionsGainedAtStart); err == nil && positionsGainedAtStartInt != 0 {
				bonusPoints += positionsGainedAtStartInt * 3
				log.Printf("[SESSION-RESULT] Bonificación/penalización por posiciones en salida: %+d (valor: %v)", positionsGainedAtStartInt*3, positionsGainedAtStartInt)
			}
		} else {
			log.Printf("[SESSION-RESULT] No se aplicó bonificación/penalización por posiciones en salida (valor: %v, tipo: %T)", positionsGainedAtStartVal, positionsGainedAtStartVal)
		}

		// Adelantamientos limpios (+2 cada uno)
		if cleanOvertakes, ok := body["clean_overtakes"].(float64); ok && cleanOvertakes > 0 {
			bonusPoints += int(cleanOvertakes) * 2
			log.Printf("[SESSION-RESULT] Bonificación por adelantamientos limpios: +%d (valor: %v)", int(cleanOvertakes)*2, cleanOvertakes)
		} else if cleanOvertakes, ok := body["clean_overtakes"].(int); ok && cleanOvertakes > 0 {
			bonusPoints += cleanOvertakes * 2
			log.Printf("[SESSION-RESULT] Bonificación por adelantamientos limpios: +%d (valor: %v)", cleanOvertakes*2, cleanOvertakes)
		}

		// Posiciones perdidas (-1 cada una)
		if netPositionsLost, ok := body["net_positions_lost"].(float64); ok && netPositionsLost > 0 {
			bonusPoints -= int(netPositionsLost)
			log.Printf("[SESSION-RESULT] Penalización por posiciones perdidas: -%d (valor: %v)", int(netPositionsLost), netPositionsLost)
		} else if netPositionsLost, ok := body["net_positions_lost"].(int); ok && netPositionsLost > 0 {
			bonusPoints -= netPositionsLost
			log.Printf("[SESSION-RESULT] Penalización por posiciones perdidas: -%d (valor: %v)", netPositionsLost, netPositionsLost)
		}

		// Vuelta rápida (+5 si termina P1-10)
		if fastestLap, ok := body["fastest_lap"].(bool); ok && fastestLap && finishPosition <= 10 {
			bonusPoints += 5
			log.Printf("[SESSION-RESULT] Bonificación por vuelta rápida: +5")
		}

		// Causar VSC (-5)
		if causedVsc, ok := body["caused_vsc"].(bool); ok && causedVsc {
			bonusPoints -= 5
			log.Printf("[SESSION-RESULT] Penalización por causar VSC: -5")
		}

		// Causar SC (-8)
		if causedSc, ok := body["caused_sc"].(bool); ok && causedSc {
			bonusPoints -= 8
			log.Printf("[SESSION-RESULT] Penalización por causar SC: -8")
		}

		// Causar bandera roja (-12)
		if causedRedFlag, ok := body["caused_red_flag"].(bool); ok && causedRedFlag {
			bonusPoints -= 12
			log.Printf("[SESSION-RESULT] Penalización por causar bandera roja: -12")
		}

		// DNF por error del piloto (-10)
		if dnfDriverError, ok := body["dnf_driver_error"].(bool); ok && dnfDriverError {
			bonusPoints -= 10
			log.Printf("[SESSION-RESULT] Penalización por DNF error piloto: -10")
		}

		// DNF sin culpa (-3)
		if dnfNoFault, ok := body["dnf_no_fault"].(bool); ok && dnfNoFault {
			bonusPoints -= 3
			log.Printf("[SESSION-RESULT] Penalización por DNF sin culpa: -3")
		}

		// Total: delta + puntos por posición + bonificaciones
		totalPoints := realDelta + positionPoints + bonusPoints

		log.Printf("[SESSION-RESULT] Piloto %s (Mode: %s, Pos: %d): Delta=%d + Position=%d + Bonus=%d = Total=%d",
			pilot.DriverName, pilot.Mode, finishPosition, realDelta, positionPoints, bonusPoints, totalPoints)
		log.Printf("[SESSION-RESULT] Valores extraídos - finishPosition: %v, expectedPosition: %v, realDelta: %v, positionPoints: %v, bonusPoints: %v",
			finishPosition, expectedPosition, realDelta, positionPoints, bonusPoints)
		log.Printf("[SESSION-RESULT] CÁLCULO DETALLADO: %d + %d + %d = %d", realDelta, positionPoints, bonusPoints, totalPoints)

		// Actualizar el campo points con el total calculado
		body["points"] = totalPoints

		// También actualizar delta_position para consistencia
		body["delta_position"] = realDelta

		var table string
		switch mode {
		case "race":
			table = "pilot_races"
		case "qualy":
			table = "pilot_qualies"
		case "practice":
			table = "pilot_practices"
		default:
			log.Printf("[SESSION-RESULT] Modo inválido: %v", mode)
			c.JSON(400, gin.H{"error": "Modo inválido"})
			return
		}

		// Quitar gp_index, mode, pilot_id
		delete(body, "gp_index")
		delete(body, "mode")
		delete(body, "pilot_id")

		// Filtrar campos según la tabla para evitar errores de columnas inexistentes
		filteredBody := make(map[string]interface{})

		switch mode {
		case "race":
			// PilotRace tiene todas las columnas
			allowedFields := map[string]bool{
				"start_position": true, "finish_position": true, "expected_position": true,
				"delta_position": true, "points": true, "positions_gained_at_start": true,
				"clean_overtakes": true, "net_positions_lost": true, "fastest_lap": true,
				"caused_vsc": true, "caused_sc": true, "caused_red_flag": true,
				"dnf_driver_error": true, "dnf_no_fault": true,
			}
			for k, v := range body {
				if allowedFields[k] {
					if v == nil || v == "" || v == "null" {
						// Para campos booleanos, usar false
						if k == "caused_red_flag" || k == "fastest_lap" || k == "caused_vsc" || k == "caused_sc" || k == "dnf_driver_error" || k == "dnf_no_fault" {
							filteredBody[k] = false
						} else {
							filteredBody[k] = 0
						}
					} else {
						filteredBody[k] = v
					}
				}
			}
		case "qualy":
			// PilotQualy tiene columnas limitadas
			allowedFields := map[string]bool{
				"start_position": true, "finish_position": true, "expected_position": true,
				"delta_position": true, "points": true, "caused_red_flag": true,
			}
			for k, v := range body {
				if allowedFields[k] {
					if v == nil || v == "" || v == "null" {
						// Para campos booleanos, usar false
						if k == "caused_red_flag" {
							filteredBody[k] = false
						} else {
							filteredBody[k] = 0
						}
					} else {
						filteredBody[k] = v
					}
				}
			}
		case "practice":
			// PilotPractice tiene columnas limitadas
			allowedFields := map[string]bool{
				"start_position": true, "finish_position": true, "expected_position": true,
				"delta_position": true, "points": true, "caused_red_flag": true,
			}
			for k, v := range body {
				if allowedFields[k] {
					if v == nil || v == "" || v == "null" {
						// Para campos booleanos, usar false
						if k == "caused_red_flag" {
							filteredBody[k] = false
						} else {
							filteredBody[k] = 0
						}
					} else {
						filteredBody[k] = v
					}
				}
			}
		}

		body = filteredBody

		log.Printf("[SESSION-RESULT] Body para guardar: %+v", body)

		// Buscar si ya existe
		var count int64
		database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", uint(pilotID), uint64(gpIndex)).Count(&count)
		if count > 0 {
			log.Printf("[SESSION-RESULT] Actualizando fila existente para pilot_id=%v, gp_index=%v", uint(pilotID), uint64(gpIndex))
			database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", uint(pilotID), uint64(gpIndex)).Updates(body)
		} else {
			log.Printf("[SESSION-RESULT] Creando nueva fila para pilot_id=%v, gp_index=%v", uint(pilotID), uint64(gpIndex))
			body["pilot_id"] = uint(pilotID)
			body["gp_index"] = uint64(gpIndex)
			database.DB.Table(table).Create(body)
		}

		// Actualizar puntos de todos los jugadores que tengan este piloto alineado
		go updatePlayerPointsForPilot(uint(pilotID), uint64(gpIndex), totalPoints, mode)

		// Calcular automáticamente puntos de track engineers para este piloto
		go func() {
			log.Printf("[AUTO-TRACK-ENG] Calculando puntos automáticamente para piloto %d, GP %d, mode %s", uint(pilotID), uint64(gpIndex), mode)
			calculateTrackEngineerPointsForPilot(uint(pilotID), uint64(gpIndex), mode)
		}()

		c.JSON(200, gin.H{
			"message": "Resultado guardado y puntos de jugadores actualizados",
			"points_breakdown": gin.H{
				"delta_points":    realDelta,
				"position_points": positionPoints,
				"bonus_points":    bonusPoints,
				"total_points":    totalPoints,
				"position":        finishPosition,
				"mode":            pilot.Mode,
				"pilot_name":      pilot.DriverName,
			},
		})
	})

	// Endpoint para obtener todos los track engineers de una liga
	router.GET("/api/trackengineersbyleague/list", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		var trackEngineersByLeague []models.TrackEngineerByLeague
		if err := database.DB.Where("league_id = ?", leagueID).Find(&trackEngineersByLeague).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo track engineers"})
			return
		}
		var result []map[string]interface{}
		for _, teb := range trackEngineersByLeague {
			var trackEngineer models.TrackEngineer
			database.DB.First(&trackEngineer, teb.TrackEngineerID)
			item := map[string]interface{}{
				"id":                  trackEngineer.ID,
				"by_league_id":        teb.ID,
				"name":                trackEngineer.Name,
				"team":                trackEngineer.Team,
				"image_url":           trackEngineer.ImageURL,
				"value":               trackEngineer.Value,
				"total_points":        trackEngineer.TotalPoints,
				"clausula_expires_at": teb.Clausulatime,
				"clausula_value":      teb.ClausulaValue,
				"owner_id":            teb.OwnerID,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"track_engineers": result})
	})

	// Endpoint para perfil de track engineer by league
	router.GET("/api/trackengineersbyleague", func(c *gin.Context) {
		id := c.Query("id")
		_ = c.Query("league_id") // Para futuras validaciones
		log.Printf("[TRACK-ENG-PROFILE] id=%s", id)
		if id == "" {
			c.JSON(400, gin.H{"error": "Falta parámetro id"})
			return
		}

		// Convertir ID a uint
		idUint, err := strconv.ParseUint(id, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{"error": "ID inválido"})
			return
		}

		// Buscar por ID del registro TrackEngineerByLeague con preload completo
		var teb models.TrackEngineerByLeague
		if err := database.DB.Preload("TrackEngineer.GrandPrix").First(&teb, idUint).Error; err != nil {
			log.Printf("[TRACK-ENG-PROFILE] No se encontró TrackEngineerByLeague id=%d", idUint)
			c.JSON(404, gin.H{"error": "TrackEngineerByLeague no encontrado"})
			return
		}
		log.Printf("[TRACK-ENG-PROFILE] teb: %+v", teb)

		// Buscar pilotos asignados a este track engineer
		var pilots []models.Pilot
		database.DB.Where("track_engineer_id = ?", teb.TrackEngineerID).Find(&pilots)
		log.Printf("[TRACK-ENG-PROFILE] pilots: %+v", pilots)

		// Crear respuesta limpia sin duplicación
		response := gin.H{
			"track_engineer": gin.H{
				"id":           teb.TrackEngineer.ID,
				"name":         teb.TrackEngineer.Name,
				"value":        teb.TrackEngineer.Value,
				"image_url":    teb.TrackEngineer.ImageURL,
				"team":         teb.TrackEngineer.Team,
				"gp_index":     teb.TrackEngineer.GPIndex,
				"performance":  teb.TrackEngineer.Performance,
				"total_points": teb.TrackEngineer.TotalPoints,
			},
			"engineer": gin.H{
				"id":                      teb.ID,
				"track_engineer_id":       teb.TrackEngineerID,
				"league_id":               teb.LeagueID,
				"owner_id":                teb.OwnerID,
				"bids":                    teb.Bids,
				"venta":                   teb.Venta,
				"venta_expires_at":        teb.VentaExpiresAt,
				"league_offer_value":      teb.LeagueOfferValue,
				"league_offer_expires_at": teb.LeagueOfferExpiresAt,
				"clausula_time":           teb.Clausulatime,
				"clausula_value":          teb.ClausulaValue,
				"created_at":              teb.CreatedAt,
				"updated_at":              teb.UpdatedAt,
			},
			"pilots": pilots,
		}
		log.Printf("[TRACK-ENG-PROFILE] RESPUESTA FINAL: %+v", response)
		c.JSON(200, response)
	})

	// Endpoint para obtener todos los chief engineers de una liga
	router.GET("/api/chiefengineersbyleague/list", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		var chiefEngineersByLeague []models.ChiefEngineerByLeague
		if err := database.DB.Where("league_id = ?", leagueID).Find(&chiefEngineersByLeague).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo chief engineers"})
			return
		}
		var result []map[string]interface{}
		for _, ceb := range chiefEngineersByLeague {
			var chiefEngineer models.ChiefEngineer
			database.DB.First(&chiefEngineer, ceb.ChiefEngineerID)
			item := map[string]interface{}{
				"id":                  chiefEngineer.ID,
				"by_league_id":        ceb.ID,
				"name":                chiefEngineer.Name,
				"team":                chiefEngineer.Team,
				"image_url":           chiefEngineer.ImageURL,
				"value":               chiefEngineer.Value,
				"total_points":        chiefEngineer.TotalPoints,
				"clausula_expires_at": ceb.Clausulatime,
				"clausula_value":      ceb.ClausulaValue,
				"owner_id":            ceb.OwnerID,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"chief_engineers": result})
	})

	// Endpoint para perfil de chief engineer by league
	router.GET("/api/chiefengineersbyleague", func(c *gin.Context) {
		id := c.Query("id")
		_ = c.Query("league_id") // Para futuras validaciones
		if id == "" {
			c.JSON(400, gin.H{"error": "Falta parámetro id"})
			return
		}

		// Convertir ID a uint
		idUint, err := strconv.ParseUint(id, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{"error": "ID inválido"})
			return
		}

		// Buscar por ID del registro ChiefEngineerByLeague con preload completo
		var ceb models.ChiefEngineerByLeague
		if err := database.DB.Preload("ChiefEngineer.GrandPrix").First(&ceb, idUint).Error; err != nil {
			log.Printf("[CHIEF-ENGINEER-PROFILE] Error buscando ChiefEngineerByLeague ID %d: %v", idUint, err)
			c.JSON(404, gin.H{"error": "ChiefEngineerByLeague no encontrado"})
			return
		}

		// Verificar que el chief engineer existe
		if ceb.ChiefEngineer.ID == 0 {
			log.Printf("[CHIEF-ENGINEER-PROFILE] ChiefEngineer no encontrado para ID %d", ceb.ChiefEngineerID)
			c.JSON(404, gin.H{"error": "ChiefEngineer no encontrado"})
			return
		}

		// Buscar pilotos asignados a este chief engineer
		var pilots []models.Pilot
		database.DB.Where("chief_engineer_id = ?", ceb.ChiefEngineerID).Find(&pilots)

		// Crear respuesta limpia sin duplicación
		response := gin.H{
			"chief_engineer": gin.H{
				"id":                     ceb.ChiefEngineer.ID,
				"name":                   ceb.ChiefEngineer.Name,
				"value":                  ceb.ChiefEngineer.Value,
				"image_url":              ceb.ChiefEngineer.ImageURL,
				"team":                   ceb.ChiefEngineer.Team,
				"gp_index":               ceb.ChiefEngineer.GPIndex,
				"team_expected_position": ceb.ChiefEngineer.TeamExpectedPosition,
				"team_finish_position":   ceb.ChiefEngineer.TeamFinishPosition,
				"total_points":           ceb.ChiefEngineer.TotalPoints,
				"points_by_gp":           ceb.ChiefEngineer.PointsByGP,
			},
			"engineer": gin.H{
				"id":                      ceb.ID,
				"chief_engineer_id":       ceb.ChiefEngineerID,
				"league_id":               ceb.LeagueID,
				"owner_id":                ceb.OwnerID,
				"bids":                    ceb.Bids,
				"venta":                   ceb.Venta,
				"venta_expires_at":        ceb.VentaExpiresAt,
				"league_offer_value":      ceb.LeagueOfferValue,
				"league_offer_expires_at": ceb.LeagueOfferExpiresAt,
				"clausula_time":           ceb.Clausulatime,
				"clausula_value":          ceb.ClausulaValue,
				"created_at":              ceb.CreatedAt,
				"updated_at":              ceb.UpdatedAt,
			},
			"pilots": pilots,
		}

		log.Printf("[CHIEF-ENGINEER-PROFILE] Respuesta exitosa para ID %d: %+v", idUint, response)
		c.JSON(200, response)
	})

	// Endpoint para obtener todos los team constructors de una liga
	router.GET("/api/teamconstructorsbyleague/list", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		var teamConstructorsByLeague []models.TeamConstructorByLeague
		if err := database.DB.Where("league_id = ?", leagueID).Find(&teamConstructorsByLeague).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo team constructors"})
			return
		}
		var result []map[string]interface{}
		for _, tcb := range teamConstructorsByLeague {
			var teamConstructor models.TeamConstructor
			database.DB.First(&teamConstructor, tcb.TeamConstructorID)
			item := map[string]interface{}{
				"id":                  teamConstructor.ID,
				"by_league_id":        tcb.ID,
				"name":                teamConstructor.Name,
				"image_url":           teamConstructor.ImageURL,
				"value":               teamConstructor.Value,
				"clausula_expires_at": tcb.Clausulatime,
				"clausula_value":      tcb.ClausulaValue,
				"owner_id":            tcb.OwnerID,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"team_constructors": result})
	})

	// Endpoint para perfil de team constructor by league
	router.GET("/api/teamconstructorsbyleague", func(c *gin.Context) {
		id := c.Query("id")
		_ = c.Query("league_id") // Para futuras validaciones
		if id == "" {
			c.JSON(400, gin.H{"error": "Falta parámetro id"})
			return
		}

		// Convertir ID a uint
		idUint, err := strconv.ParseUint(id, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{"error": "ID inválido"})
			return
		}

		// Buscar por ID del registro TeamConstructorByLeague con preload completo
		var tcb models.TeamConstructorByLeague
		if err := database.DB.Preload("TeamConstructor.GrandPrix").First(&tcb, idUint).Error; err != nil {
			c.JSON(404, gin.H{"error": "TeamConstructorByLeague no encontrado"})
			return
		}

		// Buscar pilotos asignados a este team constructor
		var pilots []models.Pilot
		database.DB.Where("team = ?", tcb.TeamConstructor.Name).Find(&pilots)

		// Crear respuesta limpia sin duplicación
		response := gin.H{
			"team_constructor": gin.H{
				"id":            tcb.TeamConstructor.ID,
				"name":          tcb.TeamConstructor.Name,
				"value":         tcb.TeamConstructor.Value,
				"image_url":     tcb.TeamConstructor.ImageURL,
				"team":          tcb.TeamConstructor.Name,
				"gp_index":      tcb.TeamConstructor.GPIndex,
				"finish_pilots": tcb.TeamConstructor.FinishPilots,
			},
			"team": gin.H{
				"id":                      tcb.ID,
				"team_constructor_id":     tcb.TeamConstructorID,
				"league_id":               tcb.LeagueID,
				"owner_id":                tcb.OwnerID,
				"bids":                    tcb.Bids,
				"venta":                   tcb.Venta,
				"venta_expires_at":        tcb.VentaExpiresAt,
				"league_offer_value":      tcb.LeagueOfferValue,
				"league_offer_expires_at": tcb.LeagueOfferExpiresAt,
				"clausula_time":           tcb.Clausulatime,
				"clausula_value":          tcb.ClausulaValue,
				"created_at":              tcb.CreatedAt,
				"updated_at":              tcb.UpdatedAt,
			},
			"pilots": pilots,
		}

		c.JSON(200, response)
	})

	// Endpoint para obtener puntos de team constructors por GP (para la pestaña de puntos)
	router.GET("/api/team-constructor-gp-points", func(c *gin.Context) {
		teamConstructorID := c.Query("team_constructor_id")
		gpIndex := c.Query("gp_index")

		if teamConstructorID == "" || gpIndex == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros team_constructor_id o gp_index"})
			return
		}

		// Obtener el team constructor by league
		var teamConstructorByLeague models.TeamConstructorByLeague
		if err := database.DB.First(&teamConstructorByLeague, teamConstructorID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Team constructor no encontrado"})
			return
		}

		// Obtener el team constructor para conocer su nombre
		var teamConstructor models.TeamConstructor
		if err := database.DB.First(&teamConstructor, teamConstructorByLeague.TeamConstructorID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Team constructor details no encontrado"})
			return
		}

		// Buscar el team constructor correspondiente al GP específico
		var teamConstructorForGP models.TeamConstructor
		if err := database.DB.Where("name = ? AND gp_index = ?", teamConstructor.Name, gpIndex).First(&teamConstructorForGP).Error; err != nil {
			c.JSON(404, gin.H{"error": "Team constructor no encontrado para el GP específico"})
			return
		}

		// Obtener puntos de la tabla team_races basándose en el team constructor
		var result map[string]interface{}
		points := 0
		if err := database.DB.Table("team_races").Where("teamconstructor_id = ? AND gp_index = ?", teamConstructorForGP.ID, gpIndex).Take(&result).Error; err == nil {
			if pointsRaw := result["points"]; pointsRaw != nil {
				if pointsVal, ok := pointsRaw.(float64); ok {
					points = int(pointsVal)
				} else if pointsVal, ok := pointsRaw.(int); ok {
					points = pointsVal
				} else if pointsVal, ok := pointsRaw.(int64); ok {
					points = int(pointsVal)
				}
			}
		}

		// Obtener información adicional del GP
		var grandPrix models.GrandPrix
		database.DB.Where("gp_index = ?", gpIndex).First(&grandPrix)

		// Obtener criterios de puntuación de team_races
		var teamRaceResult map[string]interface{}
		expectedPosition := 0.0
		finishPosition := 0.0
		deltaPosition := 0.0

		if err := database.DB.Table("team_races").Where("teamconstructor_id = ? AND gp_index = ?", teamConstructorForGP.ID, gpIndex).Take(&teamRaceResult).Error; err == nil {
			// Obtener posición esperada
			if expPos, ok := teamRaceResult["expected_position"].(float64); ok {
				expectedPosition = expPos
			}

			// Obtener posición final
			if finPos, ok := teamRaceResult["finish_position"].(float64); ok {
				finishPosition = finPos
			}

			// Calcular delta
			deltaPosition = expectedPosition - finishPosition
		}

		c.JSON(200, gin.H{
			"points":                points,
			"gp_name":               grandPrix.Name,
			"gp_index":              gpIndex,
			"team_constructor_name": teamConstructor.Name,
			"team":                  teamConstructor.Name,
			"scoring_criteria": gin.H{
				"expected_position": expectedPosition,
				"finish_position":   finishPosition,
				"delta_position":    deltaPosition,
				"total_points":      points,
			},
		})
	})

	// Endpoint para obtener los puntos de una alineación específica
	router.GET("/api/lineup/points", authMiddleware(), func(c *gin.Context) {
		playerID := c.Query("player_id")
		leagueID := c.Query("league_id")
		gpIndex := c.Query("gp_index")

		if playerID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros player_id o league_id"})
			return
		}

		playerIDUint, err := strconv.ParseUint(playerID, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{"error": "player_id inválido"})
			return
		}

		leagueIDUint, err := strconv.ParseUint(leagueID, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{"error": "league_id inválido"})
			return
		}

		// Si no se proporciona gp_index, buscar el último GP con start_date más reciente
		var targetGPIndex uint64
		if gpIndex == "" {
			// Buscar el GP más reciente que haya comenzado
			now := time.Now()
			var latestGP models.GrandPrix
			if err := database.DB.Where("start_date <= ?", now).Order("start_date DESC").First(&latestGP).Error; err != nil {
				c.JSON(404, gin.H{"error": "No se encontró ningún GP"})
				return
			}
			targetGPIndex = latestGP.GPIndex
		} else {
			gpIndexUint, err := strconv.ParseUint(gpIndex, 10, 64)
			if err != nil {
				c.JSON(400, gin.H{"error": "gp_index inválido"})
				return
			}
			targetGPIndex = gpIndexUint
		}

		var lineup models.Lineup
		if err := database.DB.Where("player_id = ? AND league_id = ? AND gp_index = ?", playerIDUint, leagueIDUint, targetGPIndex).First(&lineup).Error; err != nil {
			// Si no hay alineación, devolver 0 puntos pero con información del GP
			var gp models.GrandPrix
			if err := database.DB.Where("gp_index = ?", targetGPIndex).First(&gp).Error; err != nil {
				c.JSON(404, gin.H{"error": "GP no encontrado"})
				return
			}

			c.JSON(200, gin.H{
				"lineup_points": 0,
				"gp_index":      targetGPIndex,
				"gp_name":       gp.Name,
				"gp_country":    gp.Country,
				"gp_date":       gp.StartDate,
				"gp_flag":       gp.Flag,
				"has_lineup":    false,
			})
			return
		}

		// Obtener información del GP
		var gp models.GrandPrix
		if err := database.DB.Where("gp_index = ?", targetGPIndex).First(&gp).Error; err != nil {
			c.JSON(404, gin.H{"error": "GP no encontrado"})
			return
		}

		// Calcular puntos dinámicamente usando la nueva lógica
		totalPoints := calculatePlayerTotalPoints(uint(playerIDUint), leagueIDUint, targetGPIndex)

		c.JSON(200, gin.H{
			"lineup_points": totalPoints,
			"gp_index":      targetGPIndex,
			"gp_name":       gp.Name,
			"gp_country":    gp.Country,
			"gp_date":       gp.StartDate,
			"gp_flag":       gp.Flag,
			"has_lineup":    true,
		})
	})

	// Endpoint para obtener todos los GPs que ya han empezado
	router.GET("/api/gp/started", authMiddleware(), func(c *gin.Context) {
		now := time.Now()
		var gps []models.GrandPrix

		if err := database.DB.Where("start_date <= ?", now).Order("start_date DESC").Find(&gps).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error al obtener GPs"})
			return
		}

		c.JSON(200, gin.H{
			"gps": gps,
		})
	})

	// Endpoints para alineaciones (lineups)
	router.GET("/api/lineup/current", authMiddleware(), func(c *gin.Context) {
		userID := c.GetUint("user_id")
		leagueIDStr := c.Query("league_id")

		if leagueIDStr == "" {
			c.JSON(400, gin.H{"error": "league_id is required"})
			return
		}

		leagueID, err := strconv.ParseUint(leagueIDStr, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid league_id"})
			return
		}

		// LÓGICA MEJORADA: Obtener el GP correcto para mostrar alineación
		now := time.Now()
		var currentGP models.GrandPrix

		// Buscar el próximo GP que NO haya comenzado aún (para alineaciones activas)
		if err := database.DB.Where("start_date > ?", now).Order("start_date ASC").First(&currentGP).Error; err != nil {
			// Si no hay próximos GPs, buscar el último GP que haya comenzado
			if err := database.DB.Where("start_date <= ?", now).Order("start_date DESC").First(&currentGP).Error; err != nil {
				c.JSON(404, gin.H{"error": "No Grand Prix found"})
				return
			}
		}

		// Buscar alineación existente
		var lineup models.Lineup
		if err := database.DB.Where("player_id = ? AND league_id = ? AND gp_index = ?", userID, leagueID, currentGP.GPIndex).First(&lineup).Error; err != nil {
			// Si no existe, devolver alineación vacía
			c.JSON(200, gin.H{
				"lineup": gin.H{
					"race_pilots":         []uint{},
					"qualifying_pilots":   []uint{},
					"practice_pilots":     []uint{},
					"team_constructor_id": nil,
					"chief_engineer_id":   nil,
					"track_engineers":     []uint{},
				},
				"gp_index": currentGP.GPIndex,
				"gp_name":  currentGP.Name,
			})
			return
		}

		// Parsear los arrays de IDs
		var racePilots, qualifyingPilots, practicePilots, trackEngineers []uint

		if len(lineup.RacePilots) > 0 {
			json.Unmarshal(lineup.RacePilots, &racePilots)
		}
		if len(lineup.QualifyingPilots) > 0 {
			json.Unmarshal(lineup.QualifyingPilots, &qualifyingPilots)
		}
		if len(lineup.PracticePilots) > 0 {
			json.Unmarshal(lineup.PracticePilots, &practicePilots)
		}
		if len(lineup.TrackEngineers) > 0 {
			json.Unmarshal(lineup.TrackEngineers, &trackEngineers)
		}

		c.JSON(200, gin.H{
			"lineup": gin.H{
				"race_pilots":         racePilots,
				"qualifying_pilots":   qualifyingPilots,
				"practice_pilots":     practicePilots,
				"team_constructor_id": lineup.TeamConstructorID,
				"chief_engineer_id":   lineup.ChiefEngineerID,
				"track_engineers":     trackEngineers,
			},
			"gp_index":      currentGP.GPIndex,
			"gp_name":       currentGP.Name,
			"gp_start_date": currentGP.StartDate,
			"is_gp_started": currentGP.StartDate.Before(time.Now()) || currentGP.StartDate.Equal(time.Now()),
		})
	})

	// Endpoint para obtener información detallada del GP actual y próximo
	router.GET("/api/gp/status", authMiddleware(), func(c *gin.Context) {
		now := time.Now()

		// Buscar el GP actual (el que ha comenzado más recientemente)
		var currentGP models.GrandPrix
		if err := database.DB.Where("start_date <= ?", now).Order("start_date DESC").First(&currentGP).Error; err != nil {
			c.JSON(404, gin.H{"error": "No Grand Prix found"})
			return
		}

		// Buscar el próximo GP
		var nextGP models.GrandPrix
		if err := database.DB.Where("start_date > ?", now).Order("start_date ASC").First(&nextGP).Error; err != nil {
			// No hay próximos GPs
			c.JSON(200, gin.H{
				"current_gp": gin.H{
					"gp_index":   currentGP.GPIndex,
					"name":       currentGP.Name,
					"start_date": currentGP.StartDate,
					"is_started": true,
				},
				"next_gp":         nil,
				"can_save_lineup": false,
				"message":         "No hay próximos GPs disponibles para alineaciones",
			})
			return
		}

		c.JSON(200, gin.H{
			"current_gp": gin.H{
				"gp_index":   currentGP.GPIndex,
				"name":       currentGP.Name,
				"start_date": currentGP.StartDate,
				"is_started": true,
			},
			"next_gp": gin.H{
				"gp_index":   nextGP.GPIndex,
				"name":       nextGP.Name,
				"start_date": nextGP.StartDate,
				"is_started": false,
			},
			"can_save_lineup": true,
			"target_gp": gin.H{
				"gp_index":   nextGP.GPIndex,
				"name":       nextGP.Name,
				"start_date": nextGP.StartDate,
			},
		})
	})

	// Endpoint para obtener alineaciones guardadas de GPs pasados
	router.GET("/api/lineup/history", authMiddleware(), func(c *gin.Context) {
		userID := c.GetUint("user_id")
		leagueIDStr := c.Query("league_id")

		if leagueIDStr == "" {
			c.JSON(400, gin.H{"error": "league_id is required"})
			return
		}

		leagueID, err := strconv.ParseUint(leagueIDStr, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid league_id"})
			return
		}

		// Obtener todos los GPs que ya han comenzado
		now := time.Now()
		var pastGPs []models.GrandPrix
		if err := database.DB.Where("start_date <= ?", now).Order("start_date ASC").Find(&pastGPs).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error fetching past GPs"})
			return
		}

		// Para cada GP pasado, obtener la alineación guardada
		var history []gin.H
		for _, gp := range pastGPs {
			var lineup models.Lineup
			if err := database.DB.Where("player_id = ? AND league_id = ? AND gp_index = ?", userID, leagueID, gp.GPIndex).First(&lineup).Error; err != nil {
				// No hay alineación guardada para este GP
				continue
			}

			// Parsear los arrays de IDs
			var racePilots, qualifyingPilots, practicePilots, trackEngineers []uint
			if len(lineup.RacePilots) > 0 {
				json.Unmarshal(lineup.RacePilots, &racePilots)
			}
			if len(lineup.QualifyingPilots) > 0 {
				json.Unmarshal(lineup.QualifyingPilots, &qualifyingPilots)
			}
			if len(lineup.PracticePilots) > 0 {
				json.Unmarshal(lineup.PracticePilots, &practicePilots)
			}
			if len(lineup.TrackEngineers) > 0 {
				json.Unmarshal(lineup.TrackEngineers, &trackEngineers)
			}

			history = append(history, gin.H{
				"gp_index":            gp.GPIndex,
				"gp_name":             gp.Name,
				"gp_start_date":       gp.StartDate,
				"gp_date":             gp.Date,
				"gp_country":          gp.Country,
				"gp_flag":             gp.Flag,
				"lineup_points":       lineup.LineupPoints,
				"race_pilots":         racePilots,
				"qualifying_pilots":   qualifyingPilots,
				"practice_pilots":     practicePilots,
				"team_constructor_id": lineup.TeamConstructorID,
				"chief_engineer_id":   lineup.ChiefEngineerID,
				"track_engineers":     trackEngineers,
			})
		}

		c.JSON(200, gin.H{
			"history": history,
		})
	})

	// Endpoint para obtener puntos de un elemento específico en un GP
	router.GET("/api/lineup/element-points", authMiddleware(), func(c *gin.Context) {
		gpIndexStr := c.Query("gp_index")
		elementType := c.Query("element_type") // "pilot", "team_constructor", "chief_engineer", "track_engineer"
		elementIDStr := c.Query("element_id")
		playerIDStr := c.Query("player_id") // Requerido para track engineers
		leagueIDStr := c.Query("league_id") // Requerido para track engineers

		if gpIndexStr == "" || elementType == "" || elementIDStr == "" {
			c.JSON(400, gin.H{"error": "gp_index, element_type, and element_id are required"})
			return
		}

		gpIndex, err := strconv.ParseUint(gpIndexStr, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid gp_index"})
			return
		}

		elementID, err := strconv.ParseUint(elementIDStr, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid element_id"})
			return
		}

		// Para track engineers necesitamos información del jugador
		if elementType == "track_engineer" {
			if playerIDStr == "" || leagueIDStr == "" {
				c.JSON(400, gin.H{"error": "player_id and league_id are required for track_engineer"})
				return
			}

			playerID, err := strconv.ParseUint(playerIDStr, 10, 64)
			if err != nil {
				c.JSON(400, gin.H{"error": "Invalid player_id"})
				return
			}

			leagueID, err := strconv.ParseUint(leagueIDStr, 10, 64)
			if err != nil {
				c.JSON(400, gin.H{"error": "Invalid league_id"})
				return
			}

			// Obtener la alineación del jugador para este GP
			var lineup models.Lineup
			if err := database.DB.Where("player_id = ? AND league_id = ? AND gp_index = ?", playerID, leagueID, gpIndex).First(&lineup).Error; err != nil {
				c.JSON(200, gin.H{
					"gp_index":     gpIndex,
					"element_type": elementType,
					"element_id":   elementID,
					"points":       0,
					"sessions":     map[string]int{},
					"message":      "No lineup found for this GP",
				})
				return
			}

			// Usar la nueva función que verifica si tiene el piloto asociado
			totalPoints := getTrackEngineerPointsWithLineup(uint(elementID), gpIndex, lineup)

			// También obtener puntos desglosados por sesión
			var trackEngineerByLeague models.TrackEngineerByLeague
			if err := database.DB.First(&trackEngineerByLeague, elementID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Track engineer not found"})
				return
			}

			// Obtener el track engineer para saber qué piloto está asociado
			var trackEngineer models.TrackEngineer
			if err := database.DB.First(&trackEngineer, trackEngineerByLeague.TrackEngineerID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Track engineer details not found"})
				return
			}

			// Buscar qué piloto tiene este track engineer asignado
			var associatedPilots []models.Pilot
			database.DB.Where("track_engineer_id = ?", trackEngineer.ID).Find(&associatedPilots)

			sessions := map[string]int{
				"race":     0,
				"qualy":    0,
				"practice": 0,
			}

			if len(associatedPilots) > 0 {
				// Obtener los pilotos que tiene el jugador en su lineup
				var racePilots []uint
				var qualifyingPilots []uint
				var practicePilots []uint

				if len(lineup.RacePilots) > 0 {
					json.Unmarshal(lineup.RacePilots, &racePilots)
				}
				if len(lineup.QualifyingPilots) > 0 {
					json.Unmarshal(lineup.QualifyingPilots, &qualifyingPilots)
				}
				if len(lineup.PracticePilots) > 0 {
					json.Unmarshal(lineup.PracticePilots, &practicePilots)
				}

				// Obtener los PilotByLeague IDs para cada piloto asociado al track engineer
				var associatedPilotByLeagueIDs []uint
				for _, pilot := range associatedPilots {
					var pilotByLeague models.PilotByLeague
					if err := database.DB.Where("pilot_id = ? AND league_id = ?", pilot.ID, leagueID).First(&pilotByLeague).Error; err == nil {
						associatedPilotByLeagueIDs = append(associatedPilotByLeagueIDs, pilotByLeague.ID)
					}
				}

				// Verificar si el jugador tiene alguno de los pilotos asociados en cada modo
				hasRacePilot := false
				hasQualyPilot := false
				hasPracticePilot := false

				for _, pilotByLeagueID := range associatedPilotByLeagueIDs {
					// Verificar si está en race
					for _, racePilotID := range racePilots {
						if racePilotID == pilotByLeagueID {
							hasRacePilot = true
							break
						}
					}
					// Verificar si está en qualifying
					for _, qualyPilotID := range qualifyingPilots {
						if qualyPilotID == pilotByLeagueID {
							hasQualyPilot = true
							break
						}
					}
					// Verificar si está en practice
					for _, practicePilotID := range practicePilots {
						if practicePilotID == pilotByLeagueID {
							hasPracticePilot = true
							break
						}
					}
				}

				// Obtener puntos por sesión solo si tiene el piloto
				if hasRacePilot {
					var racePoints int
					database.DB.Model(&models.TrackEngineerPoints{}).
						Where("track_engineer_id = ? AND gp_index = ? AND session_type = ?", trackEngineer.ID, gpIndex, "race").
						Select("COALESCE(SUM(total_points), 0)").
						Scan(&racePoints)
					sessions["race"] = racePoints
				}

				if hasQualyPilot {
					var qualyPoints int
					database.DB.Model(&models.TrackEngineerPoints{}).
						Where("track_engineer_id = ? AND gp_index = ? AND session_type = ?", trackEngineer.ID, gpIndex, "qualy").
						Select("COALESCE(SUM(total_points), 0)").
						Scan(&qualyPoints)
					sessions["qualy"] = qualyPoints
				}

				if hasPracticePilot {
					var practicePoints int
					database.DB.Model(&models.TrackEngineerPoints{}).
						Where("track_engineer_id = ? AND gp_index = ? AND session_type = ?", trackEngineer.ID, gpIndex, "practice").
						Select("COALESCE(SUM(total_points), 0)").
						Scan(&practicePoints)
					sessions["practice"] = practicePoints
				}
			}

			c.JSON(200, gin.H{
				"gp_index":            gpIndex,
				"element_type":        elementType,
				"element_id":          elementID,
				"points":              totalPoints,
				"sessions":            sessions,
				"track_engineer_name": trackEngineer.Name,
			})
			return
		}

		// Para otros tipos de elementos, usar la lógica original
		var points int
		switch elementType {
		case "pilot":
			points = getPilotPoints(uint(elementID), gpIndex)
		case "team_constructor":
			points = getTeamConstructorPoints(uint(elementID), gpIndex)
		case "chief_engineer":
			points = getChiefEngineerPoints(uint(elementID), gpIndex)
		default:
			c.JSON(400, gin.H{"error": "Invalid element_type"})
			return
		}

		c.JSON(200, gin.H{
			"gp_index":     gpIndex,
			"element_type": elementType,
			"element_id":   elementID,
			"points":       points,
		})
	})

	router.POST("/api/lineup/save", authMiddleware(), func(c *gin.Context) {
		userID := c.GetUint("user_id")

		var req struct {
			LeagueID          uint   `json:"league_id"`
			RacePilots        []uint `json:"race_pilots"`
			QualifyingPilots  []uint `json:"qualifying_pilots"`
			PracticePilots    []uint `json:"practice_pilots"`
			TeamConstructorID *uint  `json:"team_constructor_id"`
			ChiefEngineerID   *uint  `json:"chief_engineer_id"`
			TrackEngineers    []uint `json:"track_engineers"`
			GPIndex           *uint  `json:"gp_index"` // Opcional para admins
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Invalid request"})
			return
		}

		// LÓGICA MEJORADA: Determinar el GP correcto para guardar alineación
		var targetGP models.GrandPrix
		now := time.Now()

		// Si se proporciona un GP index específico (para admins), usarlo
		if req.GPIndex != nil {
			log.Printf("🔍 Admin: Guardando alineación para GP index específico: %d", *req.GPIndex)
			if err := database.DB.Where("gp_index = ?", *req.GPIndex).First(&targetGP).Error; err != nil {
				c.JSON(404, gin.H{"error": "GP index no encontrado"})
				return
			}
			log.Printf("🔍 Admin: GP encontrado: %s (index: %d)", targetGP.Name, targetGP.GPIndex)
			// Si se proporcionó un GP index específico, no continuar con la lógica automática
		} else {
			// Buscar el próximo GP que NO haya comenzado aún
			if err := database.DB.Where("start_date > ?", now).Order("start_date ASC").First(&targetGP).Error; err != nil {
				// Si no hay próximos GPs, buscar el último GP que haya comenzado
				if err := database.DB.Where("start_date <= ?", now).Order("start_date DESC").First(&targetGP).Error; err != nil {
					c.JSON(404, gin.H{"error": "No Grand Prix found"})
					return
				}
			}

			// Verificar si el GP objetivo ya ha comenzado
			if targetGP.StartDate.Before(now) || targetGP.StartDate.Equal(now) {
				// El GP ya comenzó, buscar el próximo GP disponible
				if err := database.DB.Where("start_date > ?", now).Order("start_date ASC").First(&targetGP).Error; err != nil {
					c.JSON(400, gin.H{"error": "No se pueden guardar alineaciones. El GP ya ha comenzado y no hay próximos GPs disponibles."})
					return
				}
			}
		}

		// Buscar alineación existente para el GP objetivo
		var lineup models.Lineup
		exists := database.DB.Where("player_id = ? AND league_id = ? AND gp_index = ?", userID, req.LeagueID, targetGP.GPIndex).First(&lineup).Error == nil

		// Convertir arrays de IDs a JSON
		racePilotsJSON, _ := json.Marshal(req.RacePilots)
		qualifyingPilotsJSON, _ := json.Marshal(req.QualifyingPilots)
		practicePilotsJSON, _ := json.Marshal(req.PracticePilots)
		trackEngineersJSON, _ := json.Marshal(req.TrackEngineers)

		if exists {
			// Actualizar alineación existente
			lineup.RacePilots = racePilotsJSON
			lineup.QualifyingPilots = qualifyingPilotsJSON
			lineup.PracticePilots = practicePilotsJSON
			lineup.TeamConstructorID = req.TeamConstructorID
			lineup.ChiefEngineerID = req.ChiefEngineerID
			lineup.TrackEngineers = trackEngineersJSON

			if err := database.DB.Save(&lineup).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error updating lineup"})
				return
			}
		} else {
			// Crear nueva alineación
			lineup = models.Lineup{
				PlayerID:          userID,
				LeagueID:          req.LeagueID,
				GPIndex:           targetGP.GPIndex,
				RacePilots:        racePilotsJSON,
				QualifyingPilots:  qualifyingPilotsJSON,
				PracticePilots:    practicePilotsJSON,
				TeamConstructorID: req.TeamConstructorID,
				ChiefEngineerID:   req.ChiefEngineerID,
				TrackEngineers:    trackEngineersJSON,
			}

			if err := database.DB.Create(&lineup).Error; err != nil {
				c.JSON(500, gin.H{"error": "Error creating lineup"})
				return
			}
		}

		c.JSON(200, gin.H{
			"message":       "Lineup saved successfully",
			"gp_index":      targetGP.GPIndex,
			"gp_name":       targetGP.Name,
			"gp_start_date": targetGP.StartDate,
			"is_next_gp":    targetGP.StartDate.After(now),
		})
	})

	// Endpoint para calcular puntos de Track Engineers manualmente (formulario Admin Scores)
	router.POST("/api/admin/calculate-track-engineer-points", func(c *gin.Context) {
		var req struct {
			GPIndex            uint64 `json:"gp_index"`
			Mode               string `json:"mode"`
			TrackEngineerID    uint   `json:"track_engineer_id"`
			TeammateComparison string `json:"teammate_comparison"` // "ahead" o "behind"
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("[MANUAL-TRACK-ENG] Error ShouldBindJSON: %v", err)
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[MANUAL-TRACK-ENG] Calculando puntos para track_engineer=%d, gp=%d, mode=%s", req.TrackEngineerID, req.GPIndex, req.Mode)

		// 1. Obtener el track engineer y su piloto asociado
		var trackEngineer models.TrackEngineer
		if err := database.DB.First(&trackEngineer, req.TrackEngineerID).Error; err != nil {
			log.Printf("[MANUAL-TRACK-ENG] Track engineer %d no encontrado: %v", req.TrackEngineerID, err)
			c.JSON(404, gin.H{"error": "Track engineer no encontrado"})
			return
		}

		// 2. Buscar el piloto asociado a este track engineer para el modo específico
		var pilot models.Pilot
		modeCode := map[string]string{"race": "R", "qualy": "Q", "practice": "P"}[req.Mode]
		log.Printf("[MANUAL-TRACK-ENG] 🔍 Buscando piloto con track_engineer_id = %d y mode = %s", req.TrackEngineerID, modeCode)

		if err := database.DB.Where("track_engineer_id = ? AND mode = ?", req.TrackEngineerID, modeCode).First(&pilot).Error; err != nil {
			log.Printf("[MANUAL-TRACK-ENG] No hay piloto asociado al track engineer %d: %v", req.TrackEngineerID, err)
			c.JSON(404, gin.H{"error": "No hay piloto asociado a este track engineer"})
			return
		}

		log.Printf("[MANUAL-TRACK-ENG] 🔍 Piloto asociado encontrado: ID=%d, Name=%s, Team=%s, Mode=%s", pilot.ID, pilot.DriverName, pilot.Team, pilot.Mode)

		// 3. Buscar el compañero de equipo
		var teammate models.Pilot
		log.Printf("[MANUAL-TRACK-ENG] 🔍 Buscando compañero: team=%s, mode=%s (código=%s), pilot_id_diferente_de=%d", pilot.Team, req.Mode, modeCode, pilot.ID)

		if err := database.DB.Where("team = ? AND mode = ? AND id != ?", pilot.Team, modeCode, pilot.ID).First(&teammate).Error; err != nil {
			log.Printf("[MANUAL-TRACK-ENG] No se encontró compañero de equipo para piloto %d: %v", pilot.ID, err)
			c.JSON(404, gin.H{"error": "No se encontró compañero de equipo"})
			return
		}

		log.Printf("[MANUAL-TRACK-ENG] 🔍 Compañero encontrado: ID=%d, Name=%s, Team=%s, Mode=%s", teammate.ID, teammate.DriverName, teammate.Team, teammate.Mode)

		// 4. Calcular puntos para AMBOS pilotos directamente aquí
		log.Printf("[CALCULATE-TRACK-ENG] 🚀 INICIANDO cálculo para ambos pilotos...")

		// Determinar multiplicadores según la comparación
		var pilotMultiplier, teammateMultiplier float64
		if req.TeammateComparison == "ahead" {
			// Piloto original quedó DELANTE
			pilotMultiplier = 0.5
			teammateMultiplier = 0.2
		} else {
			// Piloto original quedó DETRÁS
			pilotMultiplier = 0.2
			teammateMultiplier = 0.5
		}

		// Calcular puntos para el piloto original
		pilotResult := calculateSingleTrackEngineerPointsManually(pilot.TrackEngineerID, pilot.ID, req.GPIndex, req.Mode, pilotMultiplier)

		// Calcular puntos para el compañero
		teammateResult := calculateSingleTrackEngineerPointsManually(teammate.TrackEngineerID, teammate.ID, req.GPIndex, req.Mode, teammateMultiplier)

		log.Printf("[CALCULATE-TRACK-ENG] ✅ TERMINADO cálculo para ambos pilotos")

		// 4. Devolver información de ambos pilotos calculados
		response := gin.H{
			"message": "Puntos de Track Engineer calculados correctamente para ambos pilotos",
		}

		if pilotResult != nil {
			response["pilot_details"] = pilotResult
		}

		if teammateResult != nil {
			response["teammate_details"] = teammateResult
		}

		// Información adicional
		response["summary"] = gin.H{
			"pilots_processed": 2,
			"gp_index":         req.GPIndex,
			"session_type":     req.Mode,
			"comparison":       req.TeammateComparison,
		}

		c.JSON(200, response)
	})

	// Endpoint para recalcular puntos de jugadores en player_points_by_gp para un GP
	router.POST("/api/admin/recalculate-player-points", authMiddleware(), func(c *gin.Context) {
		var req struct {
			GPIndex  uint64 `json:"gp_index"`
			LeagueID *uint  `json:"league_id,omitempty"` // Opcional, si no se especifica se hace para todas las ligas
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("[RECALC-PLAYER-POINTS] Error ShouldBindJSON: %v", err)
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[RECALC-PLAYER-POINTS] Recalculando puntos para GP %d", req.GPIndex)

		// Obtener todas las alineaciones para este GP (filtrar por liga si se especifica)
		var lineups []models.Lineup
		query := database.DB.Where("gp_index = ?", req.GPIndex)
		if req.LeagueID != nil {
			query = query.Where("league_id = ?", *req.LeagueID)
		}
		query.Find(&lineups)

		updatedCount := 0
		for _, lineup := range lineups {
			// Calcular puntos usando la nueva lógica
			totalPoints := calculatePlayerTotalPoints(lineup.PlayerID, uint64(lineup.LeagueID), req.GPIndex)

			// Actualizar player_points_by_gp
			var existingRecord struct {
				ID uint `gorm:"primaryKey"`
			}
			err := database.DB.Table("player_points_by_gp").Where("player_id = ? AND league_id = ? AND gp_index = ?", lineup.PlayerID, lineup.LeagueID, req.GPIndex).First(&existingRecord).Error

			if err != nil {
				// No existe, crear nuevo registro
				err = database.DB.Exec("INSERT INTO player_points_by_gp (player_id, league_id, gp_index, points) VALUES (?, ?, ?, ?)",
					lineup.PlayerID, lineup.LeagueID, req.GPIndex, totalPoints).Error
				if err != nil {
					log.Printf("[RECALC-PLAYER-POINTS] Error creando registro para player_id=%d, league_id=%d: %v", lineup.PlayerID, lineup.LeagueID, err)
					continue
				}
			} else {
				// Existe, actualizar
				err = database.DB.Exec("UPDATE player_points_by_gp SET points = ? WHERE player_id = ? AND league_id = ? AND gp_index = ?",
					totalPoints, lineup.PlayerID, lineup.LeagueID, req.GPIndex).Error
				if err != nil {
					log.Printf("[RECALC-PLAYER-POINTS] Error actualizando registro para player_id=%d, league_id=%d: %v", lineup.PlayerID, lineup.LeagueID, err)
					continue
				}
			}

			// También actualizar lineup_points en la tabla lineups
			lineup.LineupPoints = totalPoints
			database.DB.Save(&lineup)

			log.Printf("[RECALC-PLAYER-POINTS] Player %d (Liga %d): %d puntos", lineup.PlayerID, lineup.LeagueID, totalPoints)
			updatedCount++
		}

		// Recalcular puntos totales de todos los jugadores afectados
		var affectedPlayers []struct {
			PlayerID uint
			LeagueID uint
		}

		query = database.DB.Table("lineups").Select("DISTINCT player_id, league_id").Where("gp_index = ?", req.GPIndex)
		if req.LeagueID != nil {
			query = query.Where("league_id = ?", *req.LeagueID)
		}
		query.Find(&affectedPlayers)

		for _, player := range affectedPlayers {
			// Recalcular puntos totales sumando todos los GPs
			var totalPoints int
			err := database.DB.Raw("SELECT COALESCE(SUM(points), 0) FROM player_points_by_gp WHERE player_id = ? AND league_id = ?", player.PlayerID, player.LeagueID).Scan(&totalPoints).Error
			if err == nil {
				// Actualizar TotalPoints en PlayerByLeague
				database.DB.Model(&models.PlayerByLeague{}).Where("player_id = ? AND league_id = ?", player.PlayerID, player.LeagueID).Update("total_points", totalPoints)
			}
		}

		message := fmt.Sprintf("Recalculados puntos para %d jugadores en GP %d", updatedCount, req.GPIndex)
		if req.LeagueID != nil {
			message += fmt.Sprintf(" (Liga %d)", *req.LeagueID)
		}

		c.JSON(200, gin.H{
			"message":       message,
			"updated_count": updatedCount,
		})
	})

	// Endpoint para actualizar puntos de alineaciones (solo administradores)
	router.POST("/api/admin/update-lineup-points", authMiddleware(), func(c *gin.Context) {
		// Verificar que el usuario sea administrador
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}

		// Verificar si es administrador
		var player models.Player
		if err := database.DB.First(&player, userID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Usuario no encontrado"})
			return
		}
		if !player.IsAdmin {
			c.JSON(403, gin.H{"error": "Acceso denegado. Solo administradores."})
			return
		}

		var req struct {
			LeagueID uint `json:"league_id"`
			GPIndex  uint `json:"gp_index"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[UPDATE-LINEUP-POINTS] Iniciando actualización para league_id=%d, gp_index=%d", req.LeagueID, req.GPIndex)

		// Obtener todas las alineaciones de esta liga y GP
		var lineups []models.Lineup
		if err := database.DB.Where("league_id = ? AND gp_index = ?", req.LeagueID, req.GPIndex).Find(&lineups).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo alineaciones"})
			return
		}

		log.Printf("[UPDATE-LINEUP-POINTS] Encontradas %d alineaciones", len(lineups))

		// Verificar si ya se han calculado puntos para alguna alineación
		alreadyCalculatedCount := 0
		lineupsToUpdate := []models.Lineup{}

		for _, lineup := range lineups {
			if lineup.LineupPoints > 0 {
				alreadyCalculatedCount++
			} else {
				lineupsToUpdate = append(lineupsToUpdate, lineup)
			}
		}

		if alreadyCalculatedCount > 0 {
			log.Printf("[UPDATE-LINEUP-POINTS] ADVERTENCIA: %d alineaciones ya tienen puntos calculados, actualizando solo %d alineaciones", alreadyCalculatedCount, len(lineupsToUpdate))
		}

		if len(lineupsToUpdate) == 0 {
			c.JSON(400, gin.H{
				"error":                    fmt.Sprintf("Todas las alineaciones (%d) ya tienen puntos calculados. Si necesitas recalcular, primero resetea los puntos a 0.", len(lineups)),
				"already_calculated_count": alreadyCalculatedCount,
				"total_lineups":            len(lineups),
				"league_id":                req.LeagueID,
				"gp_index":                 req.GPIndex,
			})
			return
		}

		updatedCount := 0
		for _, lineup := range lineupsToUpdate {
			totalPoints := 0

			// Calcular puntos de pilotos de carrera
			var racePilots []uint
			if len(lineup.RacePilots) > 0 {
				json.Unmarshal(lineup.RacePilots, &racePilots)
				for _, pilotByLeagueID := range racePilots {
					points := getPilotPoints(pilotByLeagueID, uint64(req.GPIndex))
					totalPoints += points
					log.Printf("[UPDATE-LINEUP-POINTS] Piloto carrera ID %d: %d pts", pilotByLeagueID, points)
				}
			}

			// Calcular puntos de pilotos de clasificación
			var qualifyingPilots []uint
			if len(lineup.QualifyingPilots) > 0 {
				json.Unmarshal(lineup.QualifyingPilots, &qualifyingPilots)
				for _, pilotByLeagueID := range qualifyingPilots {
					points := getPilotPoints(pilotByLeagueID, uint64(req.GPIndex))
					totalPoints += points
					log.Printf("[UPDATE-LINEUP-POINTS] Piloto qualy ID %d: %d pts", pilotByLeagueID, points)
				}
			}

			// Calcular puntos de pilotos de práctica
			var practicePilots []uint
			if len(lineup.PracticePilots) > 0 {
				json.Unmarshal(lineup.PracticePilots, &practicePilots)
				for _, pilotByLeagueID := range practicePilots {
					points := getPilotPoints(pilotByLeagueID, uint64(req.GPIndex))
					totalPoints += points
					log.Printf("[UPDATE-LINEUP-POINTS] Piloto practice ID %d: %d pts", pilotByLeagueID, points)
				}
			}

			// Calcular puntos del constructor
			if lineup.TeamConstructorID != nil {
				points := getTeamConstructorPoints(*lineup.TeamConstructorID, uint64(req.GPIndex))
				totalPoints += points
				log.Printf("[UPDATE-LINEUP-POINTS] Constructor ID %d: %d pts", *lineup.TeamConstructorID, points)
			}

			// Calcular puntos del chief engineer
			if lineup.ChiefEngineerID != nil {
				points := getChiefEngineerPoints(*lineup.ChiefEngineerID, uint64(req.GPIndex))
				totalPoints += points
				log.Printf("[UPDATE-LINEUP-POINTS] Chief Engineer ID %d: %d pts", *lineup.ChiefEngineerID, points)
			}

			// Calcular puntos de track engineers
			var trackEngineers []uint
			if len(lineup.TrackEngineers) > 0 {
				json.Unmarshal(lineup.TrackEngineers, &trackEngineers)
				for _, trackEngineerByLeagueID := range trackEngineers {
					points := getTrackEngineerPointsWithLineup(trackEngineerByLeagueID, uint64(req.GPIndex), lineup)
					totalPoints += points
					log.Printf("[UPDATE-LINEUP-POINTS] Track Engineer ID %d: %d pts", trackEngineerByLeagueID, points)
				}
			}

			// Actualizar los puntos en la alineación
			lineup.LineupPoints = totalPoints
			if err := database.DB.Save(&lineup).Error; err != nil {
				log.Printf("[UPDATE-LINEUP-POINTS] Error guardando alineación %d: %v", lineup.ID, err)
				continue
			}

			log.Printf("[UPDATE-LINEUP-POINTS] Alineación %d (jugador %d): %d pts totales", lineup.ID, lineup.PlayerID, totalPoints)
			updatedCount++
		}

		message := fmt.Sprintf("Actualizadas %d alineaciones con sus puntos totales", updatedCount)
		if alreadyCalculatedCount > 0 {
			message = fmt.Sprintf("Actualizadas %d alineaciones con sus puntos totales (%d alineaciones ya tenían puntos calculados)", updatedCount, alreadyCalculatedCount)
		}

		c.JSON(200, gin.H{
			"message":                  message,
			"updated_count":            updatedCount,
			"already_calculated_count": alreadyCalculatedCount,
			"total_lineups":            len(lineups),
			"league_id":                req.LeagueID,
			"gp_index":                 req.GPIndex,
		})
	})

	// Endpoint para resetear puntos de alineaciones (solo administradores)
	router.POST("/api/admin/reset-lineup-points", authMiddleware(), func(c *gin.Context) {
		// Verificar que el usuario sea administrador
		userIDRaw, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		userID, ok := userIDRaw.(uint)
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado (tipo user_id incorrecto)"})
			return
		}

		// Verificar si es administrador
		var player models.Player
		if err := database.DB.First(&player, userID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Usuario no encontrado"})
			return
		}
		if !player.IsAdmin {
			c.JSON(403, gin.H{"error": "Acceso denegado. Solo administradores."})
			return
		}

		var req struct {
			LeagueID uint `json:"league_id"`
			GPIndex  uint `json:"gp_index"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[RESET-LINEUP-POINTS] Reseteando puntos para league_id=%d, gp_index=%d", req.LeagueID, req.GPIndex)

		// Resetear todos los puntos de alineaciones de esta liga y GP
		result := database.DB.Model(&models.Lineup{}).
			Where("league_id = ? AND gp_index = ?", req.LeagueID, req.GPIndex).
			Update("lineup_points", 0)

		if result.Error != nil {
			c.JSON(500, gin.H{"error": "Error reseteando puntos"})
			return
		}

		log.Printf("[RESET-LINEUP-POINTS] Reseteados %d alineaciones", result.RowsAffected)

		c.JSON(200, gin.H{
			"message":     fmt.Sprintf("Reseteados puntos de %d alineaciones", result.RowsAffected),
			"reset_count": result.RowsAffected,
			"league_id":   req.LeagueID,
			"gp_index":    req.GPIndex,
		})
	})

	// Endpoint para hacer oferta de compra (POST para crear, PUT para actualizar)
	router.POST("/api/:item_type/make-offer", authMiddleware(), func(c *gin.Context) {
		itemType := c.Param("item_type")
		var req struct {
			ItemID     uint    `json:"item_id"`
			LeagueID   uint    `json:"league_id"`
			OfferValue float64 `json:"offer_value"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userID := c.GetUint("user_id")

		// Verificar que el usuario tiene suficiente dinero
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userID, req.LeagueID).First(&playerLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "Jugador no encontrado"})
			return
		}

		if playerLeague.Money < req.OfferValue {
			c.JSON(400, gin.H{"error": "No tienes suficiente dinero"})
			return
		}

		// Crear la oferta según el tipo de elemento
		var bid Bid
		switch itemType {
		case "pilot":
			var pbl models.PilotByLeague
			if err := database.DB.First(&pbl, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Piloto no encontrado"})
				return
			}

			// Verificar si ya existe una oferta del usuario
			var existingBids []Bid
			if len(pbl.Bids) > 0 {
				json.Unmarshal(pbl.Bids, &existingBids)
			}

			// Buscar si ya existe una oferta del usuario
			existingOfferIndex := -1
			for i, existingBid := range existingBids {
				if existingBid.PlayerID == userID {
					existingOfferIndex = i
					break
				}
			}

			if existingOfferIndex >= 0 {
				// Actualizar oferta existente
				existingBids[existingOfferIndex].Valor = req.OfferValue
				c.JSON(200, gin.H{"message": "Oferta actualizada correctamente", "updated": true})
			} else {
				// Crear nueva oferta
				bid = Bid{PlayerID: userID, Valor: req.OfferValue}
				existingBids = append(existingBids, bid)
				c.JSON(200, gin.H{"message": "Oferta enviada correctamente", "updated": false})
			}

			bidsJSON, _ := json.Marshal(existingBids)
			pbl.Bids = bidsJSON
			database.DB.Save(&pbl)

		case "track_engineer":
			var teb models.TrackEngineerByLeague
			if err := database.DB.First(&teb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Track Engineer no encontrado"})
				return
			}

			var existingBids []Bid
			if len(teb.Bids) > 0 {
				json.Unmarshal(teb.Bids, &existingBids)
			}

			existingOfferIndex := -1
			for i, existingBid := range existingBids {
				if existingBid.PlayerID == userID {
					existingOfferIndex = i
					break
				}
			}

			if existingOfferIndex >= 0 {
				existingBids[existingOfferIndex].Valor = req.OfferValue
				c.JSON(200, gin.H{"message": "Oferta actualizada correctamente", "updated": true})
			} else {
				bid = Bid{PlayerID: userID, Valor: req.OfferValue}
				existingBids = append(existingBids, bid)
				c.JSON(200, gin.H{"message": "Oferta enviada correctamente", "updated": false})
			}

			bidsJSON, _ := json.Marshal(existingBids)
			teb.Bids = bidsJSON
			database.DB.Save(&teb)

		case "chief_engineer":
			var ceb models.ChiefEngineerByLeague
			if err := database.DB.First(&ceb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Chief Engineer no encontrado"})
				return
			}

			var existingBids []Bid
			if len(ceb.Bids) > 0 {
				json.Unmarshal(ceb.Bids, &existingBids)
			}

			existingOfferIndex := -1
			for i, existingBid := range existingBids {
				if existingBid.PlayerID == userID {
					existingOfferIndex = i
					break
				}
			}

			if existingOfferIndex >= 0 {
				existingBids[existingOfferIndex].Valor = req.OfferValue
				c.JSON(200, gin.H{"message": "Oferta actualizada correctamente", "updated": true})
			} else {
				bid = Bid{PlayerID: userID, Valor: req.OfferValue}
				existingBids = append(existingBids, bid)
				c.JSON(200, gin.H{"message": "Oferta enviada correctamente", "updated": false})
			}

			bidsJSON, _ := json.Marshal(existingBids)
			ceb.Bids = bidsJSON
			database.DB.Save(&ceb)

		case "team_constructor":
			var tcb models.TeamConstructorByLeague
			if err := database.DB.First(&tcb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Team Constructor no encontrado"})
				return
			}

			var existingBids []Bid
			if len(tcb.Bids) > 0 {
				json.Unmarshal(tcb.Bids, &existingBids)
			}

			existingOfferIndex := -1
			for i, existingBid := range existingBids {
				if existingBid.PlayerID == userID {
					existingOfferIndex = i
					break
				}
			}

			if existingOfferIndex >= 0 {
				existingBids[existingOfferIndex].Valor = req.OfferValue
				c.JSON(200, gin.H{"message": "Oferta actualizada correctamente", "updated": true})
			} else {
				bid = Bid{PlayerID: userID, Valor: req.OfferValue}
				existingBids = append(existingBids, bid)
				c.JSON(200, gin.H{"message": "Oferta enviada correctamente", "updated": false})
			}

			bidsJSON, _ := json.Marshal(existingBids)
			tcb.Bids = bidsJSON
			database.DB.Save(&tcb)

		default:
			c.JSON(400, gin.H{"error": "Tipo de elemento no válido"})
			return
		}
	})

	// Endpoint para actualizar oferta (PUT)
	router.PUT("/api/:item_type/update-offer", authMiddleware(), func(c *gin.Context) {
		itemType := c.Param("item_type")
		var req struct {
			ItemID     uint    `json:"item_id"`
			LeagueID   uint    `json:"league_id"`
			OfferValue float64 `json:"offer_value"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userID := c.GetUint("user_id")

		// Verificar que el usuario tiene suficiente dinero
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userID, req.LeagueID).First(&playerLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "Jugador no encontrado"})
			return
		}

		if playerLeague.Money < req.OfferValue {
			c.JSON(400, gin.H{"error": "No tienes suficiente dinero"})
			return
		}

		// Actualizar la oferta según el tipo de elemento
		switch itemType {
		case "pilot":
			var pbl models.PilotByLeague
			if err := database.DB.First(&pbl, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Piloto no encontrado"})
				return
			}

			var existingBids []Bid
			if len(pbl.Bids) > 0 {
				json.Unmarshal(pbl.Bids, &existingBids)
			}

			// Buscar y actualizar la oferta del usuario
			offerFound := false
			for i, existingBid := range existingBids {
				if existingBid.PlayerID == userID {
					existingBids[i].Valor = req.OfferValue
					offerFound = true
					break
				}
			}

			if !offerFound {
				c.JSON(404, gin.H{"error": "No tienes una oferta activa para este elemento"})
				return
			}

			bidsJSON, _ := json.Marshal(existingBids)
			pbl.Bids = bidsJSON
			database.DB.Save(&pbl)

		case "track_engineer":
			var teb models.TrackEngineerByLeague
			if err := database.DB.First(&teb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Track Engineer no encontrado"})
				return
			}

			var existingBids []Bid
			if len(teb.Bids) > 0 {
				json.Unmarshal(teb.Bids, &existingBids)
			}

			offerFound := false
			for i, existingBid := range existingBids {
				if existingBid.PlayerID == userID {
					existingBids[i].Valor = req.OfferValue
					offerFound = true
					break
				}
			}

			if !offerFound {
				c.JSON(404, gin.H{"error": "No tienes una oferta activa para este elemento"})
				return
			}

			bidsJSON, _ := json.Marshal(existingBids)
			teb.Bids = bidsJSON
			database.DB.Save(&teb)

		case "chief_engineer":
			var ceb models.ChiefEngineerByLeague
			if err := database.DB.First(&ceb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Chief Engineer no encontrado"})
				return
			}

			var existingBids []Bid
			if len(ceb.Bids) > 0 {
				json.Unmarshal(ceb.Bids, &existingBids)
			}

			offerFound := false
			for i, existingBid := range existingBids {
				if existingBid.PlayerID == userID {
					existingBids[i].Valor = req.OfferValue
					offerFound = true
					break
				}
			}

			if !offerFound {
				c.JSON(404, gin.H{"error": "No tienes una oferta activa para este elemento"})
				return
			}

			bidsJSON, _ := json.Marshal(existingBids)
			ceb.Bids = bidsJSON
			database.DB.Save(&ceb)

		case "team_constructor":
			var tcb models.TeamConstructorByLeague
			if err := database.DB.First(&tcb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Team Constructor no encontrado"})
				return
			}

			var existingBids []Bid
			if len(tcb.Bids) > 0 {
				json.Unmarshal(tcb.Bids, &existingBids)
			}

			offerFound := false
			for i, existingBid := range existingBids {
				if existingBid.PlayerID == userID {
					existingBids[i].Valor = req.OfferValue
					offerFound = true
					break
				}
			}

			if !offerFound {
				c.JSON(404, gin.H{"error": "No tienes una oferta activa para este elemento"})
				return
			}

			bidsJSON, _ := json.Marshal(existingBids)
			tcb.Bids = bidsJSON
			database.DB.Save(&tcb)

		default:
			c.JSON(400, gin.H{"error": "Tipo de elemento no válido"})
			return
		}

		c.JSON(200, gin.H{"message": "Oferta actualizada correctamente"})
	})

	// Endpoint para eliminar oferta (DELETE)
	router.DELETE("/api/:item_type/delete-offer", authMiddleware(), func(c *gin.Context) {
		itemType := c.Param("item_type")
		var req struct {
			ItemID   uint `json:"item_id"`
			LeagueID uint `json:"league_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userID := c.GetUint("user_id")

		// Primero buscar en subastas activas
		var auction Auction
		if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", itemType, req.ItemID, req.LeagueID, time.Now()).First(&auction).Error; err == nil {
			// Es una subasta activa
			var bids []Bid
			if len(auction.Bids) > 0 {
				json.Unmarshal(auction.Bids, &bids)
			}

			// Filtrar la oferta del usuario
			newBids := make([]Bid, 0)
			offerFound := false
			for _, existingBid := range bids {
				if existingBid.PlayerID != userID {
					newBids = append(newBids, existingBid)
				} else {
					offerFound = true
				}
			}

			if !offerFound {
				c.JSON(404, gin.H{"error": "No tienes una oferta activa para este elemento"})
				return
			}

			bidsJSON, _ := json.Marshal(newBids)
			auction.Bids = bidsJSON
			database.DB.Save(&auction)
			c.JSON(200, gin.H{"message": "Oferta eliminada correctamente"})
			return
		}

		// Si no es una subasta activa, buscar en ofertas directas según el tipo
		switch itemType {
		case "pilot":
			var pbl models.PilotByLeague
			if err := database.DB.First(&pbl, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Piloto no encontrado"})
				return
			}

			var existingBids []Bid
			if len(pbl.Bids) > 0 {
				json.Unmarshal(pbl.Bids, &existingBids)
			}

			// Filtrar la oferta del usuario
			newBids := make([]Bid, 0)
			offerFound := false
			for _, existingBid := range existingBids {
				if existingBid.PlayerID != userID {
					newBids = append(newBids, existingBid)
				} else {
					offerFound = true
				}
			}

			if !offerFound {
				c.JSON(404, gin.H{"error": "No tienes una oferta activa para este elemento"})
				return
			}

			bidsJSON, _ := json.Marshal(newBids)
			pbl.Bids = bidsJSON
			database.DB.Save(&pbl)

		case "track_engineer":
			var teb models.TrackEngineerByLeague
			if err := database.DB.First(&teb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Track Engineer no encontrado"})
				return
			}

			var existingBids []Bid
			if len(teb.Bids) > 0 {
				json.Unmarshal(teb.Bids, &existingBids)
			}

			newBids := make([]Bid, 0)
			offerFound := false
			for _, existingBid := range existingBids {
				if existingBid.PlayerID != userID {
					newBids = append(newBids, existingBid)
				} else {
					offerFound = true
				}
			}

			if !offerFound {
				c.JSON(404, gin.H{"error": "No tienes una oferta activa para este elemento"})
				return
			}

			bidsJSON, _ := json.Marshal(newBids)
			teb.Bids = bidsJSON
			database.DB.Save(&teb)

		case "chief_engineer":
			var ceb models.ChiefEngineerByLeague
			if err := database.DB.First(&ceb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Chief Engineer no encontrado"})
				return
			}

			var existingBids []Bid
			if len(ceb.Bids) > 0 {
				json.Unmarshal(ceb.Bids, &existingBids)
			}

			newBids := make([]Bid, 0)
			offerFound := false
			for _, existingBid := range existingBids {
				if existingBid.PlayerID != userID {
					newBids = append(newBids, existingBid)
				} else {
					offerFound = true
				}
			}

			if !offerFound {
				c.JSON(404, gin.H{"error": "No tienes una oferta activa para este elemento"})
				return
			}

			bidsJSON, _ := json.Marshal(newBids)
			ceb.Bids = bidsJSON
			database.DB.Save(&ceb)

		case "team_constructor":
			var tcb models.TeamConstructorByLeague
			if err := database.DB.First(&tcb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Team Constructor no encontrado"})
				return
			}

			var existingBids []Bid
			if len(tcb.Bids) > 0 {
				json.Unmarshal(tcb.Bids, &existingBids)
			}

			newBids := make([]Bid, 0)
			offerFound := false
			for _, existingBid := range existingBids {
				if existingBid.PlayerID != userID {
					newBids = append(newBids, existingBid)
				} else {
					offerFound = true
				}
			}

			if !offerFound {
				c.JSON(404, gin.H{"error": "No tienes una oferta activa para este elemento"})
				return
			}

			bidsJSON, _ := json.Marshal(newBids)
			tcb.Bids = bidsJSON
			database.DB.Save(&tcb)

		default:
			c.JSON(400, gin.H{"error": "Tipo de elemento no válido"})
			return
		}

		c.JSON(200, gin.H{"message": "Oferta eliminada correctamente"})
	})

	// Endpoint para activar cláusula
	router.POST("/api/:item_type/activate-clausula", authMiddleware(), func(c *gin.Context) {
		itemType := c.Param("item_type")
		var req struct {
			ItemID        uint    `json:"item_id"`
			LeagueID      uint    `json:"league_id"`
			ClausulaValue float64 `json:"clausula_value"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userID := c.GetUint("user_id")

		// Verificar que el usuario tiene suficiente dinero
		var playerLeague models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userID, req.LeagueID).First(&playerLeague).Error; err != nil {
			c.JSON(404, gin.H{"error": "Jugador no encontrado"})
			return
		}

		if playerLeague.Money < req.ClausulaValue {
			c.JSON(400, gin.H{"error": "No tienes suficiente dinero"})
			return
		}

		// Activar cláusula según el tipo de elemento
		switch itemType {
		case "pilot":
			var pbl models.PilotByLeague
			if err := database.DB.First(&pbl, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Piloto no encontrado"})
				return
			}
			if pbl.ClausulaValue == nil || *pbl.ClausulaValue != req.ClausulaValue {
				c.JSON(400, gin.H{"error": "Valor de cláusula incorrecto"})
				return
			}
			// Verificar que la cláusula haya expirado
			if pbl.Clausulatime != nil && pbl.Clausulatime.After(time.Now()) {
				c.JSON(400, gin.H{"error": "La cláusula aún está activa y protege al elemento"})
				return
			}
			// Transferir propiedad
			oldOwnerID := pbl.OwnerID
			pbl.OwnerID = userID
			database.DB.Save(&pbl)
			// Actualizar dinero
			playerLeague.Money -= req.ClausulaValue
			database.DB.Save(&playerLeague)
			// Dar dinero al propietario anterior
			var oldOwnerLeague models.PlayerByLeague
			if err := database.DB.Where("player_id = ? AND league_id = ?", oldOwnerID, req.LeagueID).First(&oldOwnerLeague).Error; err == nil {
				oldOwnerLeague.Money += req.ClausulaValue
				database.DB.Save(&oldOwnerLeague)
			}

		case "track_engineer":
			var teb models.TrackEngineerByLeague
			if err := database.DB.First(&teb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Track Engineer no encontrado"})
				return
			}
			if teb.ClausulaValue == nil || *teb.ClausulaValue != req.ClausulaValue {
				c.JSON(400, gin.H{"error": "Valor de cláusula incorrecto"})
				return
			}
			// Verificar que la cláusula haya expirado
			if teb.Clausulatime != nil && teb.Clausulatime.After(time.Now()) {
				c.JSON(400, gin.H{"error": "La cláusula aún está activa y protege al elemento"})
				return
			}
			oldOwnerID := teb.OwnerID
			teb.OwnerID = userID
			database.DB.Save(&teb)
			playerLeague.Money -= req.ClausulaValue
			database.DB.Save(&playerLeague)
			var oldOwnerLeague models.PlayerByLeague
			if err := database.DB.Where("player_id = ? AND league_id = ?", oldOwnerID, req.LeagueID).First(&oldOwnerLeague).Error; err == nil {
				oldOwnerLeague.Money += req.ClausulaValue
				database.DB.Save(&oldOwnerLeague)
			}

		case "chief_engineer":
			var ceb models.ChiefEngineerByLeague
			if err := database.DB.First(&ceb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Chief Engineer no encontrado"})
				return
			}
			if ceb.ClausulaValue == nil || *ceb.ClausulaValue != req.ClausulaValue {
				c.JSON(400, gin.H{"error": "Valor de cláusula incorrecto"})
				return
			}
			// Verificar que la cláusula haya expirado
			if ceb.Clausulatime != nil && ceb.Clausulatime.After(time.Now()) {
				c.JSON(400, gin.H{"error": "La cláusula aún está activa y protege al elemento"})
				return
			}
			oldOwnerID := ceb.OwnerID
			ceb.OwnerID = userID
			database.DB.Save(&ceb)
			playerLeague.Money -= req.ClausulaValue
			database.DB.Save(&playerLeague)
			var oldOwnerLeague models.PlayerByLeague
			if err := database.DB.Where("player_id = ? AND league_id = ?", oldOwnerID, req.LeagueID).First(&oldOwnerLeague).Error; err == nil {
				oldOwnerLeague.Money += req.ClausulaValue
				database.DB.Save(&oldOwnerLeague)
			}

		case "team_constructor":
			var tcb models.TeamConstructorByLeague
			if err := database.DB.First(&tcb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Team Constructor no encontrado"})
				return
			}
			if tcb.ClausulaValue == nil || *tcb.ClausulaValue != req.ClausulaValue {
				c.JSON(400, gin.H{"error": "Valor de cláusula incorrecto"})
				return
			}
			// Verificar que la cláusula haya expirado
			if tcb.Clausulatime != nil && tcb.Clausulatime.After(time.Now()) {
				c.JSON(400, gin.H{"error": "La cláusula aún está activa y protege al elemento"})
				return
			}
			oldOwnerID := tcb.OwnerID
			tcb.OwnerID = userID
			database.DB.Save(&tcb)
			playerLeague.Money -= req.ClausulaValue
			database.DB.Save(&playerLeague)
			var oldOwnerLeague models.PlayerByLeague
			if err := database.DB.Where("player_id = ? AND league_id = ?", oldOwnerID, req.LeagueID).First(&oldOwnerLeague).Error; err == nil {
				oldOwnerLeague.Money += req.ClausulaValue
				database.DB.Save(&oldOwnerLeague)
			}

		default:
			c.JSON(400, gin.H{"error": "Tipo de elemento no válido"})
			return
		}

		c.JSON(200, gin.H{"message": "Cláusula activada correctamente"})
	})

	// Endpoint para obtener ofertas recibidas por un jugador
	router.GET("/api/player/received-offers", authMiddleware(), func(c *gin.Context) {
		userID := c.GetUint("user_id")
		leagueID := c.Query("league_id")

		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}

		leagueIDUint, err := strconv.ParseUint(leagueID, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{"error": "league_id inválido"})
			return
		}

		var receivedOffers []map[string]interface{}

		// Obtener pilotos del jugador con ofertas
		var pilotsWithOffers []models.PilotByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND bids IS NOT NULL AND bids != '[]'", leagueIDUint, userID).Find(&pilotsWithOffers)

		for _, pbl := range pilotsWithOffers {
			var pilot models.Pilot
			if err := database.DB.First(&pilot, pbl.PilotID).Error; err != nil {
				continue
			}

			var bids []Bid
			if len(pbl.Bids) > 0 {
				json.Unmarshal(pbl.Bids, &bids)
			}

			for _, bid := range bids {
				// Obtener nombre del jugador que hizo la oferta
				var bidderPlayer models.Player
				if err := database.DB.First(&bidderPlayer, bid.PlayerID).Error; err != nil {
					continue
				}

				offer := map[string]interface{}{
					"id":          pbl.ID,
					"type":        "pilot",
					"name":        pilot.DriverName,
					"team":        pilot.Team,
					"image_url":   pilot.ImageURL,
					"bidder_id":   bid.PlayerID,
					"bidder_name": bidderPlayer.Name,
					"offer_value": bid.Valor,
					"received_at": time.Now(), // En una implementación real, esto debería venir de la base de datos
				}
				receivedOffers = append(receivedOffers, offer)
			}
		}

		// Obtener track engineers del jugador con ofertas
		var trackEngineersWithOffers []models.TrackEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND bids IS NOT NULL AND bids != '[]'", leagueIDUint, userID).Find(&trackEngineersWithOffers)

		for _, teb := range trackEngineersWithOffers {
			var engineer models.TrackEngineer
			if err := database.DB.First(&engineer, teb.TrackEngineerID).Error; err != nil {
				continue
			}

			var bids []Bid
			if len(teb.Bids) > 0 {
				json.Unmarshal(teb.Bids, &bids)
			}

			for _, bid := range bids {
				var bidderPlayer models.Player
				if err := database.DB.First(&bidderPlayer, bid.PlayerID).Error; err != nil {
					continue
				}

				offer := map[string]interface{}{
					"id":          teb.ID,
					"type":        "track_engineer",
					"name":        engineer.Name,
					"team":        engineer.Team,
					"image_url":   engineer.ImageURL,
					"bidder_id":   bid.PlayerID,
					"bidder_name": bidderPlayer.Name,
					"offer_value": bid.Valor,
					"received_at": time.Now(),
				}
				receivedOffers = append(receivedOffers, offer)
			}
		}

		// Obtener chief engineers del jugador con ofertas
		var chiefEngineersWithOffers []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND bids IS NOT NULL AND bids != '[]'", leagueIDUint, userID).Find(&chiefEngineersWithOffers)

		for _, ceb := range chiefEngineersWithOffers {
			var engineer models.ChiefEngineer
			if err := database.DB.First(&engineer, ceb.ChiefEngineerID).Error; err != nil {
				continue
			}

			var bids []Bid
			if len(ceb.Bids) > 0 {
				json.Unmarshal(ceb.Bids, &bids)
			}

			for _, bid := range bids {
				var bidderPlayer models.Player
				if err := database.DB.First(&bidderPlayer, bid.PlayerID).Error; err != nil {
					continue
				}

				offer := map[string]interface{}{
					"id":          ceb.ID,
					"type":        "chief_engineer",
					"name":        engineer.Name,
					"team":        engineer.Team,
					"image_url":   engineer.ImageURL,
					"bidder_id":   bid.PlayerID,
					"bidder_name": bidderPlayer.Name,
					"offer_value": bid.Valor,
					"received_at": time.Now(),
				}
				receivedOffers = append(receivedOffers, offer)
			}
		}

		// Obtener team constructors del jugador con ofertas
		var teamConstructorsWithOffers []models.TeamConstructorByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND bids IS NOT NULL AND bids != '[]'", leagueIDUint, userID).Find(&teamConstructorsWithOffers)

		for _, tcb := range teamConstructorsWithOffers {
			var team models.TeamConstructor
			if err := database.DB.First(&team, tcb.TeamConstructorID).Error; err != nil {
				continue
			}

			var bids []Bid
			if len(tcb.Bids) > 0 {
				json.Unmarshal(tcb.Bids, &bids)
			}

			for _, bid := range bids {
				var bidderPlayer models.Player
				if err := database.DB.First(&bidderPlayer, bid.PlayerID).Error; err != nil {
					continue
				}

				offer := map[string]interface{}{
					"id":          tcb.ID,
					"type":        "team_constructor",
					"name":        team.Name,
					"team":        team.Name,
					"image_url":   team.ImageURL,
					"bidder_id":   bid.PlayerID,
					"bidder_name": bidderPlayer.Name,
					"offer_value": bid.Valor,
					"received_at": time.Now(),
				}
				receivedOffers = append(receivedOffers, offer)
			}
		}

		c.JSON(200, gin.H{"offers": receivedOffers})
	})

	// Endpoint para aceptar o rechazar una oferta
	router.POST("/api/offer/respond", authMiddleware(), func(c *gin.Context) {
		var req struct {
			ItemType   string  `json:"item_type"`
			ItemID     uint    `json:"item_id"`
			LeagueID   uint    `json:"league_id"`
			BidderID   uint    `json:"bidder_id"`
			OfferValue float64 `json:"offer_value"`
			Action     string  `json:"action"` // "accept" o "reject"
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		userID := c.GetUint("user_id")

		// Verificar que el usuario es el propietario del elemento
		var isOwner bool
		switch req.ItemType {
		case "pilot":
			var pbl models.PilotByLeague
			if err := database.DB.First(&pbl, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Elemento no encontrado"})
				return
			}
			isOwner = pbl.OwnerID == userID
		case "track_engineer":
			var teb models.TrackEngineerByLeague
			if err := database.DB.First(&teb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Elemento no encontrado"})
				return
			}
			isOwner = teb.OwnerID == userID
		case "chief_engineer":
			var ceb models.ChiefEngineerByLeague
			if err := database.DB.First(&ceb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Elemento no encontrado"})
				return
			}
			isOwner = ceb.OwnerID == userID
		case "team_constructor":
			var tcb models.TeamConstructorByLeague
			if err := database.DB.First(&tcb, req.ItemID).Error; err != nil {
				c.JSON(404, gin.H{"error": "Elemento no encontrado"})
				return
			}
			isOwner = tcb.OwnerID == userID
		default:
			c.JSON(400, gin.H{"error": "Tipo de elemento no válido"})
			return
		}

		if !isOwner {
			c.JSON(403, gin.H{"error": "No eres el propietario de este elemento"})
			return
		}

		if req.Action == "accept" {
			// Verificar que el comprador tiene suficiente dinero
			var bidderLeague models.PlayerByLeague
			if err := database.DB.Where("player_id = ? AND league_id = ?", req.BidderID, req.LeagueID).First(&bidderLeague).Error; err != nil {
				c.JSON(404, gin.H{"error": "Comprador no encontrado"})
				return
			}

			if bidderLeague.Money < req.OfferValue {
				c.JSON(400, gin.H{"error": "El comprador no tiene suficiente dinero"})
				return
			}

			// Transferir propiedad y dinero
			switch req.ItemType {
			case "pilot":
				var pbl models.PilotByLeague
				database.DB.First(&pbl, req.ItemID)
				pbl.OwnerID = req.BidderID
				// Limpiar ofertas, cláusulas y ofertas de la FIA
				pbl.Bids = []byte("[]")
				pbl.Venta = nil
				pbl.VentaExpiresAt = nil
				pbl.LeagueOfferValue = nil
				pbl.LeagueOfferExpiresAt = nil
				pbl.ClausulaValue = nil
				pbl.Clausulatime = nil
				database.DB.Save(&pbl)
			case "track_engineer":
				var teb models.TrackEngineerByLeague
				database.DB.First(&teb, req.ItemID)
				teb.OwnerID = req.BidderID
				teb.Bids = []byte("[]")
				teb.Venta = nil
				teb.VentaExpiresAt = nil
				teb.LeagueOfferValue = nil
				teb.LeagueOfferExpiresAt = nil
				teb.ClausulaValue = nil
				teb.Clausulatime = nil
				database.DB.Save(&teb)
			case "chief_engineer":
				var ceb models.ChiefEngineerByLeague
				database.DB.First(&ceb, req.ItemID)
				ceb.OwnerID = req.BidderID
				ceb.Bids = []byte("[]")
				ceb.Venta = nil
				ceb.VentaExpiresAt = nil
				ceb.LeagueOfferValue = nil
				ceb.LeagueOfferExpiresAt = nil
				ceb.ClausulaValue = nil
				ceb.Clausulatime = nil
				database.DB.Save(&ceb)
			case "team_constructor":
				var tcb models.TeamConstructorByLeague
				database.DB.First(&tcb, req.ItemID)
				tcb.OwnerID = req.BidderID
				tcb.Bids = []byte("[]")
				tcb.Venta = nil
				tcb.VentaExpiresAt = nil
				tcb.LeagueOfferValue = nil
				tcb.LeagueOfferExpiresAt = nil
				tcb.ClausulaValue = nil
				tcb.Clausulatime = nil
				database.DB.Save(&tcb)
			}

			// Actualizar dinero
			bidderLeague.Money -= req.OfferValue
			database.DB.Save(&bidderLeague)

			var ownerLeague models.PlayerByLeague
			database.DB.Where("player_id = ? AND league_id = ?", userID, req.LeagueID).First(&ownerLeague)
			ownerLeague.Money += req.OfferValue
			database.DB.Save(&ownerLeague)

			c.JSON(200, gin.H{"message": "Oferta aceptada correctamente"})
		} else if req.Action == "reject" {
			// Solo limpiar la oferta específica del array de bids
			switch req.ItemType {
			case "pilot":
				var pbl models.PilotByLeague
				database.DB.First(&pbl, req.ItemID)
				var bids []Bid
				if len(pbl.Bids) > 0 {
					json.Unmarshal(pbl.Bids, &bids)
				}
				// Remover la oferta específica
				var newBids []Bid
				for _, bid := range bids {
					if !(bid.PlayerID == req.BidderID && bid.Valor == req.OfferValue) {
						newBids = append(newBids, bid)
					}
				}
				bidsJSON, _ := json.Marshal(newBids)
				pbl.Bids = bidsJSON
				database.DB.Save(&pbl)
			case "track_engineer":
				var teb models.TrackEngineerByLeague
				database.DB.First(&teb, req.ItemID)
				var bids []Bid
				if len(teb.Bids) > 0 {
					json.Unmarshal(teb.Bids, &bids)
				}
				var newBids []Bid
				for _, bid := range bids {
					if !(bid.PlayerID == req.BidderID && bid.Valor == req.OfferValue) {
						newBids = append(newBids, bid)
					}
				}
				bidsJSON, _ := json.Marshal(newBids)
				teb.Bids = bidsJSON
				database.DB.Save(&teb)
			case "chief_engineer":
				var ceb models.ChiefEngineerByLeague
				database.DB.First(&ceb, req.ItemID)
				var bids []Bid
				if len(ceb.Bids) > 0 {
					json.Unmarshal(ceb.Bids, &bids)
				}
				var newBids []Bid
				for _, bid := range bids {
					if !(bid.PlayerID == req.BidderID && bid.Valor == req.OfferValue) {
						newBids = append(newBids, bid)
					}
				}
				bidsJSON, _ := json.Marshal(newBids)
				ceb.Bids = bidsJSON
				database.DB.Save(&ceb)
			case "team_constructor":
				var tcb models.TeamConstructorByLeague
				database.DB.First(&tcb, req.ItemID)
				var bids []Bid
				if len(tcb.Bids) > 0 {
					json.Unmarshal(tcb.Bids, &bids)
				}
				var newBids []Bid
				for _, bid := range bids {
					if !(bid.PlayerID == req.BidderID && bid.Valor == req.OfferValue) {
						newBids = append(newBids, bid)
					}
				}
				bidsJSON, _ := json.Marshal(newBids)
				tcb.Bids = bidsJSON
				database.DB.Save(&tcb)
			}

			c.JSON(200, gin.H{"message": "Oferta rechazada correctamente"})
		} else {
			c.JSON(400, gin.H{"error": "Acción no válida"})
		}
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Servidor iniciado en puerto %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Error iniciando servidor: ", err)
	}
}

const FIA_PLAYER_ID = 999999 // ID especial para la FIA

// Función para generar oferta de la FIA (entre 90% y 110% del valor de venta)
func generateFIAOffer(saleValue float64) float64 {
	// Generar un valor aleatorio entre 0.9 y 1.1 (90% a 110%)
	multiplier := 0.9 + rand.Float64()*0.2
	result := saleValue * multiplier
	// NO redondear para mantener valores aleatorios más naturales
	return result
}

// Función para calcular puntos de posición de equipos (1º=10, 2º=9, ..., 10º=1)
func getTeamPositionPoints(position int) int {
	if position < 1 || position > 10 {
		return 0
	}
	// 1º = 10 pts, 2º = 9 pts, ..., 10º = 1 pt
	return 11 - position
}

// Función para actualizar puntos de jugadores que tengan un piloto alineado
func updatePlayerPointsForPilot(pilotID uint, gpIndex uint64, points int, sessionType string) {
	// Buscar todas las alineaciones que incluyan este piloto en este GP
	var lineups []models.Lineup
	database.DB.Where("gp_index = ?", gpIndex).Find(&lineups)

	for _, lineup := range lineups {
		var pilots []uint

		// Determinar qué array de pilotos revisar según el tipo de sesión
		switch sessionType {
		case "race":
			if len(lineup.RacePilots) > 0 {
				json.Unmarshal(lineup.RacePilots, &pilots)
			}
		case "qualy":
			if len(lineup.QualifyingPilots) > 0 {
				json.Unmarshal(lineup.QualifyingPilots, &pilots)
			}
		case "practice":
			if len(lineup.PracticePilots) > 0 {
				json.Unmarshal(lineup.PracticePilots, &pilots)
			}
		}

		// Verificar si el piloto está en esta alineación
		for _, pilotByLeagueID := range pilots {
			var pilotByLeague models.PilotByLeague
			if err := database.DB.First(&pilotByLeague, pilotByLeagueID).Error; err == nil {
				if pilotByLeague.PilotID == pilotID {
					// Este jugador tiene el piloto alineado, actualizar sus puntos
					updatePlayerTotalPoints(lineup.PlayerID, lineup.LeagueID, gpIndex, points)
					break
				}
			}
		}
	}
}

// Función para calcular puntos totales de un jugador en un GP específico
func calculatePlayerTotalPoints(playerID uint, leagueID uint64, gpIndex uint64) int {
	// Buscar la alineación del jugador para el GP actual
	var lineup models.Lineup
	if err := database.DB.Where("player_id = ? AND league_id = ? AND gp_index = ?", playerID, leagueID, gpIndex).First(&lineup).Error; err != nil {
		log.Printf("No se encontró alineación para player_id=%d, league_id=%d, gp_index=%d", playerID, leagueID, gpIndex)
		return 0
	}

	log.Printf("[DEBUG-POINTS] === CALCULANDO PUNTOS PARA PLAYER %d EN GP %d ===", playerID, gpIndex)
	totalPoints := 0

	// Calcular puntos de pilotos de carrera
	var racePilots []uint
	racePilotPoints := 0
	if len(lineup.RacePilots) > 0 {
		json.Unmarshal(lineup.RacePilots, &racePilots)
		for i, pilotByLeagueID := range racePilots {
			points := getPilotPoints(pilotByLeagueID, gpIndex)
			racePilotPoints += points
			log.Printf("[DEBUG-POINTS] Piloto Carrera %d (ID: %d): %d puntos", i+1, pilotByLeagueID, points)
		}
	}
	totalPoints += racePilotPoints
	log.Printf("[DEBUG-POINTS] Total Pilotos Carrera: %d", racePilotPoints)

	// Calcular puntos de pilotos de clasificación
	var qualifyingPilots []uint
	qualifyingPilotPoints := 0
	if len(lineup.QualifyingPilots) > 0 {
		json.Unmarshal(lineup.QualifyingPilots, &qualifyingPilots)
		for i, pilotByLeagueID := range qualifyingPilots {
			points := getPilotPoints(pilotByLeagueID, gpIndex)
			qualifyingPilotPoints += points
			log.Printf("[DEBUG-POINTS] Piloto Qualy %d (ID: %d): %d puntos", i+1, pilotByLeagueID, points)
		}
	}
	totalPoints += qualifyingPilotPoints
	log.Printf("[DEBUG-POINTS] Total Pilotos Qualy: %d", qualifyingPilotPoints)

	// Calcular puntos de pilotos de práctica
	var practicePilots []uint
	practicePilotPoints := 0
	if len(lineup.PracticePilots) > 0 {
		json.Unmarshal(lineup.PracticePilots, &practicePilots)
		for i, pilotByLeagueID := range practicePilots {
			points := getPilotPoints(pilotByLeagueID, gpIndex)
			practicePilotPoints += points
			log.Printf("[DEBUG-POINTS] Piloto Practice %d (ID: %d): %d puntos", i+1, pilotByLeagueID, points)
		}
	}
	totalPoints += practicePilotPoints
	log.Printf("[DEBUG-POINTS] Total Pilotos Practice: %d", practicePilotPoints)

	// Calcular puntos del constructor
	constructorPoints := 0
	if lineup.TeamConstructorID != nil {
		constructorPoints = getTeamConstructorPoints(*lineup.TeamConstructorID, gpIndex)
		totalPoints += constructorPoints
		log.Printf("[DEBUG-POINTS] Constructor (ID: %d): %d puntos", *lineup.TeamConstructorID, constructorPoints)
	}

	// Calcular puntos del chief engineer
	chiefEngineerPoints := 0
	if lineup.ChiefEngineerID != nil {
		chiefEngineerPoints = getChiefEngineerPoints(*lineup.ChiefEngineerID, gpIndex)
		totalPoints += chiefEngineerPoints
		log.Printf("[DEBUG-POINTS] Chief Engineer (ID: %d): %d puntos", *lineup.ChiefEngineerID, chiefEngineerPoints)
	}

	// Calcular puntos de track engineers
	var trackEngineers []uint
	trackEngineerPoints := 0
	if len(lineup.TrackEngineers) > 0 {
		json.Unmarshal(lineup.TrackEngineers, &trackEngineers)
		for i, trackEngineerByLeagueID := range trackEngineers {
			points := getTrackEngineerPointsWithLineup(trackEngineerByLeagueID, gpIndex, lineup)
			trackEngineerPoints += points
			log.Printf("[DEBUG-POINTS] Track Engineer %d (ID: %d): %d puntos", i+1, trackEngineerByLeagueID, points)
		}
	}
	totalPoints += trackEngineerPoints
	log.Printf("[DEBUG-POINTS] Total Track Engineers: %d", trackEngineerPoints)

	log.Printf("[DEBUG-POINTS] TOTAL FINAL: %d", totalPoints)
	log.Printf("[DEBUG-POINTS] DESGLOSE: Race(%d) + Qualy(%d) + Practice(%d) + Constructor(%d) + ChiefEng(%d) + TrackEng(%d) = %d",
		racePilotPoints, qualifyingPilotPoints, practicePilotPoints, constructorPoints, chiefEngineerPoints, trackEngineerPoints, totalPoints)
	return totalPoints
}

// Función auxiliar para obtener puntos de un piloto
func getPilotPoints(pilotByLeagueID uint, gpIndex uint64) int {
	var pilotByLeague models.PilotByLeague
	if err := database.DB.First(&pilotByLeague, pilotByLeagueID).Error; err != nil {
		return 0
	}

	var pilot models.Pilot
	if err := database.DB.First(&pilot, pilotByLeague.PilotID).Error; err != nil {
		return 0
	}

	// Determinar la tabla según el modo del piloto
	var table string
	switch pilot.Mode {
	case "race", "R":
		table = "pilot_races"
	case "qualy", "Q":
		table = "pilot_qualies"
	case "practice", "P":
		table = "pilot_practices"
	default:
		return 0
	}

	// Obtener puntos de la tabla correspondiente
	var result map[string]interface{}
	if err := database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", pilot.ID, gpIndex).Take(&result).Error; err != nil {
		return 0
	}

	points := 0
	finishPosition := 0

	// Obtener puntos base (delta + bonificaciones)
	if pointsRaw := result["points"]; pointsRaw != nil {
		if pointsVal, ok := pointsRaw.(float64); ok {
			points = int(pointsVal)
		} else if pointsVal, ok := pointsRaw.(int); ok {
			points = pointsVal
		} else if pointsVal, ok := pointsRaw.(int64); ok {
			points = int(pointsVal)
		}
	}

	// Obtener posición final
	if finishPosRaw := result["finish_position"]; finishPosRaw != nil {
		if finishPosVal, ok := finishPosRaw.(float64); ok {
			finishPosition = int(finishPosVal)
		} else if finishPosVal, ok := finishPosRaw.(int); ok {
			finishPosition = finishPosVal
		} else if finishPosVal, ok := finishPosRaw.(int64); ok {
			finishPosition = int(finishPosVal)
		}
	}

	// Los puntos por posición ya están incluidos en el campo Points desde los endpoints
	// Solo mostrar información para debugging
	positionPoints := getPositionPoints(pilot.Mode, finishPosition)

	log.Printf("[PILOT-POINTS] Piloto %s (Mode: %s, Pos: %d): Total=%d (incluye posición=%d)",
		pilot.DriverName, pilot.Mode, finishPosition, points, positionPoints)

	return points
}

// Función para obtener puntos por posición final
func getPositionPoints(mode string, position int) int {
	if position < 1 {
		return 0
	}

	switch mode {
	case "race", "R":
		// 25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
		if position <= 10 {
			racePoints := []int{25, 18, 15, 12, 10, 8, 6, 4, 2, 1}
			return racePoints[position-1]
		}
		return 0 // Posiciones 11+ no dan puntos
	case "qualy", "Q":
		// 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
		if position <= 10 {
			qualyPoints := []int{10, 9, 8, 7, 6, 5, 4, 3, 2, 1}
			return qualyPoints[position-1]
		}
		return 0 // Posiciones 11+ no dan puntos
	case "practice", "P":
		// 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
		if position <= 10 {
			practicePoints := []int{5, 5, 4, 4, 3, 3, 2, 2, 1, 1}
			return practicePoints[position-1]
		}
		return 0 // Posiciones 11+ no dan puntos
	default:
		return 0
	}
}

// Función auxiliar para obtener puntos de un constructor
func getTeamConstructorPoints(teamConstructorByLeagueID uint, gpIndex uint64) int {
	var teamConstructorByLeague models.TeamConstructorByLeague
	if err := database.DB.First(&teamConstructorByLeague, teamConstructorByLeagueID).Error; err != nil {
		return 0
	}

	// Obtener puntos de la tabla team_races basándose en el team constructor
	var result map[string]interface{}
	if err := database.DB.Table("team_races").Where("teamconstructor_id = ? AND gp_index = ?", teamConstructorByLeague.TeamConstructorID, gpIndex).Take(&result).Error; err != nil {
		log.Printf("[TEAM-CONSTRUCTOR-POINTS] No se encontraron datos en team_races para team constructor %d en GP %d", teamConstructorByLeague.TeamConstructorID, gpIndex)
		return 0
	}

	points := 0
	if pointsRaw := result["points"]; pointsRaw != nil {
		if pointsVal, ok := pointsRaw.(float64); ok {
			points = int(pointsVal)
		} else if pointsVal, ok := pointsRaw.(int); ok {
			points = pointsVal
		} else if pointsVal, ok := pointsRaw.(int64); ok {
			points = int(pointsVal)
		}
	}

	log.Printf("[TEAM-CONSTRUCTOR-POINTS] Team Constructor ID %d - Puntos: %d", teamConstructorByLeague.TeamConstructorID, points)

	return points
}

// Función auxiliar para obtener puntos de un chief engineer
func getChiefEngineerPoints(chiefEngineerByLeagueID uint, gpIndex uint64) int {
	var chiefEngineerByLeague models.ChiefEngineerByLeague
	if err := database.DB.First(&chiefEngineerByLeague, chiefEngineerByLeagueID).Error; err != nil {
		return 0
	}

	// Obtener el chief engineer para conocer su equipo
	var chiefEngineer models.ChiefEngineer
	if err := database.DB.First(&chiefEngineer, chiefEngineerByLeague.ChiefEngineerID).Error; err != nil {
		return 0
	}

	// Buscar el team constructor correspondiente al equipo del chief engineer
	var teamConstructor models.TeamConstructor
	if err := database.DB.Where("name = ? AND gp_index = ?", chiefEngineer.Team, gpIndex).First(&teamConstructor).Error; err != nil {
		log.Printf("[CHIEF-ENGINEER-POINTS] No se encontró team constructor para equipo %s en GP %d", chiefEngineer.Team, gpIndex)
		return 0
	}

	// Obtener puntos de la tabla team_races basándose en el team constructor
	var result map[string]interface{}
	if err := database.DB.Table("team_races").Where("teamconstructor_id = ? AND gp_index = ?", teamConstructor.ID, gpIndex).Take(&result).Error; err != nil {
		log.Printf("[CHIEF-ENGINEER-POINTS] No se encontraron datos en team_races para team constructor %d en GP %d", teamConstructor.ID, gpIndex)
		return 0
	}

	points := 0
	if pointsRaw := result["points"]; pointsRaw != nil {
		if pointsVal, ok := pointsRaw.(float64); ok {
			points = int(pointsVal)
		} else if pointsVal, ok := pointsRaw.(int); ok {
			points = pointsVal
		} else if pointsVal, ok := pointsRaw.(int64); ok {
			points = int(pointsVal)
		}
	}

	log.Printf("[CHIEF-ENGINEER-POINTS] Chief Engineer %s (Team: %s) - Team Constructor ID: %d - Puntos: %d",
		chiefEngineer.Name, chiefEngineer.Team, teamConstructor.ID, points)

	return points
}

// Función auxiliar para obtener puntos de un track engineer (versión original)
func getTrackEngineerPoints(trackEngineerByLeagueID uint, gpIndex uint64) int {
	var trackEngineerByLeague models.TrackEngineerByLeague
	if err := database.DB.First(&trackEngineerByLeague, trackEngineerByLeagueID).Error; err != nil {
		return 0
	}

	// Sumar puntos de todas las sesiones (race, qualy, practice) para este GP
	var totalPoints int
	database.DB.Model(&models.TrackEngineerPoints{}).
		Where("track_engineer_id = ? AND gp_index = ?", trackEngineerByLeague.TrackEngineerID, gpIndex).
		Select("COALESCE(SUM(total_points), 0)").
		Scan(&totalPoints)

	return totalPoints
}

// Función auxiliar para obtener puntos de un track engineer verificando si el jugador tiene el piloto asociado
func getTrackEngineerPointsWithLineup(trackEngineerByLeagueID uint, gpIndex uint64, lineup models.Lineup) int {
	var trackEngineerByLeague models.TrackEngineerByLeague
	if err := database.DB.First(&trackEngineerByLeague, trackEngineerByLeagueID).Error; err != nil {
		return 0
	}

	// Obtener el track engineer para saber qué piloto está asociado
	var trackEngineer models.TrackEngineer
	if err := database.DB.First(&trackEngineer, trackEngineerByLeague.TrackEngineerID).Error; err != nil {
		return 0
	}

	// Buscar qué piloto tiene este track engineer asignado
	var associatedPilots []models.Pilot
	database.DB.Where("track_engineer_id = ?", trackEngineer.ID).Find(&associatedPilots)

	if len(associatedPilots) == 0 {
		log.Printf("[TRACK-ENG-POINTS] No hay pilotos asociados al track engineer %d", trackEngineer.ID)
		return 0
	}

	// Obtener los pilotos que tiene el jugador en su lineup
	var racePilots []uint
	var qualifyingPilots []uint
	var practicePilots []uint

	if len(lineup.RacePilots) > 0 {
		json.Unmarshal(lineup.RacePilots, &racePilots)
	}
	if len(lineup.QualifyingPilots) > 0 {
		json.Unmarshal(lineup.QualifyingPilots, &qualifyingPilots)
	}
	if len(lineup.PracticePilots) > 0 {
		json.Unmarshal(lineup.PracticePilots, &practicePilots)
	}

	// Obtener los PilotByLeague IDs para cada piloto asociado al track engineer
	var associatedPilotByLeagueIDs []uint
	for _, pilot := range associatedPilots {
		var pilotByLeague models.PilotByLeague
		if err := database.DB.Where("pilot_id = ? AND league_id = ?", pilot.ID, lineup.LeagueID).First(&pilotByLeague).Error; err == nil {
			associatedPilotByLeagueIDs = append(associatedPilotByLeagueIDs, pilotByLeague.ID)
		}
	}

	// Verificar si el jugador tiene alguno de los pilotos asociados en algún modo
	totalPoints := 0
	hasRacePilot := false
	hasQualyPilot := false
	hasPracticePilot := false

	for _, pilotByLeagueID := range associatedPilotByLeagueIDs {
		// Verificar si está en race
		for _, racePilotID := range racePilots {
			if racePilotID == pilotByLeagueID {
				hasRacePilot = true
				break
			}
		}
		// Verificar si está en qualifying
		for _, qualyPilotID := range qualifyingPilots {
			if qualyPilotID == pilotByLeagueID {
				hasQualyPilot = true
				break
			}
		}
		// Verificar si está en practice
		for _, practicePilotID := range practicePilots {
			if practicePilotID == pilotByLeagueID {
				hasPracticePilot = true
				break
			}
		}
	}

	// Sumar puntos solo de las sesiones donde el jugador tiene el piloto
	if hasRacePilot {
		var racePoints int
		database.DB.Model(&models.TrackEngineerPoints{}).
			Where("track_engineer_id = ? AND gp_index = ? AND session_type = ?", trackEngineer.ID, gpIndex, "race").
			Select("COALESCE(SUM(total_points), 0)").
			Scan(&racePoints)
		totalPoints += racePoints
		log.Printf("[TRACK-ENG-POINTS] Track Engineer %d tiene piloto en RACE: +%d puntos", trackEngineer.ID, racePoints)
	}

	if hasQualyPilot {
		var qualyPoints int
		database.DB.Model(&models.TrackEngineerPoints{}).
			Where("track_engineer_id = ? AND gp_index = ? AND session_type = ?", trackEngineer.ID, gpIndex, "qualy").
			Select("COALESCE(SUM(total_points), 0)").
			Scan(&qualyPoints)
		totalPoints += qualyPoints
		log.Printf("[TRACK-ENG-POINTS] Track Engineer %d tiene piloto en QUALY: +%d puntos", trackEngineer.ID, qualyPoints)
	}

	if hasPracticePilot {
		var practicePoints int
		database.DB.Model(&models.TrackEngineerPoints{}).
			Where("track_engineer_id = ? AND gp_index = ? AND session_type = ?", trackEngineer.ID, gpIndex, "practice").
			Select("COALESCE(SUM(total_points), 0)").
			Scan(&practicePoints)
		totalPoints += practicePoints
		log.Printf("[TRACK-ENG-POINTS] Track Engineer %d tiene piloto en PRACTICE: +%d puntos", trackEngineer.ID, practicePoints)
	}

	if !hasRacePilot && !hasQualyPilot && !hasPracticePilot {
		log.Printf("[TRACK-ENG-POINTS] Track Engineer %d: jugador no tiene ningún piloto asociado, 0 puntos", trackEngineer.ID)
	}

	return totalPoints
}

// Función para calcular automáticamente puntos de track engineers cuando se guarda un resultado de piloto
func calculateTrackEngineerPointsForPilot(pilotID uint, gpIndex uint64, mode string) {
	log.Printf("[AUTO-TRACK-ENG] Iniciando cálculo para piloto %d, GP %d, mode %s", pilotID, gpIndex, mode)

	// 1. Obtener el track engineer asignado a este piloto
	// Primero buscar el piloto para obtener su track_engineer_id
	var pilot models.Pilot
	if err := database.DB.First(&pilot, pilotID).Error; err != nil {
		log.Printf("[AUTO-TRACK-ENG] Error obteniendo información del piloto %d: %v", pilotID, err)
		return
	}

	// Verificar que el piloto tenga un track engineer asignado
	if pilot.TrackEngineerID == 0 {
		log.Printf("[AUTO-TRACK-ENG] No hay track engineer asignado al piloto %d", pilotID)
		return
	}

	var trackEngineer models.TrackEngineer
	if err := database.DB.First(&trackEngineer, pilot.TrackEngineerID).Error; err != nil {
		log.Printf("[AUTO-TRACK-ENG] Track engineer %d no encontrado: %v", pilot.TrackEngineerID, err)
		return
	}

	log.Printf("[AUTO-TRACK-ENG] Track Engineer encontrado: ID=%d, Name=%s", trackEngineer.ID, trackEngineer.Name)

	// 2. Obtener los puntos del piloto
	var table string
	switch mode {
	case "race":
		table = "pilot_races"
	case "qualy":
		table = "pilot_qualies"
	case "practice":
		table = "pilot_practices"
	default:
		log.Printf("[AUTO-TRACK-ENG] Modo inválido: %s", mode)
		return
	}

	var pilotResult map[string]interface{}
	if err := database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).Take(&pilotResult).Error; err != nil {
		log.Printf("[AUTO-TRACK-ENG] No se encontraron resultados del piloto %d en %s: %v", pilotID, table, err)
		return
	}

	pilotPoints := 0
	if points, ok := pilotResult["points"].(float64); ok {
		pilotPoints = int(points)
	}

	// Obtener posición final para comparar con compañero
	finishPos := 0
	if fin, ok := pilotResult["finish_position"].(float64); ok {
		finishPos = int(fin)
	}

	// 3. Buscar compañero de equipo y calcular multiplicador
	var teammate models.Pilot
	modeCode := map[string]string{"race": "R", "qualy": "Q", "practice": "P"}[mode]
	if err := database.DB.Where("team = ? AND mode = ? AND id != ?", pilot.Team, modeCode, pilotID).First(&teammate).Error; err != nil {
		log.Printf("[AUTO-TRACK-ENG] No se encontró compañero de equipo para piloto %d: %v", pilotID, err)
		return
	}

	var teammateResult map[string]interface{}
	database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", teammate.ID, gpIndex).Take(&teammateResult)

	// 4. Calcular multiplicador según las reglas correctas
	multiplier := 0.2 // Default: detrás del compañero
	teammatePos := 0
	if teammateResult != nil {
		if teammateFinish, ok := teammateResult["finish_position"].(float64); ok {
			teammatePos = int(teammateFinish)
			if finishPos > 0 && teammatePos > 0 {
				if finishPos < teammatePos {
					// Piloto acabó DELANTE del compañero: ×0.5
					multiplier = 0.5
				} else {
					// Piloto acabó DETRÁS del compañero: ×0.2
					multiplier = 0.2
				}
			}
		}
	}

	// 5. Calcular puntos del Track Engineer
	var trackEngineerPoints int
	if pilotPoints < 0 {
		// Si los puntos son negativos, SIEMPRE usar valor absoluto × 0.2 (independiente del multiplicador)
		result := float64(-pilotPoints) * 0.2
		trackEngineerPoints = int(math.Ceil(result))
	} else {
		// Si los puntos son positivos, usar multiplicador normal y redondear hacia arriba
		result := float64(pilotPoints) * multiplier
		trackEngineerPoints = int(math.Ceil(result))
	}

	log.Printf("[AUTO-TRACK-ENG] Piloto: %d pts | Pos: %d | Compañero Pos: %d | Multiplicador: ×%.1f | Track Engineer: %d pts",
		pilotPoints, finishPos, teammatePos, multiplier, trackEngineerPoints)

	// 5.1 También calcular puntos del track engineer del compañero si tiene uno
	if teammateResult != nil && teammatePos > 0 {
		// Verificar si el compañero tiene track engineer
		if teammate.TrackEngineerID != 0 {
			var teammateTrackEngineer models.TrackEngineer
			if err := database.DB.First(&teammateTrackEngineer, teammate.TrackEngineerID).Error; err == nil {
				// Obtener puntos del compañero
				teammatePoints := 0
				if points, ok := teammateResult["points"].(float64); ok {
					teammatePoints = int(points)
				}

				// Calcular multiplicador del compañero (inverso del piloto original)
				teammateMultiplier := 0.2 // Default: detrás
				if teammatePos < finishPos {
					// Compañero acabó DELANTE del piloto original: ×0.5
					teammateMultiplier = 0.5
				} else {
					// Compañero acabó DETRÁS del piloto original: ×0.2
					teammateMultiplier = 0.2
				}

				// Calcular puntos del track engineer del compañero con redondeo hacia arriba
				var teammateTrackEngineerPoints int
				if teammatePoints < 0 {
					// Si los puntos son negativos, SIEMPRE usar valor absoluto × 0.2
					result := float64(-teammatePoints) * 0.2
					teammateTrackEngineerPoints = int(math.Ceil(result))
				} else {
					// Si los puntos son positivos, usar multiplicador normal y redondear hacia arriba
					result := float64(teammatePoints) * teammateMultiplier
					teammateTrackEngineerPoints = int(math.Ceil(result))
				}

				log.Printf("[AUTO-TRACK-ENG] Compañero: %d pts | Pos: %d | Multiplicador: ×%.1f | Track Engineer: %d pts",
					teammatePoints, teammatePos, teammateMultiplier, teammateTrackEngineerPoints)

				// Guardar puntos del track engineer del compañero
				var teammateRecord models.TrackEngineerPoints
				err := database.DB.Where("track_engineer_id = ? AND gp_index = ? AND session_type = ?",
					teammateTrackEngineer.ID, gpIndex, mode).First(&teammateRecord).Error

				if err != nil {
					// No existe, crear nuevo registro para el compañero
					newTeammateRecord := models.TrackEngineerPoints{
						TrackEngineerID:  teammateTrackEngineer.ID,
						GPIndex:          gpIndex,
						PilotID:          &teammate.ID,
						PilotPosition:    &teammatePos,
						TeammatePosition: &finishPos,
						SessionType:      mode,
						Multiplier:       teammateMultiplier,
						BasePoints:       teammatePoints,
						TotalPoints:      teammateTrackEngineerPoints,
					}

					if err := database.DB.Create(&newTeammateRecord).Error; err != nil {
						log.Printf("[AUTO-TRACK-ENG] Error creando registro del compañero: %v", err)
					} else {
						log.Printf("[AUTO-TRACK-ENG] ✅ Creado registro para Track Engineer del compañero %d, GP %d: %d pts", teammateTrackEngineer.ID, gpIndex, teammateTrackEngineerPoints)
					}
				} else {
					// Existe, actualizar registro del compañero
					teammateRecord.PilotID = &teammate.ID
					teammateRecord.PilotPosition = &teammatePos
					teammateRecord.TeammatePosition = &finishPos
					teammateRecord.Multiplier = teammateMultiplier
					teammateRecord.BasePoints = teammatePoints
					teammateRecord.TotalPoints = teammateTrackEngineerPoints

					if err := database.DB.Save(&teammateRecord).Error; err != nil {
						log.Printf("[AUTO-TRACK-ENG] Error actualizando registro del compañero: %v", err)
					} else {
						log.Printf("[AUTO-TRACK-ENG] ✅ Actualizado registro para Track Engineer del compañero %d, GP %d: %d pts", teammateTrackEngineer.ID, gpIndex, teammateTrackEngineerPoints)
					}
				}
			}
		}
	}

	// 6. Guardar los puntos en la tabla track_engineer_points
	var existingRecord models.TrackEngineerPoints
	err := database.DB.Where("track_engineer_id = ? AND gp_index = ? AND session_type = ?",
		trackEngineer.ID, gpIndex, mode).First(&existingRecord).Error

	if err != nil {
		// No existe, crear nuevo registro
		newRecord := models.TrackEngineerPoints{
			TrackEngineerID: trackEngineer.ID,
			GPIndex:         gpIndex,
			PilotID:         &pilotID,
			PilotPosition:   &finishPos,
			TeammatePosition: func() *int {
				if teammatePos > 0 {
					return &teammatePos
				}
				return nil
			}(),
			SessionType: mode,
			Multiplier:  multiplier,
			BasePoints:  pilotPoints,
			TotalPoints: trackEngineerPoints,
		}

		if err := database.DB.Create(&newRecord).Error; err != nil {
			log.Printf("[AUTO-TRACK-ENG] Error creando registro: %v", err)
		} else {
			log.Printf("[AUTO-TRACK-ENG] ✅ Creado registro para Track Engineer %d, GP %d: %d pts", trackEngineer.ID, gpIndex, trackEngineerPoints)
		}
	} else {
		// Existe, actualizar
		existingRecord.PilotID = &pilotID
		existingRecord.PilotPosition = &finishPos
		if teammatePos > 0 {
			existingRecord.TeammatePosition = &teammatePos
		}
		existingRecord.Multiplier = multiplier
		existingRecord.BasePoints = pilotPoints
		existingRecord.TotalPoints = trackEngineerPoints

		if err := database.DB.Save(&existingRecord).Error; err != nil {
			log.Printf("[AUTO-TRACK-ENG] Error actualizando registro: %v", err)
		} else {
			log.Printf("[AUTO-TRACK-ENG] ✅ Actualizado registro para Track Engineer %d, GP %d: %d pts", trackEngineer.ID, gpIndex, trackEngineerPoints)
		}
	}
}

// Función para calcular puntos de track engineers manualmente desde el formulario
func calculateTrackEngineerPointsManually(trackEngineerID uint, pilotID uint, gpIndex uint64, mode string, teammateComparison string) {
	log.Printf("[MANUAL-TRACK-ENG] Calculando manualmente para track engineer %d, piloto %d, GP %d, mode %s, comparison %s",
		trackEngineerID, pilotID, gpIndex, mode, teammateComparison)

	// 1. Obtener los puntos del piloto
	var table string
	switch mode {
	case "race":
		table = "pilot_races"
	case "qualy":
		table = "pilot_qualies"
	case "practice":
		table = "pilot_practices"
	default:
		log.Printf("[MANUAL-TRACK-ENG] Modo inválido: %s", mode)
		return
	}

	var pilotResult map[string]interface{}
	if err := database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).Take(&pilotResult).Error; err != nil {
		log.Printf("[MANUAL-TRACK-ENG] No se encontraron resultados del piloto %d en %s: %v", pilotID, table, err)
		return
	}

	pilotPoints := 0
	if points, ok := pilotResult["points"].(float64); ok {
		pilotPoints = int(points)
	}

	// 2. Calcular multiplicador basado en la selección del formulario
	multiplier := 0.2 // Default: detrás
	if teammateComparison == "ahead" {
		multiplier = 0.5 // Delante del compañero
	} else {
		multiplier = 0.2 // Detrás del compañero
	}

	// 3. Calcular puntos base del Track Engineer (puntos del piloto × multiplicador)
	baseTrackEngineerPoints := int(float64(pilotPoints) * multiplier)

	// Los puntos finales son los mismos que los base en este caso
	trackEngineerPoints := baseTrackEngineerPoints

	log.Printf("[MANUAL-TRACK-ENG] Piloto: %d pts | Comparación: %s | Multiplicador: ×%.1f | Track Engineer: %d pts",
		pilotPoints, teammateComparison, multiplier, trackEngineerPoints)

	// 4. Guardar los puntos en la tabla track_engineer_points
	var existingRecord models.TrackEngineerPoints
	err := database.DB.Where("track_engineer_id = ? AND gp_index = ? AND session_type = ?",
		trackEngineerID, gpIndex, mode).First(&existingRecord).Error

	if err != nil {
		// No existe, crear nuevo registro
		newRecord := models.TrackEngineerPoints{
			TrackEngineerID:  trackEngineerID,
			GPIndex:          gpIndex,
			PilotID:          &pilotID,
			PilotPosition:    nil, // No tenemos posiciones exactas en el formulario manual
			TeammatePosition: nil,
			SessionType:      mode,
			Multiplier:       multiplier,
			BasePoints:       pilotPoints, // Puntos originales del piloto SIN multiplicar
			TotalPoints:      trackEngineerPoints,
		}

		if err := database.DB.Create(&newRecord).Error; err != nil {
			log.Printf("[MANUAL-TRACK-ENG] Error creando registro: %v", err)
		} else {
			log.Printf("[MANUAL-TRACK-ENG] ✅ Creado registro para Track Engineer %d, GP %d: %d pts", trackEngineerID, gpIndex, trackEngineerPoints)
		}
	} else {
		// Existe, actualizar
		existingRecord.PilotID = &pilotID
		existingRecord.Multiplier = multiplier
		existingRecord.BasePoints = pilotPoints // Puntos originales del piloto SIN multiplicar
		existingRecord.TotalPoints = trackEngineerPoints

		if err := database.DB.Save(&existingRecord).Error; err != nil {
			log.Printf("[MANUAL-TRACK-ENG] Error actualizando registro: %v", err)
		} else {
			log.Printf("[MANUAL-TRACK-ENG] ✅ Actualizado registro para Track Engineer %d, GP %d: %d pts", trackEngineerID, gpIndex, trackEngineerPoints)
		}
	}
}

// Función para calcular puntos de AMBOS track engineers manualmente desde el formulario
func calculateBothTrackEngineerPointsManually(pilotID uint, teammateID uint, gpIndex uint64, mode string, teammateComparison string) {
	log.Printf("[MANUAL-BOTH-TRACK-ENG] Calculando para ambos pilotos: %d y %d, GP %d, mode %s, comparison %s",
		pilotID, teammateID, gpIndex, mode, teammateComparison)

	// Obtener información de ambos pilotos
	var pilot, teammate models.Pilot
	database.DB.First(&pilot, pilotID)
	database.DB.First(&teammate, teammateID)

	// Verificar que ambos tengan track engineers
	if pilot.TrackEngineerID == 0 {
		log.Printf("[MANUAL-BOTH-TRACK-ENG] Piloto %d no tiene track engineer asignado", pilotID)
		return
	}
	if teammate.TrackEngineerID == 0 {
		log.Printf("[MANUAL-BOTH-TRACK-ENG] Compañero %d no tiene track engineer asignado", teammateID)
		return
	}

	// Determinar multiplicadores según la comparación
	var pilotMultiplier, teammateMultiplier float64
	if teammateComparison == "ahead" {
		// Piloto original quedó DELANTE
		pilotMultiplier = 0.5
		teammateMultiplier = 0.2
	} else {
		// Piloto original quedó DETRÁS
		pilotMultiplier = 0.2
		teammateMultiplier = 0.5
	}

	// Calcular puntos para AMBOS pilotos en el modo seleccionado únicamente
	log.Printf("[MANUAL-BOTH-TRACK-ENG] Procesando modo seleccionado: %s", mode)

	// Calcular puntos para el piloto original
	calculateSingleTrackEngineerPointsManually(pilot.TrackEngineerID, pilotID, gpIndex, mode, pilotMultiplier)

	// Calcular puntos para el compañero
	calculateSingleTrackEngineerPointsManually(teammate.TrackEngineerID, teammateID, gpIndex, mode, teammateMultiplier)
}

// Función para calcular puntos de un solo track engineer
func calculateSingleTrackEngineerPointsManually(trackEngineerID uint, pilotID uint, gpIndex uint64, mode string, multiplier float64) map[string]interface{} {
	// 1. Obtener los puntos del piloto desde la tabla correspondiente
	var table string
	switch mode {
	case "race":
		table = "pilot_races"
	case "qualy":
		table = "pilot_qualies"
	case "practice":
		table = "pilot_practices"
	default:
		log.Printf("[SINGLE-TRACK-ENG] Modo inválido: %s", mode)
		return nil
	}

	var pilotResult map[string]interface{}
	if err := database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).Take(&pilotResult).Error; err != nil {
		log.Printf("[SINGLE-TRACK-ENG] ⚠️  No se encontraron resultados del piloto %d en %s (GP %d): %v", pilotID, table, gpIndex, err)
		log.Printf("[SINGLE-TRACK-ENG] ⚠️  Saltando cálculo para este piloto y modo")
		return nil
	}

	pilotPoints := 0
	if points, ok := pilotResult["points"].(float64); ok {
		pilotPoints = int(points)
	} else if points, ok := pilotResult["points"].(int64); ok {
		pilotPoints = int(points)
	} else if points, ok := pilotResult["points"].(int); ok {
		pilotPoints = points
	}

	log.Printf("[SINGLE-TRACK-ENG] 🔍 Piloto %d en %s (GP %d): %d puntos encontrados", pilotID, table, gpIndex, pilotPoints)
	log.Printf("[SINGLE-TRACK-ENG] 📊 SQL ejecutado: SELECT * FROM %s WHERE pilot_id = %d AND gp_index = %d", table, pilotID, gpIndex)

	// 2. Calcular puntos base del Track Engineer
	var baseTrackEngineerPoints int

	if pilotPoints < 0 {
		// Si los puntos son negativos, SIEMPRE usar valor absoluto × 0.2 (independiente del multiplicador)
		result := float64(-pilotPoints) * 0.2
		baseTrackEngineerPoints = int(math.Ceil(result))
		log.Printf("[SINGLE-TRACK-ENG] 📊 Puntos negativos: %d → |%d| × 0.2 = %.2f → ceil = %d",
			pilotPoints, -pilotPoints, result, baseTrackEngineerPoints)
	} else {
		// Si los puntos son positivos, usar multiplicador normal (0.5 o 0.2) y redondear hacia arriba
		result := float64(pilotPoints) * multiplier
		baseTrackEngineerPoints = int(math.Ceil(result))
		log.Printf("[SINGLE-TRACK-ENG] 📊 Puntos positivos: %d × %.1f = %.2f → ceil = %d",
			pilotPoints, multiplier, result, baseTrackEngineerPoints)
	}

	trackEngineerPoints := baseTrackEngineerPoints

	log.Printf("[SINGLE-TRACK-ENG] 📊 Piloto %d: %d pts | Track Engineer %d: %d pts CALCULADOS",
		pilotID, pilotPoints, trackEngineerID, trackEngineerPoints)

	// 3. Guardar los puntos en la tabla track_engineer_points
	var existingRecord models.TrackEngineerPoints
	err := database.DB.Where("track_engineer_id = ? AND gp_index = ? AND session_type = ?",
		trackEngineerID, gpIndex, mode).First(&existingRecord).Error

	if err != nil {
		// No existe, crear nuevo registro
		newRecord := models.TrackEngineerPoints{
			TrackEngineerID:  trackEngineerID,
			GPIndex:          gpIndex,
			PilotID:          &pilotID,
			PilotPosition:    nil,
			TeammatePosition: nil,
			SessionType:      mode,
			Multiplier:       multiplier,
			BasePoints:       pilotPoints, // Puntos originales del piloto SIN multiplicar
			TotalPoints:      trackEngineerPoints,
		}

		if err := database.DB.Create(&newRecord).Error; err != nil {
			log.Printf("[SINGLE-TRACK-ENG] Error creando registro: %v", err)
		} else {
			log.Printf("[SINGLE-TRACK-ENG] ✅ Creado registro para Track Engineer %d, GP %d: %d pts", trackEngineerID, gpIndex, trackEngineerPoints)
		}
	} else {
		// Existe, actualizar
		existingRecord.PilotID = &pilotID
		existingRecord.Multiplier = multiplier
		existingRecord.BasePoints = pilotPoints // Puntos originales del piloto SIN multiplicar
		existingRecord.TotalPoints = trackEngineerPoints

		if err := database.DB.Save(&existingRecord).Error; err != nil {
			log.Printf("[SINGLE-TRACK-ENG] Error actualizando registro: %v", err)
		} else {
			log.Printf("[SINGLE-TRACK-ENG] ✅ Actualizado registro para Track Engineer %d, GP %d: %d pts", trackEngineerID, gpIndex, trackEngineerPoints)
		}
	}

	// Devolver información del cálculo
	return map[string]interface{}{
		"track_engineer_id": trackEngineerID,
		"pilot_id":          pilotID,
		"gp_index":          gpIndex,
		"session_type":      mode,
		"base_points":       baseTrackEngineerPoints,
		"total_points":      trackEngineerPoints,
		"multiplier":        multiplier,
		"pilot_points":      pilotPoints,
	}
}

// Función para actualizar puntos totales de un jugador
func updatePlayerTotalPoints(playerID uint, leagueID uint, gpIndex uint64, pointsToAdd int) {
	// Obtener el jugador en la liga
	var playerLeague models.PlayerByLeague
	if err := database.DB.Where("player_id = ? AND league_id = ?", playerID, leagueID).First(&playerLeague).Error; err != nil {
		log.Printf("Error obteniendo PlayerByLeague para player_id=%d, league_id=%d: %v", playerID, leagueID, err)
		return
	}

	// Calcular los puntos totales del jugador para este GP específico
	totalPointsForGP := calculatePlayerTotalPoints(playerID, uint64(leagueID), gpIndex)

	// Actualizar o crear registro en player_points_by_gp
	var existingRecord struct {
		ID uint `gorm:"primaryKey"`
	}
	err := database.DB.Table("player_points_by_gp").Where("player_id = ? AND league_id = ? AND gp_index = ?", playerID, leagueID, gpIndex).First(&existingRecord).Error

	if err != nil {
		// No existe, crear nuevo registro
		err = database.DB.Exec("INSERT INTO player_points_by_gp (player_id, league_id, gp_index, points) VALUES (?, ?, ?, ?)",
			playerID, leagueID, gpIndex, totalPointsForGP).Error
		if err != nil {
			log.Printf("Error creando registro en player_points_by_gp para player_id=%d, league_id=%d, gp_index=%d: %v", playerID, leagueID, gpIndex, err)
		} else {
			log.Printf("Creado registro en player_points_by_gp para player_id=%d, league_id=%d, gp_index=%d: %d pts", playerID, leagueID, gpIndex, totalPointsForGP)
		}
	} else {
		// Existe, actualizar
		err = database.DB.Exec("UPDATE player_points_by_gp SET points = ? WHERE player_id = ? AND league_id = ? AND gp_index = ?",
			totalPointsForGP, playerID, leagueID, gpIndex).Error
		if err != nil {
			log.Printf("Error actualizando registro en player_points_by_gp para player_id=%d, league_id=%d, gp_index=%d: %v", playerID, leagueID, gpIndex, err)
		} else {
			log.Printf("Actualizado registro en player_points_by_gp para player_id=%d, league_id=%d, gp_index=%d: %d pts", playerID, leagueID, gpIndex, totalPointsForGP)
		}
	}

	// Recalcular puntos totales sumando todos los GPs
	var totalPoints int
	err = database.DB.Raw("SELECT COALESCE(SUM(points), 0) FROM player_points_by_gp WHERE player_id = ? AND league_id = ?", playerID, leagueID).Scan(&totalPoints).Error
	if err != nil {
		log.Printf("Error calculando puntos totales para player_id=%d, league_id=%d: %v", playerID, leagueID, err)
		return
	}

	// Actualizar TotalPoints en PlayerByLeague
	playerLeague.TotalPoints = totalPoints
	if err := database.DB.Save(&playerLeague).Error; err != nil {
		log.Printf("Error guardando puntos totales para player_id=%d, league_id=%d: %v", playerID, leagueID, err)
	} else {
		log.Printf("Puntos totales actualizados para player_id=%d, league_id=%d: %d pts", playerID, leagueID, totalPoints)
	}
}

// Función para generar ofertas de la FIA para todos los elementos en venta
func generateFIAOffersForLeague(leagueID uint) error {
	log.Printf("[FIA] Generando ofertas de la FIA para liga %d", leagueID)

	// 1. Generar ofertas para pilotos en venta
	var pilotVentas []models.PilotByLeague
	database.DB.Where("league_id = ? AND venta IS NOT NULL AND venta_expires_at > ? AND league_offer_value IS NULL", leagueID, time.Now()).Find(&pilotVentas)
	log.Printf("[FIA] Encontrados %d pilotos en venta sin oferta FIA", len(pilotVentas))

	for _, pbl := range pilotVentas {
		var pilot models.Pilot
		if err := database.DB.First(&pilot, pbl.PilotID).Error; err != nil {
			log.Printf("[FIA] Error obteniendo piloto %d: %v", pbl.PilotID, err)
			continue
		}

		// Usar el valor de venta en lugar del valor base del piloto
		saleValue := float64(*pbl.Venta)
		fiaOffer := generateFIAOffer(saleValue)
		expires := time.Now().Add(24 * time.Hour)

		log.Printf("[FIA] Generando oferta para piloto %s (ID: %d) - Valor venta: %.2f€, Oferta FIA: %.2f€", pilot.DriverName, pbl.ID, saleValue, fiaOffer)

		pbl.LeagueOfferValue = &fiaOffer
		pbl.LeagueOfferExpiresAt = &expires

		if err := database.DB.Save(&pbl).Error; err != nil {
			log.Printf("[FIA] Error guardando oferta FIA para piloto %d: %v", pbl.ID, err)
		} else {
			log.Printf("[FIA] ✅ Oferta FIA guardada exitosamente para piloto %s: %.2f€", pilot.DriverName, fiaOffer)
		}
	}

	// 2. Generar ofertas para track engineers en venta
	var trackEngineerVentas []models.TrackEngineerByLeague
	database.DB.Where("league_id = ? AND venta IS NOT NULL AND venta_expires_at > ? AND league_offer_value IS NULL", leagueID, time.Now()).Find(&trackEngineerVentas)
	log.Printf("[FIA] Encontrados %d track engineers en venta sin oferta FIA", len(trackEngineerVentas))

	for _, teb := range trackEngineerVentas {
		var te models.TrackEngineer
		if err := database.DB.First(&te, teb.TrackEngineerID).Error; err != nil {
			log.Printf("[FIA] Error obteniendo track engineer %d: %v", teb.TrackEngineerID, err)
			continue
		}

		// Usar el valor de venta en lugar del valor base del track engineer
		saleValue := float64(*teb.Venta)
		fiaOffer := generateFIAOffer(saleValue)
		expires := time.Now().Add(24 * time.Hour)

		teb.LeagueOfferValue = &fiaOffer
		teb.LeagueOfferExpiresAt = &expires

		if err := database.DB.Save(&teb).Error; err != nil {
			log.Printf("[FIA] Error guardando oferta FIA para track engineer %d: %v", teb.ID, err)
		} else {
			log.Printf("[FIA] Oferta FIA generada para track engineer %s: %.2f€ (valor venta: %.2f€)", te.Name, fiaOffer, saleValue)
		}
	}

	// 3. Generar ofertas para chief engineers en venta
	var chiefEngineerVentas []models.ChiefEngineerByLeague
	database.DB.Where("league_id = ? AND venta IS NOT NULL AND venta_expires_at > ? AND league_offer_value IS NULL", leagueID, time.Now()).Find(&chiefEngineerVentas)
	log.Printf("[FIA] Encontrados %d chief engineers en venta sin oferta FIA", len(chiefEngineerVentas))

	for _, ceb := range chiefEngineerVentas {
		var ce models.ChiefEngineer
		if err := database.DB.First(&ce, ceb.ChiefEngineerID).Error; err != nil {
			log.Printf("[FIA] Error obteniendo chief engineer %d: %v", ceb.ChiefEngineerID, err)
			continue
		}

		// Usar el valor de venta en lugar del valor base del chief engineer
		saleValue := float64(*ceb.Venta)
		fiaOffer := generateFIAOffer(saleValue)
		expires := time.Now().Add(24 * time.Hour)

		ceb.LeagueOfferValue = &fiaOffer
		ceb.LeagueOfferExpiresAt = &expires

		if err := database.DB.Save(&ceb).Error; err != nil {
			log.Printf("[FIA] Error guardando oferta FIA para chief engineer %d: %v", ceb.ID, err)
		} else {
			log.Printf("[FIA] Oferta FIA generada para chief engineer %s: %.2f€ (valor venta: %.2f€)", ce.Name, fiaOffer, saleValue)
		}
	}

	// 4. Generar ofertas para team constructors en venta
	var teamConstructorVentas []models.TeamConstructorByLeague
	database.DB.Where("league_id = ? AND venta IS NOT NULL AND venta_expires_at > ? AND league_offer_value IS NULL", leagueID, time.Now()).Find(&teamConstructorVentas)
	log.Printf("[FIA] Encontrados %d team constructors en venta sin oferta FIA", len(teamConstructorVentas))

	for _, tcb := range teamConstructorVentas {
		var tc models.TeamConstructor
		if err := database.DB.First(&tc, tcb.TeamConstructorID).Error; err != nil {
			log.Printf("[FIA] Error obteniendo team constructor %d: %v", tcb.TeamConstructorID, err)
			continue
		}

		// Usar el valor de venta en lugar del valor base del team constructor
		saleValue := float64(*tcb.Venta)
		fiaOffer := generateFIAOffer(saleValue)
		expires := time.Now().Add(24 * time.Hour)

		tcb.LeagueOfferValue = &fiaOffer
		tcb.LeagueOfferExpiresAt = &expires

		if err := database.DB.Save(&tcb).Error; err != nil {
			log.Printf("[FIA] Error guardando oferta FIA para team constructor %d: %v", tcb.ID, err)
		} else {
			log.Printf("[FIA] Oferta FIA generada para team constructor %s: %.2f€ (valor venta: %.2f€)", tc.Name, fiaOffer, saleValue)
		}
	}

	log.Printf("[FIA] Generación de ofertas FIA completada para liga %d", leagueID)
	return nil
}

// Función para generar ofertas de la FIA para elementos con propietario que no tienen ofertas
func generateFIAOffersForOwnedItems(leagueID uint) error {
	log.Printf("[FIA-OWNED] Generando ofertas de la FIA para elementos con propietario en liga %d", leagueID)

	// 1. Generar ofertas para pilotos con propietario que no tienen ofertas de la FIA
	var pilotsWithOwner []models.PilotByLeague
	database.DB.Where("league_id = ? AND owner_id > 0 AND (bids IS NULL OR bids = '[]' OR bids = 'null')", leagueID).Find(&pilotsWithOwner)

	for _, pbl := range pilotsWithOwner {
		var pilot models.Pilot
		if err := database.DB.First(&pilot, pbl.PilotID).Error; err != nil {
			log.Printf("[FIA-OWNED] Error obteniendo piloto %d: %v", pbl.PilotID, err)
			continue
		}

		// Generar oferta entre 90% y 110% del valor del piloto
		fiaOfferValue := generateFIAOffer(pilot.Value)

		// Crear la oferta de la FIA con ID especial
		fiaBid := Bid{
			PlayerID: FIA_PLAYER_ID, // ID especial de la FIA
			Valor:    fiaOfferValue,
		}

		// Guardar en el campo bids
		bidsJSON, _ := json.Marshal([]Bid{fiaBid})
		pbl.Bids = bidsJSON
		database.DB.Save(&pbl)

		log.Printf("[FIA-OWNED] Oferta de la FIA generada para piloto %s: %.2f€ (valor base: %.2f€)", pilot.DriverName, fiaOfferValue, pilot.Value)
	}

	// 2. Generar ofertas para track engineers con propietario que no tienen ofertas de la FIA
	var trackEngineersWithOwner []models.TrackEngineerByLeague
	database.DB.Where("league_id = ? AND owner_id > 0 AND (bids IS NULL OR bids = '[]' OR bids = 'null')", leagueID).Find(&trackEngineersWithOwner)

	for _, teb := range trackEngineersWithOwner {
		var te models.TrackEngineer
		if err := database.DB.First(&te, teb.TrackEngineerID).Error; err != nil {
			log.Printf("[FIA-OWNED] Error obteniendo track engineer %d: %v", teb.TrackEngineerID, err)
			continue
		}

		// Generar oferta entre 90% y 110% del valor del track engineer
		fiaOfferValue := generateFIAOffer(te.Value)

		// Crear la oferta de la FIA con ID especial
		fiaBid := Bid{
			PlayerID: FIA_PLAYER_ID, // ID especial de la FIA
			Valor:    fiaOfferValue,
		}

		// Guardar en el campo bids
		bidsJSON, _ := json.Marshal([]Bid{fiaBid})
		teb.Bids = bidsJSON
		database.DB.Save(&teb)

		log.Printf("[FIA-OWNED] Oferta de la FIA generada para track engineer %s: %.2f€ (valor base: %.2f€)", te.Name, fiaOfferValue, te.Value)
	}

	// 3. Generar ofertas para chief engineers con propietario que no tienen ofertas de la FIA
	var chiefEngineersWithOwner []models.ChiefEngineerByLeague
	database.DB.Where("league_id = ? AND owner_id > 0 AND (bids IS NULL OR bids = '[]' OR bids = 'null')", leagueID).Find(&chiefEngineersWithOwner)

	for _, ceb := range chiefEngineersWithOwner {
		var ce models.ChiefEngineer
		if err := database.DB.First(&ce, ceb.ChiefEngineerID).Error; err != nil {
			log.Printf("[FIA-OWNED] Error obteniendo chief engineer %d: %v", ceb.ChiefEngineerID, err)
			continue
		}

		// Generar oferta entre 90% y 110% del valor del chief engineer
		fiaOfferValue := generateFIAOffer(ce.Value)

		// Crear la oferta de la FIA con ID especial
		fiaBid := Bid{
			PlayerID: FIA_PLAYER_ID, // ID especial de la FIA
			Valor:    fiaOfferValue,
		}

		// Guardar en el campo bids
		bidsJSON, _ := json.Marshal([]Bid{fiaBid})
		ceb.Bids = bidsJSON
		database.DB.Save(&ceb)

		log.Printf("[FIA-OWNED] Oferta de la FIA generada para chief engineer %s: %.2f€ (valor base: %.2f€)", ce.Name, fiaOfferValue, ce.Value)
	}

	// 4. Generar ofertas para team constructors con propietario que no tienen ofertas de la FIA
	var teamConstructorsWithOwner []models.TeamConstructorByLeague
	database.DB.Where("league_id = ? AND owner_id > 0 AND (bids IS NULL OR bids = '[]' OR bids = 'null')", leagueID).Find(&teamConstructorsWithOwner)

	for _, tcb := range teamConstructorsWithOwner {
		var tc models.TeamConstructor
		if err := database.DB.First(&tc, tcb.TeamConstructorID).Error; err != nil {
			log.Printf("[FIA-OWNED] Error obteniendo team constructor %d: %v", tcb.TeamConstructorID, err)
			continue
		}

		// Generar oferta entre 90% y 110% del valor del team constructor
		fiaOfferValue := generateFIAOffer(tc.Value)

		// Crear la oferta de la FIA (el PlayerID debe ser el del propietario actual)
		fiaBid := Bid{
			PlayerID: tcb.OwnerID, // El propietario actual
			Valor:    fiaOfferValue,
		}

		// Guardar en el campo bids
		bidsJSON, _ := json.Marshal([]Bid{fiaBid})
		tcb.Bids = bidsJSON
		database.DB.Save(&tcb)

		log.Printf("[FIA-OWNED] Oferta de la FIA generada para team constructor %s: %.2f€ (valor base: %.2f€)", tc.Name, fiaOfferValue, tc.Value)
	}

	log.Printf("[FIA-OWNED] Generación de ofertas FIA para elementos con propietario completada para liga %d", leagueID)
	return nil
}

// Función para generar un código único de liga, aleatorio, sin todos los caracteres iguales y que no exista en la base de datos
func generateLeagueCode() string {
	letters := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	var code string
	for {
		b := make([]rune, 8)
		for i := range b {
			b[i] = letters[int(time.Now().UnixNano())%len(letters)]
			time.Sleep(1) // Para evitar repetidos por nanosegundo
		}
		code = string(b)
		// Comprobar que no sean todos iguales
		allEqual := true
		for i := 1; i < len(code); i++ {
			if code[i] != code[0] {
				allEqual = false
				break
			}
		}
		if allEqual {
			continue
		}
		// Comprobar que no exista en la base de datos
		var count int64
		database.DB.Model(&models.League{}).Where("code = ?", code).Count(&count)
		if count == 0 {
			break
		}
	}
	return code
}

// Función auxiliar para asegurar arrays de ceros si el valor es nil
func safeIntArray(val []int, length int) []int {
	if val == nil {
		return make([]int, length)
	}
	return val
}

// Al final del archivo, agrega la función removeAccents:
func removeAccents(s string) string {
	replacer := strings.NewReplacer(
		"á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u",
		"Á", "A", "É", "E", "Í", "I", "Ó", "O", "Ú", "U",
		"ñ", "n", "Ñ", "N",
		"'", "", "'", "",
	)
	return replacer.Replace(s)
}

// Al final del archivo, agrega la función engineerNameFromImageURL:
func engineerNameFromImageURL(imageURL string) string {
	if imageURL == "" {
		return ""
	}
	name := strings.TrimSuffix(imageURL, ".png")
	name = strings.ReplaceAll(name, "_", " ")
	return name
}

func returnUserItemsToLeague(userID uint, leagueID uint) error {
	log.Printf("[DEVOLVER FICHAJES] Devolviendo fichajes del usuario %d a la liga %d", userID, leagueID)

	// 1. Devolver pilotos del usuario al mercado
	var pilotByLeagues []models.PilotByLeague
	if err := database.DB.Where("owner_id = ? AND league_id = ?", userID, leagueID).Find(&pilotByLeagues).Error; err != nil {
		return fmt.Errorf("error obteniendo pilotos del usuario: %v", err)
	}

	for _, pbl := range pilotByLeagues {
		// Resetear el piloto a su estado original
		updates := map[string]interface{}{
			"owner_id":                0, // Sin dueño
			"clausulatime":            nil,
			"clausula_value":          nil,
			"bids":                    "[]",
			"venta":                   nil,
			"venta_expires_at":        nil,
			"league_offer_value":      nil,
			"league_offer_expires_at": nil,
		}

		if err := database.DB.Model(&models.PilotByLeague{}).Where("id = ?", pbl.ID).Updates(updates).Error; err != nil {
			return fmt.Errorf("error reseteando piloto %d: %v", pbl.ID, err)
		}
		log.Printf("[DEVOLVER FICHAJES] Piloto %d devuelto al mercado", pbl.PilotID)
	}

	// 2. Devolver track engineers del usuario al mercado
	var trackEngineerByLeagues []models.TrackEngineerByLeague
	if err := database.DB.Where("owner_id = ? AND league_id = ?", userID, leagueID).Find(&trackEngineerByLeagues).Error; err != nil {
		return fmt.Errorf("error obteniendo track engineers del usuario: %v", err)
	}

	for _, tebl := range trackEngineerByLeagues {
		// Resetear el track engineer a su estado original
		updates := map[string]interface{}{
			"owner_id":                0, // Sin dueño
			"bids":                    "[]",
			"venta":                   nil,
			"venta_expires_at":        nil,
			"league_offer_value":      nil,
			"league_offer_expires_at": nil,
			"clausula_expires_at":     nil,
			"clausula_value":          nil,
		}

		if err := database.DB.Model(&models.TrackEngineerByLeague{}).Where("id = ?", tebl.ID).Updates(updates).Error; err != nil {
			return fmt.Errorf("error reseteando track engineer %d: %v", tebl.ID, err)
		}
		log.Printf("[DEVOLVER FICHAJES] Track Engineer %d devuelto al mercado", tebl.TrackEngineerID)
	}

	// 3. Devolver chief engineers del usuario al mercado
	var chiefEngineerByLeagues []models.ChiefEngineerByLeague
	if err := database.DB.Where("owner_id = ? AND league_id = ?", userID, leagueID).Find(&chiefEngineerByLeagues).Error; err != nil {
		return fmt.Errorf("error obteniendo chief engineers del usuario: %v", err)
	}

	for _, cebl := range chiefEngineerByLeagues {
		// Resetear el chief engineer a su estado original
		updates := map[string]interface{}{
			"owner_id":                0, // Sin dueño
			"bids":                    "[]",
			"venta_expires_at":        nil,
			"league_offer_value":      nil,
			"league_offer_expires_at": nil,
			"clausula_expires_at":     nil,
			"clausula_value":          nil,
		}

		if err := database.DB.Model(&models.ChiefEngineerByLeague{}).Where("id = ?", cebl.ID).Updates(updates).Error; err != nil {
			return fmt.Errorf("error reseteando chief engineer %d: %v", cebl.ID, err)
		}
		log.Printf("[DEVOLVER FICHAJES] Chief Engineer %d devuelto al mercado", cebl.ChiefEngineerID)
	}

	// 4. Devolver team constructors del usuario al mercado
	var teamConstructorByLeagues []models.TeamConstructorByLeague
	if err := database.DB.Where("owner_id = ? AND league_id = ?", userID, leagueID).Find(&teamConstructorByLeagues).Error; err != nil {
		return fmt.Errorf("error obteniendo team constructors del usuario: %v", err)
	}

	for _, tcbl := range teamConstructorByLeagues {
		// Resetear el team constructor a su estado original
		updates := map[string]interface{}{
			"owner_id":                0, // Sin dueño
			"bids":                    "[]",
			"venta":                   nil,
			"venta_expires_at":        nil,
			"league_offer_value":      nil,
			"league_offer_expires_at": nil,
			"clausula_expires_at":     nil,
			"clausula_value":          nil,
		}

		if err := database.DB.Model(&models.TeamConstructorByLeague{}).Where("id = ?", tcbl.ID).Updates(updates).Error; err != nil {
			return fmt.Errorf("error reseteando team constructor %d: %v", tcbl.ID, err)
		}
		log.Printf("[DEVOLVER FICHAJES] Team Constructor %d devuelto al mercado", tcbl.TeamConstructorID)
	}

	log.Printf("[DEVOLVER FICHAJES] Todos los fichajes del usuario %d devueltos al mercado de la liga %d", userID, leagueID)
	return nil
}

// Función para limpiar todos los registros relacionados con una liga
func cleanupLeagueData(leagueID uint) {
	log.Printf("[CLEANUP] Limpiando datos de liga ID: %d", leagueID)

	// Borrar en orden para respetar las claves foráneas
	database.DB.Where("league_id = ?", leagueID).Delete(&models.MarketItem{})
	database.DB.Where("league_id = ?", leagueID).Delete(&models.TrackEngineerByLeague{})
	database.DB.Where("league_id = ?", leagueID).Delete(&models.ChiefEngineerByLeague{})
	database.DB.Where("league_id = ?", leagueID).Delete(&models.TeamConstructorByLeague{})
	database.DB.Where("league_id = ?", leagueID).Delete(&models.PilotByLeague{})
	database.DB.Where("league_id = ?", leagueID).Delete(&models.PlayerByLeague{})

	// Finalmente borrar la liga
	database.DB.Delete(&models.League{}, leagueID)

	log.Printf("[CLEANUP] Datos de liga ID %d limpiados exitosamente", leagueID)
}
