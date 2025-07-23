package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"f1-fantasy-app/database"
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
func updatePlayerOwnership(playerID uint, leagueID uint, itemType string, itemID uint, add bool) error {
	log.Printf("[updatePlayerOwnership] Iniciando: PlayerID=%d, LeagueID=%d, ItemType=%s, ItemID=%d, Add=%t", playerID, leagueID, itemType, itemID, add)

	var playerLeague models.PlayerByLeague
	if err := database.DB.Where("player_id = ? AND league_id = ?", playerID, leagueID).First(&playerLeague).Error; err != nil {
		log.Printf("[updatePlayerOwnership] ERROR: PlayerByLeague no encontrado para PlayerID=%d, LeagueID=%d: %v", playerID, leagueID, err)
		return err
	}

	log.Printf("[updatePlayerOwnership] PlayerByLeague encontrado: ID=%d", playerLeague.ID)

	switch itemType {
	case "pilot":
		log.Printf("[updatePlayerOwnership] Procesando pilot")
		log.Printf("[updatePlayerOwnership] OwnedPilots actual: %s", playerLeague.OwnedPilots)

		var owned []uint
		// Manejar NULL, string vacío, o "[]"
		if playerLeague.OwnedPilots != "" && playerLeague.OwnedPilots != "[]" {
			if err := json.Unmarshal([]byte(playerLeague.OwnedPilots), &owned); err != nil {
				log.Printf("[updatePlayerOwnership] Error parseando OwnedPilots: %v", err)
				owned = []uint{}
			}
		} else {
			log.Printf("[updatePlayerOwnership] OwnedPilots está vacío o NULL, inicializando array vacío")
			owned = []uint{}
		}
		log.Printf("[updatePlayerOwnership] Pilots actuales: %v", owned)

		if add {
			// Añadir si no existe
			found := false
			for _, id := range owned {
				if id == itemID {
					found = true
					break
				}
			}
			if !found {
				owned = append(owned, itemID)
				log.Printf("[updatePlayerOwnership] Pilot %d añadido. Lista actualizada: %v", itemID, owned)
			} else {
				log.Printf("[updatePlayerOwnership] Pilot %d ya existe en la lista", itemID)
			}
		} else {
			// Remover
			newOwned := make([]uint, 0)
			for _, id := range owned {
				if id != itemID {
					newOwned = append(newOwned, id)
				}
			}
			owned = newOwned
			log.Printf("[updatePlayerOwnership] Pilot %d removido. Lista actualizada: %v", itemID, owned)
		}

		ownedJSON, _ := json.Marshal(owned)
		playerLeague.OwnedPilots = string(ownedJSON)
		log.Printf("[updatePlayerOwnership] OwnedPilots actualizado a: %s", string(ownedJSON))

	case "track_engineer":
		log.Printf("[updatePlayerOwnership] Procesando track_engineer")
		log.Printf("[updatePlayerOwnership] OwnedTrackEngineers actual: %s", playerLeague.OwnedTrackEngineers)

		var owned []uint
		// Manejar NULL, string vacío, o "[]"
		if playerLeague.OwnedTrackEngineers != "" && playerLeague.OwnedTrackEngineers != "[]" {
			if err := json.Unmarshal([]byte(playerLeague.OwnedTrackEngineers), &owned); err != nil {
				log.Printf("[updatePlayerOwnership] Error parseando OwnedTrackEngineers: %v", err)
				owned = []uint{}
			}
		} else {
			log.Printf("[updatePlayerOwnership] OwnedTrackEngineers está vacío o NULL, inicializando array vacío")
			owned = []uint{}
		}
		log.Printf("[updatePlayerOwnership] Track Engineers actuales: %v", owned)

		if add {
			found := false
			for _, id := range owned {
				if id == itemID {
					found = true
					break
				}
			}
			if !found {
				owned = append(owned, itemID)
				log.Printf("[updatePlayerOwnership] Track Engineer %d añadido. Lista actualizada: %v", itemID, owned)
			} else {
				log.Printf("[updatePlayerOwnership] Track Engineer %d ya existe en la lista", itemID)
			}
		} else {
			newOwned := make([]uint, 0)
			for _, id := range owned {
				if id != itemID {
					newOwned = append(newOwned, id)
				}
			}
			owned = newOwned
			log.Printf("[updatePlayerOwnership] Track Engineer %d removido. Lista actualizada: %v", itemID, owned)
		}

		ownedJSON, _ := json.Marshal(owned)
		playerLeague.OwnedTrackEngineers = string(ownedJSON)
		log.Printf("[updatePlayerOwnership] OwnedTrackEngineers actualizado a: %s", string(ownedJSON))

	case "chief_engineer":
		log.Printf("[updatePlayerOwnership] Procesando chief_engineer")
		log.Printf("[updatePlayerOwnership] OwnedChiefEngineers actual: %s", playerLeague.OwnedChiefEngineers)

		var owned []uint
		// Manejar NULL, string vacío, o "[]"
		if playerLeague.OwnedChiefEngineers != "" && playerLeague.OwnedChiefEngineers != "[]" {
			if err := json.Unmarshal([]byte(playerLeague.OwnedChiefEngineers), &owned); err != nil {
				log.Printf("[updatePlayerOwnership] Error parseando OwnedChiefEngineers: %v", err)
				owned = []uint{}
			}
		} else {
			log.Printf("[updatePlayerOwnership] OwnedChiefEngineers está vacío o NULL, inicializando array vacío")
			owned = []uint{}
		}
		log.Printf("[updatePlayerOwnership] Chief Engineers actuales: %v", owned)

		if add {
			found := false
			for _, id := range owned {
				if id == itemID {
					found = true
					break
				}
			}
			if !found {
				owned = append(owned, itemID)
				log.Printf("[updatePlayerOwnership] Chief Engineer %d añadido. Lista actualizada: %v", itemID, owned)
			} else {
				log.Printf("[updatePlayerOwnership] Chief Engineer %d ya existe en la lista", itemID)
			}
		} else {
			newOwned := make([]uint, 0)
			for _, id := range owned {
				if id != itemID {
					newOwned = append(newOwned, id)
				}
			}
			owned = newOwned
			log.Printf("[updatePlayerOwnership] Chief Engineer %d removido. Lista actualizada: %v", itemID, owned)
		}

		ownedJSON, _ := json.Marshal(owned)
		playerLeague.OwnedChiefEngineers = string(ownedJSON)
		log.Printf("[updatePlayerOwnership] OwnedChiefEngineers actualizado a: %s", string(ownedJSON))

	case "team_constructor":
		log.Printf("[updatePlayerOwnership] Procesando team_constructor")
		log.Printf("[updatePlayerOwnership] OwnedTeamConstructors actual: %s", playerLeague.OwnedTeamConstructors)

		var owned []uint
		// Manejar NULL, string vacío, o "[]"
		if playerLeague.OwnedTeamConstructors != "" && playerLeague.OwnedTeamConstructors != "[]" {
			if err := json.Unmarshal([]byte(playerLeague.OwnedTeamConstructors), &owned); err != nil {
				log.Printf("[updatePlayerOwnership] Error parseando OwnedTeamConstructors: %v", err)
				owned = []uint{}
			}
		} else {
			log.Printf("[updatePlayerOwnership] OwnedTeamConstructors está vacío o NULL, inicializando array vacío")
			owned = []uint{}
		}
		log.Printf("[updatePlayerOwnership] Team Constructors actuales: %v", owned)

		if add {
			found := false
			for _, id := range owned {
				if id == itemID {
					found = true
					break
				}
			}
			if !found {
				owned = append(owned, itemID)
				log.Printf("[updatePlayerOwnership] Team Constructor %d añadido. Lista actualizada: %v", itemID, owned)
			} else {
				log.Printf("[updatePlayerOwnership] Team Constructor %d ya existe en la lista", itemID)
			}
		} else {
			newOwned := make([]uint, 0)
			for _, id := range owned {
				if id != itemID {
					newOwned = append(newOwned, id)
				}
			}
			owned = newOwned
			log.Printf("[updatePlayerOwnership] Team Constructor %d removido. Lista actualizada: %v", itemID, owned)
		}

		ownedJSON, _ := json.Marshal(owned)
		playerLeague.OwnedTeamConstructors = string(ownedJSON)
		log.Printf("[updatePlayerOwnership] OwnedTeamConstructors actualizado a: %s", string(ownedJSON))
	}

	if err := database.DB.Save(&playerLeague).Error; err != nil {
		log.Printf("[updatePlayerOwnership] ERROR guardando PlayerByLeague: %v", err)
		return err
	}

	log.Printf("[updatePlayerOwnership] PlayerByLeague guardado exitosamente")
	return nil
}

func refreshMarketForLeague(leagueID uint) error {
	log.Printf("[refreshMarketForLeague] Refrescando mercado para liga %d", leagueID)

	// 1. Obtener todos los elementos disponibles para el mercado (que no tengan owner)
	var availableItems []models.MarketItem
	database.DB.Where("league_id = ? AND is_active = ?", leagueID, true).Find(&availableItems)
	log.Printf("[refreshMarketForLeague] Total market_items encontrados: %d", len(availableItems))

	// 2. Filtrar elementos que no tengan propietario
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

	return nil
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No se encontró archivo .env, usando variables de entorno del sistema")
	}
	database.Connect()
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
		var existing models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userID, league.ID).First(&existing).Error; err == nil {
			log.Printf("El usuario %v ya tiene registro en player_by_league para la liga %d", userID, league.ID)
		} else {
			// Crear el registro en player_by_league solo para el creador
			playerByLeague := models.PlayerByLeague{
				PlayerID:              uint64(userID.(uint)),
				LeagueID:              uint64(league.ID),
				Money:                 100000000, // 100M
				TeamValue:             0,
				OwnedPilots:           "[]",
				OwnedTrackEngineers:   "[]",
				OwnedChiefEngineers:   "[]",
				OwnedTeamConstructors: "[]",
			}
			if err := database.DB.Create(&playerByLeague).Error; err != nil {
				log.Printf("Error creando player_by_league: %v", err)
			} else {
				log.Printf("Registro player_by_league creado para player_id=%d, league_id=%d", playerByLeague.PlayerID, playerByLeague.LeagueID)
			}
		}
		// Crear el mercado inicial de la liga (5 pilotos libres aleatorios)
		// Eliminar subastas antiguas por si acaso
		database.DB.Where("league_id = ?", league.ID).Delete(&Auction{})
		refreshMarketForLeague(league.ID)
		// Poblar ingenieros de pista para el primer GP
		var gps []models.GrandPrix
		database.DB.Order("gp_index asc").Find(&gps)
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
					ClausulaExpiresAt:    nil,
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
					ClausulaExpiresAt:    nil,
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
					ClausulaExpiresAt:    nil,
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

		// Añadir todos los pilotos
		for _, pbl := range pilotsByLeague {
			marketItem := models.MarketItem{
				LeagueID: league.ID,
				ItemType: "pilot",
				ItemID:   pbl.ID,
				IsActive: true,
			}
			database.DB.Create(&marketItem)
		}

		// Añadir todos los track engineers
		var allTrackEngineers []models.TrackEngineerByLeague
		database.DB.Where("league_id = ?", league.ID).Find(&allTrackEngineers)
		for _, teb := range allTrackEngineers {
			marketItem := models.MarketItem{
				LeagueID: league.ID,
				ItemType: "track_engineer",
				ItemID:   teb.ID,
				IsActive: true,
			}
			database.DB.Create(&marketItem)
		}

		// Añadir todos los chief engineers
		var allChiefEngineers []models.ChiefEngineerByLeague
		database.DB.Where("league_id = ?", league.ID).Find(&allChiefEngineers)
		for _, ceb := range allChiefEngineers {
			marketItem := models.MarketItem{
				LeagueID: league.ID,
				ItemType: "chief_engineer",
				ItemID:   ceb.ID,
				IsActive: true,
			}
			database.DB.Create(&marketItem)
		}

		// Añadir todos los team constructors
		var allTeamConstructors []models.TeamConstructorByLeague
		database.DB.Where("league_id = ?", league.ID).Find(&allTeamConstructors)
		for _, tcb := range allTeamConstructors {
			marketItem := models.MarketItem{
				LeagueID: league.ID,
				ItemType: "team_constructor",
				ItemID:   tcb.ID,
				IsActive: true,
			}
			database.DB.Create(&marketItem)
		}

		log.Printf("[CREAR LIGA] Market_items poblado correctamente")

		// Crear el mercado inicial de la liga (8 elementos aleatorios)
		refreshMarketForLeague(league.ID)

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
		log.Printf("[BORRAR LIGA] Eliminando registros relacionados con league_id=%s", id)
		// Borrar subastas
		database.DB.Where("league_id = ?", id).Delete(&Auction{})
		// Borrar pilotos por liga
		database.DB.Where("league_id = ?", id).Delete(&models.PilotByLeague{})
		// Borrar player_by_league
		database.DB.Where("league_id = ?", id).Delete(&models.PlayerByLeague{})
		// Finalmente, borrar la liga
		if err := database.DB.Delete(&models.League{}, id).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error eliminando liga"})
			return
		}
		log.Printf("[BORRAR LIGA] Liga %s eliminada correctamente", id)
		c.JSON(200, gin.H{"message": "Liga eliminada"})
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
		database.DB.Order("date asc").Find(&gps)
		// Criterios de puntuación según el modo
		scoring := map[string]interface{}{}
		nGPS := len(gps)
		switch pilot.Mode {
		case "practice", "P":
			scoring["practice_point_finish"] = safeIntArray(pilot.PracticePointFinish, nGPS)
			scoring["practice_team_battle"] = safeIntArray(pilot.PracticeTeamBattle, nGPS)
			scoring["practice_red_flag"] = safeIntArray(pilot.PracticeRedFlag, nGPS)
		case "qualifying", "Q":
			scoring["qualifying_pass_q1"] = safeIntArray(pilot.QualifyingPassQ1, nGPS)
			scoring["qualifying_pass_q2"] = safeIntArray(pilot.QualifyingPassQ2, nGPS)
			scoring["qualifying_position_finish"] = safeIntArray(pilot.QualifyingPositionFinish, nGPS)
			scoring["qualifying_team_battle"] = safeIntArray(pilot.QualifyingTeamBattle, nGPS)
			scoring["qualifying_red_flag"] = safeIntArray(pilot.QualifyingRedFlag, nGPS)
		case "race", "R":
			scoring["race_points"] = safeIntArray(pilot.RacePoints, nGPS)
			scoring["race_position"] = safeIntArray(pilot.RacePosition, nGPS)
			scoring["start_position"] = safeIntArray(pilot.StartPosition, nGPS)
			scoring["finish_position"] = safeIntArray(pilot.FinishPosition, nGPS)
			scoring["fastest_lap"] = safeIntArray(pilot.FastestLap, nGPS)
			scoring["driver_of_the_day"] = safeIntArray(pilot.DriverOfTheDay, nGPS)
			scoring["safety_car"] = safeIntArray(pilot.SafetyCar, nGPS)
			scoring["race_team_battle"] = safeIntArray(pilot.RaceTeamBattle, nGPS)
			scoring["race_red_flag"] = safeIntArray(pilot.RaceRedFlag, nGPS)
		}
		c.JSON(200, gin.H{
			"pilot":            pilot,
			"pilot_by_league":  pbl,
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
		playerID := c.Param("player_id")
		leagueID := c.Query("league_id")
		if playerID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros player_id o league_id"})
			return
		}

		log.Printf("[TEAM] Obteniendo plantilla para player_id=%s, league_id=%s", playerID, leagueID)

		// Obtener PlayerByLeague para acceder a las columnas owned_*
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

		// 1. Obtener pilotos propios
		var ownedPilotIDs []uint
		if playerLeague.OwnedPilots != "" && playerLeague.OwnedPilots != "[]" {
			_ = json.Unmarshal([]byte(playerLeague.OwnedPilots), &ownedPilotIDs)
		}
		log.Printf("[TEAM] Pilotos propios: %v", ownedPilotIDs)

		if len(ownedPilotIDs) > 0 {
			var pilotsByLeague []models.PilotByLeague
			database.DB.Where("league_id = ? AND pilot_id IN ? AND owner_id = ?", leagueID, ownedPilotIDs, playerID).Find(&pilotsByLeague)

			var pilots []map[string]interface{}
			for _, pbl := range pilotsByLeague {
				var pilot models.Pilot
				database.DB.First(&pilot, pbl.PilotID)
				pilots = append(pilots, map[string]interface{}{
					"id":                 pilot.ID,
					"pilot_by_league_id": pbl.ID,
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
		}

		// 2. Obtener track engineers propios - Los IDs son de track_engineer_by_league.id
		var ownedTrackEngIDs []uint
		if playerLeague.OwnedTrackEngineers != "" && playerLeague.OwnedTrackEngineers != "[]" {
			_ = json.Unmarshal([]byte(playerLeague.OwnedTrackEngineers), &ownedTrackEngIDs)
		}
		log.Printf("[TEAM] Track Engineers propios (IDs de track_engineer_by_league): %v", ownedTrackEngIDs)

		if len(ownedTrackEngIDs) > 0 {
			var trackEngineers []map[string]interface{}
			for _, tebID := range ownedTrackEngIDs {
				var teb models.TrackEngineerByLeague
				if err := database.DB.Where("id = ? AND league_id = ? AND owner_id = ?", tebID, leagueID, playerID).First(&teb).Error; err == nil {
					var te models.TrackEngineer
					database.DB.First(&te, teb.TrackEngineerID)

					// Buscar piloto relacionado
					var pilot models.Pilot
					pilotTeam := ""
					if err := database.DB.Where("track_engineer_id = ?", te.ID).First(&pilot).Error; err == nil {
						pilotTeam = pilot.Team
					}

					// Arreglar ruta de imagen
					imageURL := te.ImageURL
					if imageURL != "" && !strings.Contains(imageURL, "ingenierosdepista/") {
						imageURL = "images/ingenierosdepista/" + strings.TrimPrefix(imageURL, "images/")
					}

					trackEngineers = append(trackEngineers, map[string]interface{}{
						"id":                teb.ID,
						"track_engineer_id": te.ID,
						"name":              te.Name,
						"image_url":         imageURL,
						"value":             te.Value,
						"team":              pilotTeam,
						"owner_id":          teb.OwnerID,
						"type":              "track_engineer",
					})
				}
			}
			result["track_engineers"] = trackEngineers
			log.Printf("[TEAM] %d track engineers agregados", len(trackEngineers))
		}

		// 3. Obtener chief engineers propios - Los IDs son de chief_engineer_by_league.id
		var ownedChiefEngIDs []uint
		if playerLeague.OwnedChiefEngineers != "" && playerLeague.OwnedChiefEngineers != "[]" {
			_ = json.Unmarshal([]byte(playerLeague.OwnedChiefEngineers), &ownedChiefEngIDs)
		}
		log.Printf("[TEAM] Chief Engineers propios (IDs de chief_engineer_by_league): %v", ownedChiefEngIDs)

		if len(ownedChiefEngIDs) > 0 {
			var chiefEngineers []map[string]interface{}
			for _, cebID := range ownedChiefEngIDs {
				var ceb models.ChiefEngineerByLeague
				if err := database.DB.Where("id = ? AND league_id = ? AND owner_id = ?", cebID, leagueID, playerID).First(&ceb).Error; err == nil {
					var ce models.ChiefEngineer
					database.DB.First(&ce, ceb.ChiefEngineerID)

					chiefEngineers = append(chiefEngineers, map[string]interface{}{
						"id":                ce.ID,
						"chief_engineer_id": ce.ID,
						"name":              ce.Name,
						"image_url":         ce.ImageURL,
						"value":             ce.Value,
						"team":              ce.Team,
						"owner_id":          ceb.OwnerID,
						"type":              "chief_engineer",
					})
				}
			}
			result["chief_engineers"] = chiefEngineers
			log.Printf("[TEAM] %d chief engineers agregados", len(chiefEngineers))
		}

		// 4. Obtener team constructors propios - Los IDs son de team_constructor_by_league.id
		var ownedTeamConsIDs []uint
		if playerLeague.OwnedTeamConstructors != "" && playerLeague.OwnedTeamConstructors != "[]" {
			_ = json.Unmarshal([]byte(playerLeague.OwnedTeamConstructors), &ownedTeamConsIDs)
		}
		log.Printf("[TEAM] Team Constructors propios (IDs de team_constructor_by_league): %v", ownedTeamConsIDs)

		if len(ownedTeamConsIDs) > 0 {
			var teamConstructors []map[string]interface{}
			for _, tcbID := range ownedTeamConsIDs {
				var tcb models.TeamConstructorByLeague
				if err := database.DB.Where("id = ? AND league_id = ? AND owner_id = ?", tcbID, leagueID, playerID).First(&tcb).Error; err == nil {
					var tc models.TeamConstructor
					database.DB.First(&tc, tcb.TeamConstructorID)

					// Buscar pilotos del equipo
					var pilots []models.Pilot
					database.DB.Where("teamconstructor_id = ? AND mode = ?", tc.ID, "race").Find(&pilots)
					var pilotNames []string
					for _, pilot := range pilots {
						pilotNames = append(pilotNames, pilot.DriverName)
					}

					teamConstructors = append(teamConstructors, map[string]interface{}{
						"id":                  tc.ID,
						"team_constructor_id": tc.ID,
						"name":                tc.Name,
						"image_url":           tc.ImageURL,
						"value":               tc.Value,
						"team":                tc.Name,
						"pilots":              pilotNames,
						"pilot_count":         len(pilotNames),
						"owner_id":            tcb.OwnerID,
						"type":                "team_constructor",
					})
				}
			}
			result["team_constructors"] = teamConstructors
			log.Printf("[TEAM] %d team constructors agregados", len(teamConstructors))
		}

		log.Printf("[TEAM] Plantilla completa enviada: %d pilotos, %d track eng, %d chief eng, %d equipos",
			len(result["pilots"].([]map[string]interface{})),
			len(result["track_engineers"].([]map[string]interface{})),
			len(result["chief_engineers"].([]map[string]interface{})),
			len(result["team_constructors"].([]map[string]interface{})))

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

				// Actualizar owned_pilots
				if err := updatePlayerOwnership(maxBid.PlayerID, auction.LeagueID, "pilot", pbl.PilotID, true); err != nil {
					log.Printf("[REFRESH-AND-FINISH] Error actualizando ownership de pilot: %v", err)
				}

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

			case "track_engineer":
				var teb models.TrackEngineerByLeague
				if err := database.DB.First(&teb, auction.ItemID).Error; err != nil {
					log.Printf("[REFRESH-AND-FINISH] Error: track_engineer_by_league %d no encontrado", auction.ItemID)
					continue
				}
				log.Printf("[REFRESH-AND-FINISH] Track Engineer encontrado: ID=%d, TrackEngineerID=%d, OwnerID actual=%d", teb.ID, teb.TrackEngineerID, teb.OwnerID)

				teb.OwnerID = maxBid.PlayerID
				database.DB.Save(&teb)
				log.Printf("[REFRESH-AND-FINISH] Track Engineer owner actualizado a: %d", maxBid.PlayerID)

				// Actualizar owned_track_engineers - USAR teb.ID (track_engineer_by_league.id) NO teb.TrackEngineerID
				log.Printf("[REFRESH-AND-FINISH] Actualizando ownership: PlayerID=%d, LeagueID=%d, TrackEngineerByLeagueID=%d", maxBid.PlayerID, auction.LeagueID, teb.ID)
				if err := updatePlayerOwnership(maxBid.PlayerID, auction.LeagueID, "track_engineer", teb.ID, true); err != nil {
					log.Printf("[REFRESH-AND-FINISH] ERROR actualizando ownership de track_engineer: %v", err)
				} else {
					log.Printf("[REFRESH-AND-FINISH] Ownership de track_engineer actualizado correctamente")
				}

				// Actualizar team_value
				var te models.TrackEngineer
				if err := database.DB.First(&te, teb.TrackEngineerID).Error; err == nil {
					log.Printf("[REFRESH-AND-FINISH] Sumando valor del track engineer: %.2f", te.Value)
					playerLeague.TeamValue += te.Value
				} else {
					log.Printf("[REFRESH-AND-FINISH] Error obteniendo TrackEngineer ID %d: %v", teb.TrackEngineerID, err)
				}

			case "chief_engineer":
				var ceb models.ChiefEngineerByLeague
				if err := database.DB.First(&ceb, auction.ItemID).Error; err != nil {
					log.Printf("[REFRESH-AND-FINISH] Error: chief_engineer_by_league %d no encontrado", auction.ItemID)
					continue
				}
				log.Printf("[REFRESH-AND-FINISH] Chief Engineer encontrado: ID=%d, ChiefEngineerID=%d, OwnerID actual=%d", ceb.ID, ceb.ChiefEngineerID, ceb.OwnerID)

				ceb.OwnerID = maxBid.PlayerID
				database.DB.Save(&ceb)
				log.Printf("[REFRESH-AND-FINISH] Chief Engineer owner actualizado a: %d", maxBid.PlayerID)

				// Actualizar owned_chief_engineers - USAR ceb.ID (chief_engineer_by_league.id) NO ceb.ChiefEngineerID
				log.Printf("[REFRESH-AND-FINISH] Actualizando ownership: PlayerID=%d, LeagueID=%d, ChiefEngineerByLeagueID=%d", maxBid.PlayerID, auction.LeagueID, ceb.ID)
				if err := updatePlayerOwnership(maxBid.PlayerID, auction.LeagueID, "chief_engineer", ceb.ID, true); err != nil {
					log.Printf("[REFRESH-AND-FINISH] ERROR actualizando ownership de chief_engineer: %v", err)
				} else {
					log.Printf("[REFRESH-AND-FINISH] Ownership de chief_engineer actualizado correctamente")
				}

				// Actualizar team_value
				var ce models.ChiefEngineer
				if err := database.DB.First(&ce, ceb.ChiefEngineerID).Error; err == nil {
					log.Printf("[REFRESH-AND-FINISH] Sumando valor del chief engineer: %.2f", ce.Value)
					playerLeague.TeamValue += ce.Value
				} else {
					log.Printf("[REFRESH-AND-FINISH] Error obteniendo ChiefEngineer ID %d: %v", ceb.ChiefEngineerID, err)
				}

			case "team_constructor":
				var tcb models.TeamConstructorByLeague
				if err := database.DB.First(&tcb, auction.ItemID).Error; err != nil {
					log.Printf("[REFRESH-AND-FINISH] Error: team_constructor_by_league %d no encontrado", auction.ItemID)
					continue
				}
				log.Printf("[REFRESH-AND-FINISH] Team Constructor encontrado: ID=%d, TeamConstructorID=%d, OwnerID actual=%d", tcb.ID, tcb.TeamConstructorID, tcb.OwnerID)

				tcb.OwnerID = maxBid.PlayerID
				database.DB.Save(&tcb)
				log.Printf("[REFRESH-AND-FINISH] Team Constructor owner actualizado a: %d", maxBid.PlayerID)

				// Actualizar owned_team_constructors - USAR tcb.ID (team_constructor_by_league.id) NO tcb.TeamConstructorID
				log.Printf("[REFRESH-AND-FINISH] Actualizando ownership: PlayerID=%d, LeagueID=%d, TeamConstructorByLeagueID=%d", maxBid.PlayerID, auction.LeagueID, tcb.ID)
				if err := updatePlayerOwnership(maxBid.PlayerID, auction.LeagueID, "team_constructor", tcb.ID, true); err != nil {
					log.Printf("[REFRESH-AND-FINISH] ERROR actualizando ownership de team_constructor: %v", err)
				} else {
					log.Printf("[REFRESH-AND-FINISH] Ownership de team_constructor actualizado correctamente")
				}

				// Actualizar team_value
				var tc models.TeamConstructor
				if err := database.DB.First(&tc, tcb.TeamConstructorID).Error; err == nil {
					log.Printf("[REFRESH-AND-FINISH] Sumando valor del team constructor: %.2f", tc.Value)
					playerLeague.TeamValue += tc.Value
				} else {
					log.Printf("[REFRESH-AND-FINISH] Error obteniendo TeamConstructor ID %d: %v", tcb.TeamConstructorID, err)
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
		c.JSON(200, gin.H{"message": "Mercado reiniciado y subastas finalizadas", "finalizadas": finalizados})
	})

	// Reinicio automático del mercado cada 24 horas
	go func() {
		for {
			time.Sleep(24 * time.Hour)
			var leagues []models.League
			database.DB.Find(&leagues)
			for _, league := range leagues {
				refreshMarketForLeague(league.ID)
				log.Printf("Mercado reiniciado automáticamente para la liga %d", league.ID)
				updateMarketNextRefresh()
			}
		}
	}()

	router.GET("/api/market/next-refresh", func(c *gin.Context) {
		c.JSON(200, gin.H{"next_refresh": marketNextRefresh.Unix()})
	})

	// Endpoint de prueba para updatePlayerOwnership
	router.POST("/api/debug/test-ownership", func(c *gin.Context) {
		var req struct {
			PlayerID uint   `json:"player_id"`
			LeagueID uint   `json:"league_id"`
			ItemType string `json:"item_type"`
			ItemID   uint   `json:"item_id"`
			Add      bool   `json:"add"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}

		log.Printf("[TEST] ===== PROBANDO updatePlayerOwnership =====")
		log.Printf("[TEST] PlayerID=%d, LeagueID=%d, ItemType=%s, ItemID=%d, Add=%t",
			req.PlayerID, req.LeagueID, req.ItemType, req.ItemID, req.Add)

		if err := updatePlayerOwnership(req.PlayerID, req.LeagueID, req.ItemType, req.ItemID, req.Add); err != nil {
			log.Printf("[TEST] ERROR: %v", err)
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		log.Printf("[TEST] updatePlayerOwnership ejecutado exitosamente")
		c.JSON(200, gin.H{"message": "Ownership actualizado correctamente"})
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
		var playerLeagues []models.PlayerByLeague
		database.DB.Where("player_id = ?", userID).Find(&playerLeagues)
		var leagueIDs []uint
		for _, pl := range playerLeagues {
			leagueIDs = append(leagueIDs, uint(pl.LeagueID))
		}
		var leagues []models.League
		if len(leagueIDs) > 0 {
			database.DB.Where("id IN ?", leagueIDs).Find(&leagues)
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

	// Endpoint para clasificación de una liga
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
			item := map[string]interface{}{
				"player_id": pl.PlayerID,
				"name":      player.Name,
				"points":    player.TotalPoints,
				"money":     pl.Money,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"classification": result})
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

	// Endpoint para poner a la venta un piloto (guardar precio de venta)
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
		now := time.Now()
		expires := now.Add(72 * time.Hour)
		pbl.Venta = &req.Venta
		pbl.VentaExpiresAt = &expires
		if err := database.DB.Save(&pbl).Error; err != nil {
			fmt.Println("[LOG] Error al guardar PilotByLeague:", err)
			c.JSON(500, gin.H{"error": "Error al guardar"})
			return
		}
		fmt.Println("[LOG] Piloto puesto en venta correctamente:", pbl.ID, "por usuario:", userID)
		c.JSON(200, gin.H{"success": true})
		// Guardar histórico de venta directa
		errHist := database.DB.Exec(`INSERT INTO pilot_value_history (pilot_id, pilot_by_league_id, league_id, player_id, valor_pagado, fecha, tipo, counterparty_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, pbl.PilotID, pbl.ID, pbl.LeagueID, userID, *pbl.LeagueOfferValue, time.Now(), "venta", 0).Error
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

	// Endpoint para obtener los pilotos en venta del usuario en la liga
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
		var ventas []models.PilotByLeague
		database.DB.Where("league_id = ? AND owner_id = ? AND venta IS NOT NULL AND venta_expires_at > ?", leagueID, userID, time.Now()).Find(&ventas)
		var result []map[string]interface{}
		for _, pbl := range ventas {
			var pilot models.Pilot
			database.DB.First(&pilot, pbl.PilotID)
			item := map[string]interface{}{
				"id":                      pbl.ID,
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
		var auctions []Auction
		database.DB.Where("league_id = ? AND end_time > ?", leagueID, time.Now()).Find(&auctions)
		log.Printf("[MY-BIDS] Encontradas %d subastas activas para liga %s", len(auctions), leagueID)

		var result []map[string]interface{}
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
				log.Printf("[MY-BIDS] Usuario %d tiene puja en %s ID %d", userID, auction.ItemType, auction.ItemID)

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
						"venta":            pbl.Venta,
						"venta_expires_at": pbl.VentaExpiresAt,
						"clausulatime":     pbl.Clausulatime,
						"clausula_value":   pbl.ClausulaValue,
						"owner_id":         pbl.OwnerID,
						"my_bid":           myBidValue,
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
						"venta":            teb.Venta,
						"venta_expires_at": teb.VentaExpiresAt,
						"owner_id":         teb.OwnerID,
						"my_bid":           myBidValue,
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
						"venta":            ceb.Venta,
						"venta_expires_at": ceb.VentaExpiresAt,
						"owner_id":         ceb.OwnerID,
						"my_bid":           myBidValue,
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
						"venta":            tcb.Venta,
						"venta_expires_at": tcb.VentaExpiresAt,
						"owner_id":         tcb.OwnerID,
						"my_bid":           myBidValue,
					}
					result = append(result, item)
				}
			}
		}
		log.Printf("[MY-BIDS] Devolviendo %d elementos con pujas del usuario %d", len(result), userID)
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
		var auction Auction
		if err := database.DB.Where("item_type = ? AND item_id = ? AND league_id = ? AND end_time > ?", req.ItemType, req.ItemID, req.LeagueID, time.Now()).First(&auction).Error; err != nil {
			c.JSON(404, gin.H{"error": "No hay subasta activa para este elemento"})
			return
		}
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
	})

	// Endpoint para actualizar ventas7fichajes y value de todos los pilotos
	router.POST("/api/drivers/update-values", func(c *gin.Context) {
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
		// Buscar si ya existe para ese piloto y GP
		var existing models.PilotRace
		if err := database.DB.Where("pilot_id = ? AND gp_index = ?", req.PilotID, req.GPIndex).First(&existing).Error; err == nil {
			req.ID = existing.ID
			database.DB.Save(&req)
			c.JSON(200, gin.H{"message": "Puntuación actualizada"})
			return
		}
		if err := database.DB.Create(&req).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error guardando puntuación"})
			return
		}
		c.JSON(201, gin.H{"message": "Puntuación creada"})
	})

	// Endpoint para crear o actualizar puntuaciones manuales de qualy
	router.POST("/api/admin/pilot-qualy", func(c *gin.Context) {
		var req models.PilotQualy
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		var existing models.PilotQualy
		if err := database.DB.Where("pilot_id = ? AND gp_index = ?", req.PilotID, req.GPIndex).First(&existing).Error; err == nil {
			req.ID = existing.ID
			database.DB.Save(&req)
			c.JSON(200, gin.H{"message": "Puntuación actualizada"})
			return
		}
		if err := database.DB.Create(&req).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error guardando puntuación"})
			return
		}
		c.JSON(201, gin.H{"message": "Puntuación creada"})
	})

	// Endpoint para crear o actualizar puntuaciones manuales de práctica
	router.POST("/api/admin/pilot-practice", func(c *gin.Context) {
		var req models.PilotPractice
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		var existing models.PilotPractice
		if err := database.DB.Where("pilot_id = ? AND gp_index = ?", req.PilotID, req.GPIndex).First(&existing).Error; err == nil {
			req.ID = existing.ID
			database.DB.Save(&req)
			c.JSON(200, gin.H{"message": "Puntuación actualizada"})
			return
		}
		if err := database.DB.Create(&req).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error guardando puntuación"})
			return
		}
		c.JSON(201, gin.H{"message": "Puntuación creada"})
	})

	// Endpoint para obtener la lista de GPs para el formulario
	router.GET("/api/grand-prix", func(c *gin.Context) {
		var gps []models.GrandPrix
		database.DB.Find(&gps)
		c.JSON(200, gin.H{"gps": gps})
	})

	// Endpoint para guardar posiciones esperadas manualmente
	router.POST("/api/admin/expected-positions", func(c *gin.Context) {
		var req struct {
			GPIndex   uint   `json:"gp_index"`
			Mode      string `json:"mode"`
			Positions []struct {
				PilotID          uint `json:"pilot_id"`
				ExpectedPosition int  `json:"expected_position"`
			} `json:"positions"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
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
			// Buscar si ya existe
			var count int64
			database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", pos.PilotID, req.GPIndex).Count(&count)
			if count > 0 {
				// Actualizar
				database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", pos.PilotID, req.GPIndex).Update("expected_position", pos.ExpectedPosition)
			} else {
				// Crear
				database.DB.Exec("INSERT INTO "+table+" (pilot_id, gp_index, expected_position) VALUES (?, ?, ?)", pos.PilotID, req.GPIndex, pos.ExpectedPosition)
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

	// Endpoint para guardar los resultados de sesión de un piloto en un GP y modo
	router.POST("/api/admin/session-result", func(c *gin.Context) {
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
		// Poner 0 por defecto en campos numéricos vacíos
		for k, v := range body {
			if v == nil || v == "" {
				body[k] = 0
			}
		}
		log.Printf("[SESSION-RESULT] Body para guardar: %+v", body)
		// Buscar si ya existe
		var count int64
		database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", uint(pilotID), uint(gpIndex)).Count(&count)
		if count > 0 {
			log.Printf("[SESSION-RESULT] Actualizando fila existente para pilot_id=%v, gp_index=%v", uint(pilotID), uint(gpIndex))
			database.DB.Table(table).Where("pilot_id = ? AND gp_index = ?", uint(pilotID), uint(gpIndex)).Updates(body)
		} else {
			log.Printf("[SESSION-RESULT] Creando nueva fila para pilot_id=%v, gp_index=%v", uint(pilotID), uint(gpIndex))
			body["pilot_id"] = uint(pilotID)
			body["gp_index"] = uint(gpIndex)
			database.DB.Table(table).Create(body)
		}
		c.JSON(200, gin.H{"message": "Resultado guardado"})
	})

	// Endpoint para obtener los ingenieros de pista por liga
	router.GET("/api/trackengineersbyleague", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		log.Printf("[TRACKENG] league_id recibido: %v", leagueID)
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		var trackEngineersByLeague []models.TrackEngineerByLeague
		if err := database.DB.Where("league_id = ?", leagueID).Find(&trackEngineersByLeague).Error; err != nil {
			log.Printf("[TRACKENG] Error obteniendo ingenieros: %v", err)
			c.JSON(500, gin.H{"error": "Error obteniendo ingenieros de pista"})
			return
		}
		log.Printf("[TRACKENG] Encontrados %d ingenieros para league_id=%v", len(trackEngineersByLeague), leagueID)
		var result []map[string]interface{}
		for _, teb := range trackEngineersByLeague {
			var te models.TrackEngineer
			database.DB.First(&te, teb.TrackEngineerID)
			var pilot models.Pilot
			dbPilot := database.DB.Where("track_engineer_id = ?", te.ID).First(&pilot)
			item := map[string]interface{}{
				"id":                teb.ID,
				"track_engineer_id": teb.TrackEngineerID,
				"name":              te.Name,
				"image_url":         te.ImageURL,
				"value":             te.Value,
				"owner_id":          teb.OwnerID,
				"venta":             teb.Venta,
				"league_id":         teb.LeagueID,
				"type":              "track_engineer", // Añadir tipo para identificación
			}
			if dbPilot.Error == nil {
				item["pilot_id"] = pilot.ID
				item["driver_name"] = pilot.DriverName
				item["team"] = pilot.Team
			} else {
				item["team"] = "Sin equipo" // Valor por defecto
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"track_engineers": result})
	})

	// Endpoint para obtener los ingenieros jefe por liga
	router.GET("/api/chiefengineersbyleague", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		var chiefEngineersByLeague []models.ChiefEngineerByLeague
		if err := database.DB.Where("league_id = ?", leagueID).Find(&chiefEngineersByLeague).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo ingenieros jefe"})
			return
		}
		var result []map[string]interface{}
		for _, ceb := range chiefEngineersByLeague {
			var ce models.ChiefEngineer
			database.DB.First(&ce, ceb.ChiefEngineerID)
			item := map[string]interface{}{
				"id":                ceb.ID,
				"chief_engineer_id": ceb.ChiefEngineerID,
				"name":              ce.Name,
				"image_url":         ce.ImageURL,
				"value":             ce.Value,
				"team":              ce.Team,
				"owner_id":          ceb.OwnerID,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"chief_engineers": result})
	})

	router.GET("/api/teamconstructorsbyleague", func(c *gin.Context) {
		leagueID := c.Query("league_id")
		if leagueID == "" {
			c.JSON(400, gin.H{"error": "Falta league_id"})
			return
		}
		var teamConstructorsByLeague []models.TeamConstructorByLeague
		if err := database.DB.Where("league_id = ?", leagueID).Find(&teamConstructorsByLeague).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo equipos"})
			return
		}
		var result []map[string]interface{}
		for _, tcb := range teamConstructorsByLeague {
			var tc models.TeamConstructor
			database.DB.First(&tc, tcb.TeamConstructorID)

			// Buscar pilotos relacionados con este equipo
			var pilots []models.Pilot
			database.DB.Where("teamconstructor_id = ? AND mode = ?", tc.ID, "race").Find(&pilots)

			var pilotNames []string
			for _, pilot := range pilots {
				pilotNames = append(pilotNames, pilot.DriverName)
			}

			item := map[string]interface{}{
				"id":                  tcb.ID,
				"team_constructor_id": tcb.TeamConstructorID,
				"name":                tc.Name,
				"image_url":           tc.ImageURL,
				"value":               tc.Value,
				"owner_id":            tcb.OwnerID,
				"venta":               tcb.Venta,
				"league_id":           tcb.LeagueID,
				"pilots":              pilotNames,
				"pilot_count":         len(pilotNames),
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"team_constructors": result})
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
