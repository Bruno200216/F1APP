package main

import (
	"f1-fantasy-app/database"
	"f1-fantasy-app/models"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"gorm.io/gorm"
)

// Estructura para los datos del piloto extraídos del scraper (qualifying)
type ScrapedDriverData struct {
	Position     int    `json:"position"`
	DriverNumber string `json:"driver_number"`
	DriverName   string `json:"driver_name"`
	DriverCode   string `json:"driver_code"`
	Team         string `json:"team"`
	Q1Time       string `json:"q1_time"`
	Q2Time       string `json:"q2_time"`
	Q3Time       string `json:"q3_time"`
	Laps         string `json:"laps"`
}

// Estructura para los datos del piloto extraídos del scraper (race)
type ScrapedRaceData struct {
	Position     int    `json:"position"`
	DriverNumber string `json:"driver_number"`
	DriverName   string `json:"driver_name"`
	DriverCode   string `json:"driver_code"`
	Team         string `json:"team"`
	Time         string `json:"time"`
	Points       string `json:"points"`
	Status       string `json:"status"`
	Laps         string `json:"laps"`
}

// Estructura para la respuesta del scraper
type ScraperResponse struct {
	Success bool                `json:"success"`
	Message string              `json:"message"`
	Data    []ScrapedDriverData `json:"data"`
	GPKey   string              `json:"gp_key"`
}

// Función principal del scraper
func RunScraper(gpKey string) error {
	// Agregar defer con recover para capturar panics
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[SCRAPER] PANIC RECUPERADO: %v", r)
		}
	}()

	log.Printf("[SCRAPER] ===== FUNCIÓN RunScraper LLAMADA CON: '%s' =====", gpKey)
	log.Printf("[SCRAPER] Iniciando scraper para GP: %s", gpKey)

	// Obtener el índice del GP
	log.Printf("[SCRAPER] Obteniendo índice del GP...")
	gpIndex, err := getGPIndexFromKey(gpKey)
	if err != nil {
		log.Printf("[SCRAPER] ERROR obteniendo GP index: %v", err)
		return fmt.Errorf("error obteniendo GP index: %v", err)
	}
	log.Printf("[SCRAPER] GP index obtenido exitosamente: %d", gpIndex)

	// Obtener el ID y slug del GP para las URLs
	log.Printf("[SCRAPER] ===== PREPARANDO URLs =====")
	gpID := getGPIDFromKey(gpKey)
	slug := getGPSlugFromKey(gpKey)
	log.Printf("[SCRAPER] ID del GP para URL: %s", gpID)
	log.Printf("[SCRAPER] Slug del GP para URL: %s", slug)

	// Helper local para intentar obtener doc por sesión
	fetchSession := func(session string) (*goquery.Document, string) {
		var candidateURLs []string
		if session == "qualifying" {
			candidateURLs = []string{
				fmt.Sprintf("https://www.formula1.com/en/results/2025/races/%s/%s/qualifying", gpID, slug),
			}
		} else if session == "race" {
			candidateURLs = []string{
				fmt.Sprintf("https://www.formula1.com/en/results/2025/races/%s/%s/race-result", gpID, slug),
				fmt.Sprintf("https://www.formula1.com/en/results/2025/races/%s/%s/race", gpID, slug),
			}
		}

		for _, url := range candidateURLs {
			log.Printf("[SCRAPER] Intentando %s: %s", session, url)
			resp, err := http.Get(url)
			if err != nil {
				log.Printf("[SCRAPER] Error HTTP con %s: %v", session, err)
				continue
			}
			if resp.StatusCode == 200 {
				log.Printf("[SCRAPER] %s: Status 200 OK", session)
				doc, e := goquery.NewDocumentFromReader(resp.Body)
				resp.Body.Close()
				if e == nil {
					log.Printf("[SCRAPER] %s: HTML parseado correctamente", session)
					return doc, url
				}
				log.Printf("[SCRAPER] %s: Error parseando HTML: %v", session, e)
			} else {
				log.Printf("[SCRAPER] %s: Status %d (no válido)", session, resp.StatusCode)
				resp.Body.Close()
			}
		}
		return nil, ""
	}

	// Intentar QUALIFYING
	log.Printf("[SCRAPER] ===== BUSCANDO QUALIFYING =====")
	qualDoc, qualURL := fetchSession("qualifying")
	if qualDoc != nil {
		log.Printf("[SCRAPER] ===== SESIÓN ENCONTRADA: qualifying =====")
		log.Printf("[SCRAPER] URL final: %s", qualURL)
		log.Printf("[SCRAPER] Extrayendo datos de qualifying...")
		driverData, err := extractDriverDataFromTable(qualDoc)
		if err != nil {
			log.Printf("[SCRAPER] ERROR extrayendo datos de qualifying: %v", err)
		} else {
			log.Printf("[SCRAPER] Datos extraídos de qualifying: %d pilotos", len(driverData))
			for _, driver := range driverData {
				if err := processDriverData(driver, gpIndex); err != nil {
					log.Printf("[SCRAPER] Error procesando piloto qualifying %s: %v", driver.DriverName, err)
					continue
				}
			}
		}
	} else {
		log.Printf("[SCRAPER] No se encontró qualifying disponible")
	}

	// Intentar RACE
	log.Printf("[SCRAPER] ===== BUSCANDO RACE =====")
	raceDoc, raceURL := fetchSession("race")
	if raceDoc != nil {
		log.Printf("[SCRAPER] ===== SESIÓN ENCONTRADA: race =====")
		log.Printf("[SCRAPER] URL final: %s", raceURL)
		log.Printf("[SCRAPER] Extrayendo datos de race...")
		raceData, err := extractRaceDataFromTable(raceDoc)
		if err != nil {
			log.Printf("[SCRAPER] ERROR extrayendo datos de race: %v", err)
		} else {
			log.Printf("[SCRAPER] Datos extraídos de race: %d pilotos", len(raceData))
			for _, driver := range raceData {
				if err := processRaceDriverData(driver, gpIndex); err != nil {
					log.Printf("[SCRAPER] Error procesando piloto race %s: %v", driver.DriverName, err)
					continue
				}
			}
		}
	} else {
		log.Printf("[SCRAPER] No se encontró race disponible")
	}

	// Practice (última disponible)
	log.Printf("[SCRAPER] Llamando a scrapeLastPractice...")
	if err := scrapeLastPractice(gpKey, gpIndex); err != nil {
		log.Printf("[SCRAPER] Aviso: no se pudo procesar Practice: %v", err)
	}

	log.Printf("[SCRAPER] ===== SCRAPER COMPLETADO =====")
	log.Printf("[SCRAPER] GP: %s (índice: %d)", gpKey, gpIndex)
	log.Printf("[SCRAPER] Scraper completado exitosamente")
	log.Printf("[SCRAPER] Retornando nil (sin errores)")
	return nil
}

// Extraer datos de la tabla de resultados
func extractDriverDataFromTable(doc *goquery.Document) ([]ScrapedDriverData, error) {
	var driverData []ScrapedDriverData

	log.Printf("[SCRAPER] Iniciando extracción de datos de qualifying")
	log.Printf("[SCRAPER] Buscando tabla con selector: table.f1-table-with-data tbody tr")

	// Buscar la tabla de resultados específica de F1
	tableRows := doc.Find("table.f1-table-with-data tbody tr")
	log.Printf("[SCRAPER] Filas de tabla encontradas: %d", tableRows.Length())

	tableRows.Each(func(i int, s *goquery.Selection) {
		// Extraer datos de cada fila
		position := extractPosition(s)
		driverNumber := extractDriverNumber(s)
		driverName := extractDriverName(s)
		driverCode := extractDriverCode(s)
		team := extractTeam(s)
		q1Time := extractQ1Time(s)
		q2Time := extractQ2Time(s)
		q3Time := extractQ3Time(s)
		laps := extractLaps(s)

		// Aplicar mapeo de pilotos si es necesario
		mappedDriverName := mapDriverName(driverName)

		log.Printf("[SCRAPER] Qualifying row %d: Pos=%d, Driver=%s, Code=%s, Team=%s, Q1=%s, Q2=%s, Q3=%s, Laps=%s",
			i+1, position, mappedDriverName, driverCode, team, q1Time, q2Time, q3Time, laps)

		// Solo agregar si tenemos datos válidos
		if position > 0 && mappedDriverName != "" {
			driver := ScrapedDriverData{
				Position:     position,
				DriverNumber: driverNumber,
				DriverName:   mappedDriverName,
				DriverCode:   driverCode,
				Team:         team,
				Q1Time:       q1Time,
				Q2Time:       q2Time,
				Q3Time:       q3Time,
				Laps:         laps,
			}
			driverData = append(driverData, driver)
		}
	})

	log.Printf("[SCRAPER] Total de pilotos extraídos: %d", len(driverData))
	return driverData, nil
}

// Extraer datos de la tabla de resultados (race)
func extractRaceDataFromTable(doc *goquery.Document) ([]ScrapedRaceData, error) {
	var raceData []ScrapedRaceData

	log.Printf("[SCRAPER] Iniciando extracción de datos de race")
	log.Printf("[SCRAPER] Buscando tabla con selector: table.f1-table-with-data tbody tr")

	// Buscar la tabla de resultados específica de F1
	tableRows := doc.Find("table.f1-table-with-data tbody tr")
	log.Printf("[SCRAPER] Filas de tabla encontradas: %d", tableRows.Length())

	tableRows.Each(func(i int, s *goquery.Selection) {
		// Columnas esperadas en Race (2025):
		// 0 Pos | 1 No | 2 Driver | 3 Car | 4 Laps | 5 Time/Retired | 6 PTS
		position := extractPosition(s)
		driverNumber := extractDriverNumber(s)
		// Nombre en la 3ª columna; puede venir con mayúsculas parciales → normalizar
		cells := s.Find("td")
		var driverCellText string
		if cells.Length() >= 3 {
			driverCellText = strings.TrimSpace(cells.Eq(2).Text())
		}
		nameCandidate, _ := parseDriverCell(driverCellText)
		mappedDriverName := mapDriverName(normalizeDriverName(nameCandidate))

		driverCode := extractDriverCode(s) // si no hay código, quedará ""
		team := extractTeam(s)             // Car (equipo)
		laps := extractRaceLaps(s)
		time := extractRaceTime(s)     // Time/Retired
		points := extractRacePoints(s) // PTS
		status := deriveRaceStatusFromTime(time)

		log.Printf("[SCRAPER] Race row %d: Pos=%d, Driver=%s, Code=%s, Team=%s, Laps=%s, Time=%s, Points=%s, Status=%s",
			i+1, position, mappedDriverName, driverCode, team, laps, time, points, status)

		// Solo agregar si tenemos datos válidos
		if position > 0 && mappedDriverName != "" {
			driver := ScrapedRaceData{
				Position:     position,
				DriverNumber: driverNumber,
				DriverName:   mappedDriverName,
				DriverCode:   driverCode,
				Team:         team,
				Time:         time,
				Points:       points,
				Status:       status,
				Laps:         laps,
			}
			raceData = append(raceData, driver)
		}
	})

	log.Printf("[SCRAPER] Total de pilotos de race extraídos: %d", len(raceData))
	return raceData, nil
}

// Extraer posición del piloto
func extractPosition(s *goquery.Selection) int {
	positionText := strings.TrimSpace(s.Find("td").First().Text())
	if positionText == "" {
		return 0
	}

	// Limpiar el texto y convertir a entero
	positionText = strings.TrimSpace(positionText)
	position, err := strconv.Atoi(positionText)
	if err != nil {
		return 0
	}
	return position
}

// Extraer número del piloto
func extractDriverNumber(s *goquery.Selection) string {
	// Buscar en la segunda columna (número del piloto)
	cells := s.Find("td")
	if cells.Length() < 2 {
		return ""
	}

	numberText := strings.TrimSpace(cells.Eq(1).Text())
	return numberText
}

// Extraer nombre del piloto
func extractDriverName(s *goquery.Selection) string {
	// Buscar en la tercera columna (nombre del piloto)
	cells := s.Find("td")
	if cells.Length() < 3 {
		return ""
	}

	// Buscar el texto del nombre del piloto
	cellText := strings.TrimSpace(cells.Eq(2).Text())
	name, _ := parseDriverCell(cellText)
	return name
}

// Extraer código del piloto
func extractDriverCode(s *goquery.Selection) string {
	// Buscar en la tercera columna y extraer el código de 3 letras
	cells := s.Find("td")
	if cells.Length() < 3 {
		return ""
	}

	cellText := strings.TrimSpace(cells.Eq(2).Text())
	_, code := parseDriverCell(cellText)
	return code
}

// Extraer equipo
func extractTeam(s *goquery.Selection) string {
	// Buscar en la cuarta columna (equipo)
	cells := s.Find("td")
	if cells.Length() < 4 {
		return ""
	}

	teamText := strings.TrimSpace(cells.Eq(3).Text())
	return teamText
}

// Extraer tiempo Q1
func extractQ1Time(s *goquery.Selection) string {
	// Buscar en la quinta columna (Q1)
	cells := s.Find("td")
	if cells.Length() < 5 {
		return ""
	}

	q1Text := strings.TrimSpace(cells.Eq(4).Text())
	return q1Text
}

// Extraer tiempo Q2
func extractQ2Time(s *goquery.Selection) string {
	// Buscar en la sexta columna (Q2)
	cells := s.Find("td")
	if cells.Length() < 6 {
		return ""
	}

	q2Text := strings.TrimSpace(cells.Eq(5).Text())
	return q2Text
}

// Extraer tiempo Q3
func extractQ3Time(s *goquery.Selection) string {
	// Buscar en la séptima columna (Q3)
	cells := s.Find("td")
	if cells.Length() < 7 {
		return ""
	}

	q3Text := strings.TrimSpace(cells.Eq(6).Text())
	return q3Text
}

// Extraer número de vueltas
func extractLaps(s *goquery.Selection) string {
	// Buscar en la octava columna (vueltas)
	cells := s.Find("td")
	if cells.Length() < 8 {
		return ""
	}

	lapsText := strings.TrimSpace(cells.Eq(7).Text())
	return lapsText
}

// Extraer tiempo de carrera
func extractRaceTime(s *goquery.Selection) string {
	cells := s.Find("td")
	if cells.Length() < 6 {
		return ""
	}
	return strings.TrimSpace(cells.Eq(5).Text())
}

// Extraer puntos de carrera
func extractRacePoints(s *goquery.Selection) string {
	cells := s.Find("td")
	if cells.Length() < 7 {
		return ""
	}
	return strings.TrimSpace(cells.Eq(6).Text())
}

// Extraer laps de carrera (columna 5 visual → índice 4)
func extractRaceLaps(s *goquery.Selection) string {
	cells := s.Find("td")
	if cells.Length() < 5 {
		return ""
	}
	return strings.TrimSpace(cells.Eq(4).Text())
}

// Derivar estado a partir de "Time/Retired"
func deriveRaceStatusFromTime(timeCell string) string {
	t := strings.ToLower(strings.TrimSpace(timeCell))
	if t == "" {
		return ""
	}
	// Heurística simple: si contiene palabras comunes de retiro/penalización
	keywords := []string{"dnf", "dns", "dsq", "retired", "wheel", "gearbox", "engine", "accident"}
	for _, kw := range keywords {
		if strings.Contains(t, kw) {
			return timeCell
		}
	}
	return ""
}

// Normalizar nombre del piloto a Title Case y colapsar espacios
func normalizeDriverName(name string) string {
	n := strings.TrimSpace(name)
	if n == "" {
		return ""
	}
	// Quitar dobles espacios
	n = strings.Join(strings.Fields(n), " ")
	// Pasar a minúsculas y luego Title Case palabra por palabra
	parts := strings.Fields(strings.ToLower(n))
	for i, p := range parts {
		if len(p) == 0 {
			continue
		}
		runes := []rune(p)
		runes[0] = []rune(strings.ToUpper(string(runes[0])))[0]
		parts[i] = string(runes)
	}
	return strings.Join(parts, " ")
}

// Verificar si un string está en mayúsculas
func isUpperCase(s string) bool {
	for _, r := range s {
		if r < 'A' || r > 'Z' {
			return false
		}
	}
	return true
}

// parseDriverCell divide el contenido de la celda del piloto en nombre y código (3 letras al final, con o sin espacio)
var driverCodeSuffixRe = regexp.MustCompile(`([A-Z]{3})$`)

func parseDriverCell(text string) (string, string) {
	t := strings.TrimSpace(text)
	if t == "" {
		return "", ""
	}
	if loc := driverCodeSuffixRe.FindStringIndex(t); loc != nil {
		code := t[loc[0]:loc[1]]
		name := strings.TrimSpace(t[:loc[0]])
		if name != "" && isUpperCase(code) && len(code) == 3 {
			return name, code
		}
	}
	// Fallback: separar por palabras y revisar último token
	parts := strings.Fields(t)
	if len(parts) > 1 {
		last := parts[len(parts)-1]
		if len(last) == 3 && isUpperCase(last) {
			return strings.Join(parts[:len(parts)-1], " "), last
		}
	}
	return t, ""
}

// Guardar datos en la base de datos
func saveDriverDataToDatabase(gpKey string, driverData []ScrapedDriverData) error {
	log.Printf("[SCRAPER] Guardando %d registros de pilotos en la base de datos", len(driverData))

	// Obtener el índice del GP
	gpIndex, err := getGPIndexFromKey(gpKey)
	if err != nil {
		return fmt.Errorf("error obteniendo índice del GP: %v", err)
	}

	// Procesar cada piloto
	for _, driver := range driverData {
		if err := processDriverData(driver, gpIndex); err != nil {
			log.Printf("[SCRAPER] Error procesando piloto %s: %v", driver.DriverName, err)
			continue
		}
	}

	return nil
}

// Obtener el índice del GP desde la clave
func getGPIndexFromKey(gpKey string) (uint64, error) {
	log.Printf("[SCRAPER] ===== FUNCIÓN getGPIndexFromKey LLAMADA CON: '%s' =====", gpKey)

	// Normalizar clave entrante (ej.: "japanese_grand_prix" -> "japanese")
	key := strings.ToLower(strings.TrimSpace(gpKey))
	key = strings.ReplaceAll(key, "-", "_")
	if strings.HasSuffix(key, "_grand_prix") {
		key = strings.TrimSuffix(key, "_grand_prix")
	}

	log.Printf("[SCRAPER] DEBUG: GP key original: '%s', normalizada: '%s'", gpKey, key)
	log.Printf("[SCRAPER] Buscando en gpKeyMap...")

	// Mapeo de claves a índices (basado en la base de datos REAL)
	gpKeyMap := map[string]uint64{
		"australian":         1,  // Australian Grand Prix
		"australia":          1,  // Alias
		"chinese":            2,  // Chinese Grand Prix
		"chinese_grand_prix": 2,  // Alias para compatibilidad
		"china":              2,  // Alias
		"japanese":           3,  // Japanese Grand Prix
		"japan":              3,  // Alias
		"bahrain":            4,  // Bahrain Grand Prix
		"saudi_arabian":      5,  // Saudi Arabian Grand Prix
		"saudi_arabia":       5,  // Alias
		"saudi":              5,  // Alias
		"miami":              6,  // Miami Grand Prix
		"emilia_romagna":     7,  // Emilia Romagna Grand Prix
		"emilia":             7,  // Alias
		"monaco":             8,  // Monaco Grand Prix
		"spanish":            9,  // Spanish Grand Prix
		"spain":              9,  // Alias
		"canadian":           10, // Canadian Grand Prix
		"canada":             10, // Alias
		"austrian":           11, // Austrian Grand Prix
		"austria":            11, // Alias
		"british":            12, // British Grand Prix
		"great_britain":      12, // Alias
		"britain":            12, // Alias
		"belgian":            13, // Belgian Grand Prix
		"belgium":            13, // Alias
		"hungarian":          14, // Hungarian Grand Prix
		"hungary":            14, // Alias
		"dutch":              15, // Dutch Grand Prix
		"netherlands":        15, // Alias
		"italian":            16, // Italian Grand Prix
		"italy":              16, // Alias
		"azerbaijan":         17, // Azerbaijan Grand Prix
		"singapore":          18, // Singapore Grand Prix
		"united_states":      19, // United States Grand Prix
		"usa":                19, // Alias
		"mexican":            20, // Mexican Grand Prix
		"mexico":             20, // Alias
		"brazilian":          21, // Brazilian Grand Prix
		"brazil":             21, // Alias
		"las_vegas":          22, // Las Vegas Grand Prix
		"qatar":              23, // Qatar Grand Prix
		"abu_dhabi":          24, // Abu Dhabi Grand Prix
	}

	log.Printf("[SCRAPER] DEBUG: Buscando clave '%s' en mapa (tamaño: %d)", key, len(gpKeyMap))

	if index, exists := gpKeyMap[key]; exists {
		log.Printf("[SCRAPER] DEBUG: Clave '%s' encontrada, índice: %d", key, index)
		return index, nil
	}

	log.Printf("[SCRAPER] DEBUG: Clave '%s' NO encontrada en mapa", key)
	return 0, fmt.Errorf("clave de GP no válida: %s (normalizada: %s)", gpKey, key)
}

// Procesar datos de un piloto individual (qualifying)
func processDriverData(driver ScrapedDriverData, gpIndex uint64) error {
	// Buscar el piloto en la base de datos por nombre Y modo "Q" (qualifying)
	var pilot models.Pilot
	result := database.DB.Where("driver_name = ? AND mode = ?", driver.DriverName, "Q").First(&pilot)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// No cortar el flujo si no existe. Solo informar de manera informativa.
			log.Printf("[SCRAPER] INFO: Piloto '%s' (Q) no está en la base de datos; se omite.", driver.DriverName)
			return nil
		} else {
			return fmt.Errorf("error buscando piloto: %v", result.Error)
		}
	}

	// Actualizar o crear registro de qualifying
	if err := updateQualifyingData(pilot.ID, gpIndex, driver); err != nil {
		return fmt.Errorf("error actualizando datos de qualifying: %v", err)
	}

	return nil
}

// Procesar datos de un piloto individual (race)
func processRaceDriverData(driver ScrapedRaceData, gpIndex uint64) error {
	// Buscar el piloto en la base de datos por nombre Y modo "R" (race)
	var pilot models.Pilot
	result := database.DB.Where("driver_name = ? AND mode = ?", driver.DriverName, "R").First(&pilot)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			log.Printf("[SCRAPER] INFO: Piloto '%s' (R) no está en la base de datos; se omite.", driver.DriverName)
			return nil
		} else {
			return fmt.Errorf("error buscando piloto: %v", result.Error)
		}
	}

	// Actualizar o crear registro de race
	if err := updateRaceData(pilot.ID, gpIndex, driver); err != nil {
		return fmt.Errorf("error actualizando datos de race: %v", err)
	}

	return nil
}

// Función para calcular puntos de qualifying (1º=10, 2º=9, ..., 10º=1)
func getQualifyingPoints(position int) int {
	if position < 1 || position > 10 {
		return 0
	}
	// 1º = 10 pts, 2º = 9 pts, ..., 10º = 1 pt
	return 11 - position
}

// Actualizar datos de qualifying
func updateQualifyingData(pilotID uint, gpIndex uint64, driver ScrapedDriverData) error {
	// Buscar si ya existe un registro para este piloto en este GP
	var qualyData models.PilotQualy
	result := database.DB.Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).First(&qualyData)

	// Convertir posición a entero
	position := driver.Position

	// Calcular puntos de qualifying
	points := getQualifyingPoints(position)

	// Crear o actualizar datos
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Crear nuevo registro
			qualyData = models.PilotQualy{
				PilotID:          pilotID,
				GPIndex:          gpIndex,
				FinishPosition:   position,
				ExpectedPosition: 0,      // Por defecto
				DeltaPosition:    0,      // Por defecto
				Points:           points, // Puntos calculados según posición
				CausedRedFlag:    false,
			}

			if err := database.DB.Create(&qualyData).Error; err != nil {
				return fmt.Errorf("error creando datos de qualifying: %v", err)
			}
		} else {
			return fmt.Errorf("error buscando datos de qualifying: %v", result.Error)
		}
	} else {
		// Actualizar registro existente
		qualyData.FinishPosition = position
		qualyData.Points = points   // Actualizar puntos según nueva posición
		qualyData.DeltaPosition = 0 // Calcular después si es necesario

		if err := database.DB.Save(&qualyData).Error; err != nil {
			return fmt.Errorf("error actualizando datos de qualifying: %v", err)
		}
	}

	return nil
}

// Actualizar datos de race
func updateRaceData(pilotID uint, gpIndex uint64, driver ScrapedRaceData) error {
	// Buscar si ya existe un registro para este piloto en este GP
	var raceData models.PilotRace
	result := database.DB.Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).First(&raceData)

	// Convertir posición a entero
	position := driver.Position

	// Convertir puntos a entero
	points := 0
	if driver.Points != "" {
		if p, err := strconv.Atoi(driver.Points); err == nil {
			points = p
		}
	}

	// Crear o actualizar datos
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Crear nuevo registro
			raceData = models.PilotRace{
				PilotID:          pilotID,
				GPIndex:          gpIndex,
				FinishPosition:   position,
				ExpectedPosition: 0,      // Por defecto
				DeltaPosition:    0,      // Por defecto
				Points:           points, // Puntos de la carrera
			}

			if err := database.DB.Create(&raceData).Error; err != nil {
				return fmt.Errorf("error creando datos de race: %v", err)
			}
		} else {
			return fmt.Errorf("error buscando datos de race: %v", result.Error)
		}
	} else {
		// Actualizar registro existente
		raceData.FinishPosition = position
		raceData.Points = points
		raceData.DeltaPosition = 0 // Calcular después si es necesario

		if err := database.DB.Save(&raceData).Error; err != nil {
			return fmt.Errorf("error actualizando datos de race: %v", err)
		}
	}

	return nil
}

// Función para obtener datos del scraper (para debugging)
func GetScraperData(gpKey string) (*ScraperResponse, error) {
	log.Printf("[SCRAPER] Obteniendo datos del scraper para GP: %s", gpKey)

	// Construir la URL
	url := fmt.Sprintf("https://www.formula1.com/en/results/2025/races/1255/%s/qualifying", gpKey)

	// Realizar la petición HTTP
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("error haciendo petición HTTP: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("error en respuesta HTTP: %d", resp.StatusCode)
	}

	// Parsear el HTML
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error parseando HTML: %v", err)
	}

	// Extraer datos
	driverData, err := extractDriverDataFromTable(doc)
	if err != nil {
		return nil, fmt.Errorf("error extrayendo datos: %v", err)
	}

	// Crear respuesta
	response := &ScraperResponse{
		Success: true,
		Message: fmt.Sprintf("Datos extraídos exitosamente para GP: %s", gpKey),
		Data:    driverData,
		GPKey:   gpKey,
	}

	return response, nil
}

// --- NUEVO: Soporte para Practice ---

// Estructura para los datos del piloto extraídos del scraper (practice)
type ScrapedPracticeData struct {
	Position     int    `json:"position"`
	DriverNumber string `json:"driver_number"`
	DriverName   string `json:"driver_name"`
	DriverCode   string `json:"driver_code"`
	Team         string `json:"team"`
	Time         string `json:"time"`
	Laps         string `json:"laps"`
}

// Extraer datos de la tabla de resultados (practice)
func extractPracticeDataFromTable(doc *goquery.Document) ([]ScrapedPracticeData, error) {
	var practiceData []ScrapedPracticeData

	log.Printf("[SCRAPER] Iniciando extracción de datos de practice")
	log.Printf("[SCRAPER] Buscando tabla con selector: table.f1-table-with-data tbody tr")

	// Buscar la tabla de resultados específica de F1
	tableRows := doc.Find("table.f1-table-with-data tbody tr")
	log.Printf("[SCRAPER] Filas de tabla encontradas: %d", tableRows.Length())

	tableRows.Each(func(i int, s *goquery.Selection) {
		position := extractPosition(s)
		driverNumber := extractDriverNumber(s)
		driverName := extractDriverName(s)
		driverCode := extractDriverCode(s)
		team := extractTeam(s)
		time := extractPracticeTime(s) // Usar función específica para practice
		laps := extractPracticeLaps(s)

		// Aplicar mapeo de pilotos si es necesario
		mappedDriverName := mapDriverName(driverName)

		log.Printf("[SCRAPER] Practice row %d: Pos=%d, Driver=%s, Code=%s, Team=%s, Time=%s, Laps=%s",
			i+1, position, mappedDriverName, driverCode, team, time, laps)

		if position > 0 && mappedDriverName != "" {
			practiceData = append(practiceData, ScrapedPracticeData{
				Position:     position,
				DriverNumber: driverNumber,
				DriverName:   mappedDriverName,
				DriverCode:   driverCode,
				Team:         team,
				Time:         time,
				Laps:         laps,
			})
		}
	})

	log.Printf("[SCRAPER] Total de pilotos de practice extraídos: %d", len(practiceData))
	return practiceData, nil
}

// Tiempo en Practice: normalmente la 5ª columna (mejor tiempo)
func extractPracticeTime(s *goquery.Selection) string {
	cells := s.Find("td")
	if cells.Length() < 5 {
		return ""
	}
	return strings.TrimSpace(cells.Eq(4).Text()) // 5ª columna (índice 4)
}

// Laps en Practice: normalmente última columna de la fila
func extractPracticeLaps(s *goquery.Selection) string {
	cells := s.Find("td")
	if cells.Length() == 0 {
		return ""
	}
	return strings.TrimSpace(cells.Last().Text())
}

// Mapeo de puntos de Practice para el Top 10: 5,5,4,4,3,3,2,2,1,1
func getPracticePoints(position int) int {
	if position < 1 || position > 10 {
		return 0
	}
	points := []int{0, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1}
	return points[position]
}

// Procesar datos de un piloto individual (practice)
func processPracticeDriverData(driver ScrapedPracticeData, gpIndex uint64) error {
	var pilot models.Pilot
	result := database.DB.Where("driver_name = ? AND mode = ?", driver.DriverName, "P").First(&pilot)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			log.Printf("[SCRAPER] INFO: Piloto '%s' (P) no está en la base de datos; se omite.", driver.DriverName)
			return nil
		}
		return fmt.Errorf("error buscando piloto: %v", result.Error)
	}

	if err := updatePracticeData(pilot.ID, gpIndex, driver); err != nil {
		return fmt.Errorf("error actualizando datos de practice: %v", err)
	}
	return nil
}

// Crear/Actualizar datos de Practice
func updatePracticeData(pilotID uint, gpIndex uint64, driver ScrapedPracticeData) error {
	var practiceData models.PilotPractice
	result := database.DB.Where("pilot_id = ? AND gp_index = ?", pilotID, gpIndex).First(&practiceData)

	position := driver.Position
	points := getPracticePoints(position)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			practiceData = models.PilotPractice{
				PilotID:          pilotID,
				GPIndex:          gpIndex,
				FinishPosition:   position,
				ExpectedPosition: 0,
				DeltaPosition:    0,
				Points:           points,
				CausedRedFlag:    false,
			}
			if err := database.DB.Create(&practiceData).Error; err != nil {
				return fmt.Errorf("error creando datos de practice: %v", err)
			}
		} else {
			return fmt.Errorf("error buscando datos de practice: %v", result.Error)
		}
	} else {
		practiceData.FinishPosition = position
		practiceData.Points = points
		practiceData.DeltaPosition = 0
		if err := database.DB.Save(&practiceData).Error; err != nil {
			return fmt.Errorf("error actualizando datos de practice: %v", err)
		}
	}
	return nil
}

// Intentar obtener la última Practice disponible para el GP dado (P3 -> P2 -> P1)
func scrapeLastPractice(gpKey string, gpIndex uint64) error {
	practiceNumbers := []int{3, 2, 1}
	var chosen string
	var chosenURL string

	var data []ScrapedPracticeData
	var err error

	log.Printf("[SCRAPER] ===== BUSCANDO ÚLTIMA PRACTICE DISPONIBLE =====")

	// Obtener el ID correcto del GP para la URL de F1
	gpID := getGPIDFromKey(gpKey)
	// Obtener el slug correcto del GP
	slug := getGPSlugFromKey(gpKey)

	for _, n := range practiceNumbers {
		url := fmt.Sprintf("https://www.formula1.com/en/results/2025/races/%s/%s/practice/%d", gpID, slug, n)
		log.Printf("[SCRAPER] Intentando Practice %d: %s", n, url)

		resp, e := http.Get(url)
		if e != nil {
			log.Printf("[SCRAPER] Error HTTP Practice %d: %v", n, e)
			continue
		}

		if resp.StatusCode == 200 {
			log.Printf("[SCRAPER] Practice %d: Status 200 OK", n)

			if d, e2 := goquery.NewDocumentFromReader(resp.Body); e2 == nil {
				log.Printf("[SCRAPER] Practice %d: HTML parseado correctamente", n)

				if data, err = extractPracticeDataFromTable(d); err == nil && len(data) > 0 {
					chosen = fmt.Sprintf("practice/%d", n)
					chosenURL = url
					log.Printf("[SCRAPER] Practice %d: Datos extraídos exitosamente (%d pilotos)", n, len(data))
					break
				} else {
					log.Printf("[SCRAPER] Practice %d: Error extrayendo datos o tabla vacía", n)
				}
			} else {
				log.Printf("[SCRAPER] Practice %d: Error parseando HTML: %v", n, e2)
			}
		} else {
			log.Printf("[SCRAPER] Practice %d: Status %d (no válido)", n, resp.StatusCode)
		}

		resp.Body.Close()
	}

	if len(data) == 0 {
		return fmt.Errorf("no se encontró ninguna tabla de Practice con resultados")
	}

	log.Printf("[SCRAPER] ===== PRACTICE SELECCIONADA: %s =====", chosen)
	log.Printf("[SCRAPER] URL final: %s", chosenURL)
	log.Printf("[SCRAPER] Datos extraídos: %d pilotos", len(data))
	logPracticePositions(data)

	for _, d := range data {
		if err := processPracticeDriverData(d, gpIndex); err != nil {
			log.Printf("[SCRAPER] Error procesando piloto practice %s: %v", d.DriverName, err)
			continue
		}
	}
	log.Printf("[SCRAPER] Practice procesada exitosamente: %s", chosen)
	return nil
}

// Función para descubrir la estructura real de URLs de F1.com
func discoverF1URLStructure() {
	log.Printf("[SCRAPER] 🔍 DESCUBRIENDO ESTRUCTURA REAL DE F1.COM...")

	// Probar página principal de resultados
	url := "https://www.formula1.com/en/results"
	log.Printf("[SCRAPER] Probando página principal: %s", url)

	resp, err := http.Get(url)
	if err != nil {
		log.Printf("[SCRAPER] Error accediendo a página principal: %v", err)
		return
	}
	defer resp.Body.Close()

	log.Printf("[SCRAPER] Página principal Status: %d", resp.StatusCode)

	if resp.StatusCode == 200 {
		doc, err := goquery.NewDocumentFromReader(resp.Body)
		if err != nil {
			log.Printf("[SCRAPER] Error parseando HTML: %v", err)
			return
		}

		// Buscar enlaces a resultados
		doc.Find("a[href*='/results']").Each(func(i int, s *goquery.Selection) {
			href, exists := s.Attr("href")
			if exists {
				log.Printf("[SCRAPER] Enlace encontrado: %s", href)
			}
		})

		// Buscar enlaces específicos de 2025
		doc.Find("a[href*='2025']").Each(func(i int, s *goquery.Selection) {
			href, exists := s.Attr("href")
			if exists {
				log.Printf("[SCRAPER] Enlace 2025 encontrado: %s", href)
			}
		})
	}
}

// resolveGPIDFromRacesIndex intenta resolver el ID del GP buscando el slug en el índice de carreras 2025
func resolveGPIDFromRacesIndex(slug string) (string, bool) {
	indexURL := "https://www.formula1.com/en/results/2025/races"
	log.Printf("[SCRAPER] Resolviendo GP ID dinámicamente desde: %s (slug=%s)", indexURL, slug)

	resp, err := http.Get(indexURL)
	if err != nil {
		log.Printf("[SCRAPER] Error accediendo a índice de carreras: %v", err)
		return "", false
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		log.Printf("[SCRAPER] Índice de carreras Status %d", resp.StatusCode)
		return "", false
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Printf("[SCRAPER] Error parseando índice de carreras: %v", err)
		return "", false
	}

	// Buscar enlaces que contengan el slug y extraer el ID numérico
	// Ej.: /en/results/2025/races/1277/great-britain/race-result
	var foundID string
	pattern := regexp.MustCompile(`/en/results/2025/races/(\d+)/` + regexp.QuoteMeta(slug) + `/`)
	doc.Find("a[href]").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, ok := s.Attr("href")
		if !ok {
			return true
		}
		if matches := pattern.FindStringSubmatch(href); len(matches) == 2 {
			foundID = matches[1]
			log.Printf("[SCRAPER] ID dinámico encontrado para slug '%s': %s (href=%s)", slug, foundID, href)
			return false
		}
		return true
	})

	if foundID != "" {
		return foundID, true
	}
	return "", false
}

func getGPIDFromKey(gpKey string) string {
	// DESCUBRIR ESTRUCTURA REAL PRIMERO
	discoverF1URLStructure()

	// Normalizar clave entrante
	key := strings.ToLower(strings.TrimSpace(gpKey))
	key = strings.ReplaceAll(key, "-", "_")
	if strings.HasSuffix(key, "_grand_prix") {
		key = strings.TrimSuffix(key, "_grand_prix")
	}

	log.Printf("[SCRAPER] Clave normalizada: '%s'", key)

	// Intentar resolver dinámicamente usando el slug
	slug := getGPSlugFromKey(key)
	if id, ok := resolveGPIDFromRacesIndex(slug); ok {
		log.Printf("[SCRAPER] Usando ID dinámico resuelto: '%s' → '%s' ✅", slug, id)
		return id
	}

	// MAPEO DIRECTO A IDs ESPECÍFICOS (sin probar otros)
	gpIDMap := map[string]string{
		"australian":         "1254", // Australian Grand Prix
		"australia":          "1254", // Alias
		"chinese":            "1255", // Chinese Grand Prix
		"chinese_grand_prix": "1255", // Alias para compatibilidad
		"china":              "1255", // Alias
		"japanese":           "1256", // Japanese Grand Prix
		"japan":              "1256", // Alias
		"bahrain":            "1257", // Bahrain Grand Prix
		"saudi_arabian":      "1258", // Saudi Arabian Grand Prix
		"saudi_arabia":       "1258", // Alias
		"saudi":              "1258", // Alias
		"miami":              "1259", // Miami Grand Prix
		// Los siguientes IDs varían año a año; si la resolución dinámica falla, este mapa es fallback y puede estar desfasado
		"emilia_romagna": "1260", // Emilia Romagna Grand Prix
		"emilia":         "1260", // Alias
		"monaco":         "1261", // Monaco Grand Prix
		"spanish":        "1262", // Spanish Grand Prix
		"spain":          "1262", // Alias
		"canadian":       "1263", // Canadian Grand Prix
		"canada":         "1263", // Alias
		"austrian":       "1264", // Austrian Grand Prix
		"austria":        "1264", // Alias
		// Los siguientes IDs varían año a año; si la resolución dinámica falla, este mapa es fallback y puede estar desfasado
		"british":       "1277",
		"great_britain": "1277",
		"britain":       "1277",
		"belgian":       "1265",
		"belgium":       "1265",
		"hungarian":     "1266",
		"hungary":       "1266",
		"dutch":         "1267",
		"netherlands":   "1267",
		"italian":       "1268",
		"italy":         "1268",
		"azerbaijani":   "1269",
		"azerbaijan":    "1269",
		"singapore":     "1270",
		"united_states": "1271",
		"usa":           "1271",
		"mexican":       "1272",
		"mexico":        "1272",
		"brazilian":     "1273",
		"brazil":        "1273",
		"las_vegas":     "1274",
		"qatar":         "1275",
		"abu_dhabi":     "1276",
	}

	// Obtener ID del mapa (sin probar otros)
	if gpID, exists := gpIDMap[key]; exists {
		log.Printf("[SCRAPER] Usando ID específico: '%s' → '%s' ✅", key, gpID)
		return gpID
	}

	log.Printf("[SCRAPER] Clave '%s' no encontrada, usando ID por defecto: 1255", key)
	return "1255" // ID por defecto como fallback
}

// Mapeo de pilotos para casos especiales (ej: Jack Doohan → Franco Colapinto)
func mapDriverName(driverName string) string {
	driverMappings := map[string]string{
		"Jack Doohan": "Franco Colapinto",
		// Agregar más mapeos aquí si es necesario
	}

	if mappedName, exists := driverMappings[driverName]; exists {
		log.Printf("[SCRAPER] Mapeando piloto: '%s' → '%s'", driverName, mappedName)
		return mappedName
	}

	return driverName
}

// Log compacto de posiciones de Practice (útil para comparar discrepancias)
func logPracticePositions(data []ScrapedPracticeData) {
	if len(data) == 0 {
		return
	}
	max := 10
	if len(data) < max {
		max = len(data)
	}
	entries := make([]string, 0, max)
	for i := 0; i < max; i++ {
		d := data[i]
		entries = append(entries, fmt.Sprintf("%d:%s", d.Position, d.DriverName))
	}
	log.Printf("[SCRAPER] Practice positions (top %d): %s", max, strings.Join(entries, ", "))
}

// getGPSlugFromKey devuelve el slug correcto usado por formula1.com para el GP dado
func getGPSlugFromKey(gpKey string) string {
	// Normalizar clave entrante (ej.: "japanese_grand_prix" -> "japanese")
	key := strings.ToLower(strings.TrimSpace(gpKey))
	key = strings.ReplaceAll(key, "-", "_")
	if strings.HasSuffix(key, "_grand_prix") {
		key = strings.TrimSuffix(key, "_grand_prix")
	}

	// Normalizar adjetivos a sustantivos donde aplique
	adjectiveToNoun := map[string]string{
		"australian":    "australia",
		"chinese":       "china",
		"japanese":      "japan",
		"saudi_arabian": "saudi_arabia",
		"spanish":       "spain",
		"canadian":      "canada",
		"austrian":      "austria",
		"british":       "great_britain",
		"belgian":       "belgium",
		"hungarian":     "hungary",
		"dutch":         "netherlands",
		"italian":       "italy",
		"azerbaijani":   "azerbaijan",
	}
	if noun, ok := adjectiveToNoun[key]; ok {
		key = noun
	}

	// Mapeo de slug por GP
	gpSlugMap := map[string]string{
		"australia":      "australia",
		"china":          "china",
		"japan":          "japan",
		"bahrain":        "bahrain",
		"saudi_arabia":   "saudi-arabia",
		"miami":          "miami",
		"emilia_romagna": "emilia-romagna",
		"monaco":         "monaco",
		"spain":          "spain",
		"canada":         "canada",
		"austria":        "austria",
		"great_britain":  "great-britain",
		"belgium":        "belgium",
		"hungary":        "hungary",
		"netherlands":    "netherlands",
		"italy":          "italy",
		"azerbaijan":     "azerbaijan",
		"singapore":      "singapore",
		"united_states":  "united-states",
		"mexico":         "mexico",
		"brazil":         "brazil",
		"las_vegas":      "las-vegas",
		"qatar":          "qatar",
		"abu_dhabi":      "abu-dhabi",
	}

	if slug, ok := gpSlugMap[key]; ok {
		return slug
	}

	// Fallback: reemplazar guiones bajos por guiones (mejor que nada)
	return strings.ReplaceAll(key, "_", "-")
}
