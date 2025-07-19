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
	ID              uint      `json:"id" gorm:"primaryKey"`
	PilotByLeagueID uint      `json:"pilot_by_league_id" gorm:"not null"`
	LeagueID        uint      `json:"league_id" gorm:"not null"`
	EndTime         time.Time `json:"end_time" gorm:"not null"`
	Bids            []byte    `json:"bids" gorm:"type:json"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

var marketNextRefresh = time.Now().Add(24 * time.Hour)

func updateMarketNextRefresh() {
	marketNextRefresh = time.Now().Add(24 * time.Hour)
}

func refreshMarketForLeague(leagueID uint) error {
	log.Printf("[refreshMarketForLeague] Refrescando mercado para liga %d", leagueID)
	// 1. Buscar subastas activas (no finalizadas) en la liga
	var activeAuctions []Auction
	database.DB.Where("league_id = ? AND end_time > ?", leagueID, time.Now()).Find(&activeAuctions)
	log.Printf("[refreshMarketForLeague] Subastas activas encontradas: %d", len(activeAuctions))
	// 2. Obtener los pilot_by_league_id ya en subasta
	var activePilotIDs []uint
	for _, a := range activeAuctions {
		activePilotIDs = append(activePilotIDs, a.PilotByLeagueID)
	}
	log.Printf("[refreshMarketForLeague] Pilotos ya en subasta: %v", activePilotIDs)
	// 3. Si hay menos de 5, buscar pilotos libres que no estén ya en subasta
	faltan := 5 - len(activeAuctions)
	if faltan > 0 {
		var libres []models.PilotByLeague
		if len(activePilotIDs) > 0 {
			log.Printf("[refreshMarketForLeague] Buscando %d pilotos libres que no estén en subasta", faltan)
			database.DB.Raw("SELECT * FROM pilot_by_leagues WHERE league_id = ? AND owner_id = 0 AND id NOT IN ? ORDER BY RAND() LIMIT ?", leagueID, activePilotIDs, faltan).Scan(&libres)
		} else {
			log.Printf("[refreshMarketForLeague] Buscando %d pilotos libres (ninguno en subasta)", faltan)
			database.DB.Raw("SELECT * FROM pilot_by_leagues WHERE league_id = ? AND owner_id = 0 ORDER BY RAND() LIMIT ?", leagueID, faltan).Scan(&libres)
		}
		log.Printf("[refreshMarketForLeague] Pilotos libres encontrados: %d", len(libres))
		for _, pbl := range libres {
			log.Printf("[refreshMarketForLeague] Creando subasta para pilot_by_league_id=%d", pbl.ID)
			pbl.Bids = []byte("[]")
			database.DB.Save(&pbl)
			auction := Auction{
				PilotByLeagueID: pbl.ID,
				LeagueID:        leagueID,
				EndTime:         time.Now().Add(24 * time.Hour),
			}
			database.DB.Create(&auction)
			activeAuctions = append(activeAuctions, auction)
			activePilotIDs = append(activePilotIDs, pbl.ID)
		}
	}
	// 4. Generar ofertas de la liga para pilotos en venta (owner_id ≠ 0 y venta activa)
	var enVenta []models.PilotByLeague
	database.DB.Where("league_id = ? AND owner_id != 0 AND venta IS NOT NULL AND venta_expires_at > ?", leagueID, time.Now()).Find(&enVenta)
	for _, pbl := range enVenta {
		var pilot models.Pilot
		database.DB.First(&pilot, pbl.PilotID)
		valor := pilot.Value
		if valor == 0 {
			continue
		}
		// Oferta aleatoria entre -10% y +10%
		min := valor * 0.9
		max := valor * 1.1
		oferta := min + (max-min)*rand.Float64()
		expires := time.Now().Add(24 * time.Hour)
		pbl.LeagueOfferValue = &oferta
		pbl.LeagueOfferExpiresAt = &expires
		database.DB.Save(&pbl)
	}
	// 5. Actualizar market_pilots en la liga con los ids de los pilotos en subasta activa (aunque sea vacío)
	var ids []uint
	for _, a := range activeAuctions {
		ids = append(ids, a.PilotByLeagueID)
	}
	idsJSON, _ := json.Marshal(ids)
	log.Printf("[refreshMarketForLeague] market_pilots a guardar para liga %d: %s", leagueID, string(idsJSON))
	err := database.DB.Model(&models.League{}).Where("id = ?", leagueID).Update("market_pilots", idsJSON).Error
	if err != nil {
		log.Printf("[refreshMarketForLeague] ERROR actualizando market_pilots: %v", err)
	} else {
		log.Printf("[refreshMarketForLeague] market_pilots actualizado correctamente para liga %d", leagueID)
	}
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
		c.JSON(200, gin.H{"pilots": pilots})
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
		league := models.League{
			Name: req.Name,
			Code: req.Code,
		}
		if err := database.DB.Create(&league).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error creando liga"})
			return
		}
		log.Printf("[CREAR LIGA] Liga creada con id=%d, nombre=%s", league.ID, league.Name)
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
		// Obtener el user_id del creador desde el contexto (JWT)
		userID, ok := c.Get("user_id")
		if !ok {
			c.JSON(401, gin.H{"error": "No autenticado"})
			return
		}
		// Comprobar si ya existe el registro en player_by_league para este usuario y liga
		var existing models.PlayerByLeague
		if err := database.DB.Where("player_id = ? AND league_id = ?", userID, league.ID).First(&existing).Error; err == nil {
			log.Printf("El usuario %v ya tiene registro en player_by_league para la liga %d", userID, league.ID)
		} else {
			// Crear el registro en player_by_league solo para el creador
			playerByLeague := models.PlayerByLeague{
				PlayerID:    uint64(userID.(uint)),
				LeagueID:    uint64(league.ID),
				Money:       100000000, // 100M
				TeamValue:   0,
				OwnedPilots: "[]",
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
				"id":           pilot.ID,
				"driver_name":  pilot.DriverName,
				"team":         pilot.Team,
				"image_url":    pilot.ImageURL,
				"mode":         pilot.Mode,
				"total_points": pilot.TotalPoints,
				"value":        pilot.Value,
				"clausula":     pbl.Clausula,
				"owner_id":     pbl.OwnerID,
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
				PilotByLeagueID: pbl.ID,
				LeagueID:        req.LeagueID,
				EndTime:         endTime,
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
		if err := database.DB.First(&pbl, auction.PilotByLeagueID).Error; err != nil {
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
		if len(playerLeague.OwnedPilots) > 0 {
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
				"id":           pilot.ID,
				"driver_name":  pilot.DriverName,
				"team":         pilot.Team,
				"image_url":    pilot.ImageURL,
				"mode":         pilot.Mode,
				"total_points": pilot.TotalPoints,
				"value":        pilot.Value,
				"clausula":     pbl.Clausula,
				"owner_id":     pbl.OwnerID,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"pilots": result})
	})

	// Adaptar la lógica de pujas para NO descontar dinero al pujar
	router.POST("/api/auctions/bid", func(c *gin.Context) {
		var req struct {
			PilotByLeagueID uint    `json:"pilot_by_league_id"`
			LeagueID        uint    `json:"league_id"`
			PlayerID        uint    `json:"player_id"`
			Valor           float64 `json:"valor"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		fmt.Printf("[BID] Recibido: pilot_by_league_id=%v, league_id=%v, player_id=%v, valor=%v\n", req.PilotByLeagueID, req.LeagueID, req.PlayerID, req.Valor)
		var auction Auction
		if err := database.DB.Where("pilot_by_league_id = ? AND league_id = ? AND end_time > ?", req.PilotByLeagueID, req.LeagueID, time.Now()).First(&auction).Error; err != nil {
			// No existe subasta, crearla
			auction = Auction{
				PilotByLeagueID: req.PilotByLeagueID,
				LeagueID:        req.LeagueID,
				EndTime:         time.Now().Add(24 * time.Hour),
				Bids:            []byte("[]"),
			}
			database.DB.Create(&auction)
		}
		fmt.Printf("[BID] auction.Bids antes de parsear: %s\n", string(auction.Bids))
		// Leer bids actuales
		var bids []Bid
		if len(auction.Bids) > 0 {
			_ = json.Unmarshal(auction.Bids, &bids)
		}
		fmt.Printf("[BID] Bids antes de actualizar: %+v\n", bids)
		// Buscar si el jugador ya tiene una puja
		found := false
		for i, b := range bids {
			if b.PlayerID == req.PlayerID {
				fmt.Printf("[BID] Actualizando puja existente de player_id=%v de %v a %v\n", b.PlayerID, bids[i].Valor, req.Valor)
				bids[i].Valor = req.Valor // Actualiza el valor de la puja existente
				found = true
				break
			}
		}
		if !found {
			fmt.Printf("[BID] Añadiendo nueva puja para player_id=%v valor=%v\n", req.PlayerID, req.Valor)
			bids = append(bids, Bid{PlayerID: req.PlayerID, Valor: req.Valor})
		}
		fmt.Printf("[BID] Bids después de actualizar: %+v\n", bids)
		bidsJSON, _ := json.Marshal(bids)
		auction.Bids = bidsJSON
		fmt.Printf("[BID] auction.Bids antes de guardar: %s\n", string(auction.Bids))
		if err := database.DB.Save(&auction).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error guardando la puja"})
			return
		}
		fmt.Printf("[BID] auction.Bids después de guardar: %s\n", string(auction.Bids))
		fmt.Printf("[BID] Bids guardados en DB: %s\n", string(bidsJSON))
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
		var ids []uint
		shouldRefresh := league.MarketPilots == nil || len(league.MarketPilots) == 0
		if league.MarketNextRefresh == nil || league.MarketNextRefresh.Before(time.Now()) {
			shouldRefresh = true
		}
		if shouldRefresh {
			refreshMarketForLeague(league.ID)
			next := time.Now().Add(24 * time.Hour)
			league.MarketNextRefresh = &next
			database.DB.Save(&league)
			database.DB.First(&league, leagueID)
		}
		if league.MarketPilots != nil && len(league.MarketPilots) > 0 {
			_ = json.Unmarshal(league.MarketPilots, &ids)
		}
		log.Printf("IDs leídos de market_pilots para la liga %s: %v", leagueID, ids)
		var libres []models.PilotByLeague
		if len(ids) > 0 {
			database.DB.Where("id IN ?", ids).Find(&libres)
		}
		var result []map[string]interface{}
		for _, pbl := range libres {
			var pilot models.Pilot
			if err := database.DB.First(&pilot, pbl.PilotID).Error; err != nil {
				continue
			}
			// Buscar la subasta activa para este piloto en la liga
			var auction Auction
			numBids := 0
			if err := database.DB.Where("pilot_by_league_id = ? AND league_id = ? AND end_time > ?", pbl.ID, pbl.LeagueID, time.Now()).First(&auction).Error; err == nil {
				if auction.Bids != nil && len(auction.Bids) > 0 {
					var bids []Bid
					_ = json.Unmarshal(auction.Bids, &bids)
					numBids = len(bids)
				}
			}
			item := map[string]interface{}{
				"id":             pbl.ID,
				"clausula":       pbl.Clausula,
				"pilot_id":       pilot.ID,
				"driver_name":    pilot.DriverName,
				"team":           pilot.Team,
				"image_url":      pilot.ImageURL,
				"mode":           pilot.Mode,
				"total_points":   pilot.TotalPoints,
				"value":          pilot.Value,
				"week_points":    0,
				"num_bids":       numBids,
				"is_direct_sale": false,
			}
			result = append(result, item)
		}
		// Añadir pilotos en venta directa de usuarios (venta no nulo y venta_expires_at en el futuro)
		var ventas []models.PilotByLeague
		database.DB.Where("league_id = ? AND venta IS NOT NULL AND venta_expires_at > ?", leagueID, time.Now()).Find(&ventas)
		// Evitar duplicados
		idSet := make(map[uint]bool)
		for _, id := range ids {
			idSet[id] = true
		}
		for _, pbl := range ventas {
			if idSet[pbl.ID] {
				continue
			}
			var pilot models.Pilot
			if err := database.DB.First(&pilot, pbl.PilotID).Error; err != nil {
				continue
			}
			item := map[string]interface{}{
				"id":               pbl.ID,
				"clausula":         pbl.Clausula,
				"pilot_id":         pilot.ID,
				"driver_name":      pilot.DriverName,
				"team":             pilot.Team,
				"image_url":        pilot.ImageURL,
				"mode":             pilot.Mode,
				"total_points":     pilot.TotalPoints,
				"value":            pilot.Value,
				"week_points":      0,
				"venta":            pbl.Venta,
				"venta_expires_at": pbl.VentaExpiresAt,
				"owner_id":         pbl.OwnerID,
				"is_direct_sale":   true,
			}
			result = append(result, item)
		}
		log.Printf("Pilotos que se envían al frontend: %+v", result)
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
		var auctions []Auction
		database.DB.Where("league_id = ? AND end_time > ?", leagueID, time.Now()).Find(&auctions)
		finalizados := 0
		for _, auction := range auctions {
			// Buscar bids
			var bids []Bid
			if len(auction.Bids) > 0 {
				_ = json.Unmarshal(auction.Bids, &bids)
			}
			if len(bids) == 0 {
				continue // No hay pujas, no se asigna
			}
			// Buscar la puja más alta
			maxBid := bids[0]
			for _, bid := range bids {
				if bid.Valor > maxBid.Valor {
					maxBid = bid
				}
			}
			// Asignar el piloto al ganador
			var pbl models.PilotByLeague
			if err := database.DB.First(&pbl, auction.PilotByLeagueID).Error; err != nil {
				continue
			}
			pbl.OwnerID = maxBid.PlayerID
			pbl.Bids = []byte("[]")
			database.DB.Save(&pbl)
			// Actualizar PlayerByLeague del ganador
			var playerLeague models.PlayerByLeague
			if err := database.DB.Where("player_id = ? AND league_id = ?", maxBid.PlayerID, pbl.LeagueID).First(&playerLeague).Error; err != nil {
				continue
			}
			if playerLeague.Money < float64(maxBid.Valor) {
				continue
			}
			playerLeague.Money -= float64(maxBid.Valor)
			// Actualizar owned_pilots y team_value
			var owned []uint
			if len(playerLeague.OwnedPilots) > 0 {
				_ = json.Unmarshal([]byte(playerLeague.OwnedPilots), &owned)
			}
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
			if !alreadyOwned {
				var pilot models.Pilot
				database.DB.First(&pilot, pbl.PilotID)
				playerLeague.TeamValue += pilot.Value
			}
			database.DB.Save(&playerLeague)
			finalizados++
			// Guardar histórico de fichaje (refresh-and-finish)
			errHist := database.DB.Exec(`INSERT INTO pilot_value_history (pilot_id, pilot_by_league_id, league_id, player_id, valor_pagado, fecha, tipo, counterparty_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, pbl.PilotID, pbl.ID, pbl.LeagueID, maxBid.PlayerID, maxBid.Valor, time.Now(), "fichaje", 0).Error
			if errHist != nil {
				log.Printf("[HISTORICO] Error guardando en pilot_value_history (refresh-and-finish): %v", errHist)
			}
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
			PlayerID:    uint64(userID.(uint)),
			LeagueID:    uint64(league.ID),
			Money:       100000000, // 100M
			TeamValue:   0,
			OwnedPilots: "[]",
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
			if err := database.DB.First(&pbl, auction.PilotByLeagueID).Error; err == nil {
				var pilot models.Pilot
				database.DB.First(&pilot, pbl.PilotID)
				c.JSON(200, gin.H{"auction": auction, "pilot_by_league": pbl, "pilot": pilot})
				return
			}
		}
		c.JSON(200, gin.H{"auction": auction})
	})

	// Endpoint para obtener la subasta activa de un piloto en una liga
	router.GET("/api/auctions/by-pilot", func(c *gin.Context) {
		pblID := c.Query("pilot_by_league_id")
		leagueID := c.Query("league_id")
		if pblID == "" || leagueID == "" {
			c.JSON(400, gin.H{"error": "Faltan parámetros"})
			return
		}
		var auction Auction
		if err := database.DB.Where("pilot_by_league_id = ? AND league_id = ? AND end_time > ?", pblID, leagueID, time.Now()).First(&auction).Error; err != nil {
			c.JSON(404, gin.H{"error": "No hay subasta activa para este piloto"})
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
				"clausula":           pbl.Clausula,
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
		if len(playerLeague.OwnedPilots) > 0 {
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
				"clausula":                pbl.Clausula,
				"owner_id":                pbl.OwnerID,
				"league_offer_value":      pbl.LeagueOfferValue,
				"league_offer_expires_at": pbl.LeagueOfferExpiresAt,
			}
			result = append(result, item)
		}
		c.JSON(200, gin.H{"sales": result})
	})

	// Endpoint para obtener los pilotos donde el usuario tiene pujas activas pero no es propietario
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
				var pbl models.PilotByLeague
				if err := database.DB.First(&pbl, auction.PilotByLeagueID).Error; err != nil {
					continue
				}
				if pbl.OwnerID == userID {
					continue // No mostrar si es propietario
				}
				var pilot models.Pilot
				database.DB.First(&pilot, pbl.PilotID)
				item := map[string]interface{}{
					"id":               pbl.ID,
					"pilot_id":         pilot.ID,
					"driver_name":      pilot.DriverName,
					"team":             pilot.Team,
					"image_url":        pilot.ImageURL,
					"value":            pilot.Value,
					"venta":            pbl.Venta,
					"venta_expires_at": pbl.VentaExpiresAt,
					"clausula":         pbl.Clausula,
					"owner_id":         pbl.OwnerID,
					"my_bid":           myBidValue,
				}
				result = append(result, item)
			}
		}
		c.JSON(200, gin.H{"bids": result})
	})

	// Endpoint para eliminar la puja de un usuario sobre un piloto en una liga
	router.POST("/api/auctions/remove-bid", authMiddleware(), func(c *gin.Context) {
		var req struct {
			PilotByLeagueID uint `json:"pilot_by_league_id"`
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
		var auction Auction
		if err := database.DB.Where("pilot_by_league_id = ? AND league_id = ? AND end_time > ?", req.PilotByLeagueID, req.LeagueID, time.Now()).First(&auction).Error; err != nil {
			c.JSON(404, gin.H{"error": "No hay subasta activa para este piloto"})
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
