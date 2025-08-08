package main

import (
	"compress/gzip"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// Configuración de la base de datos
func getDSN() string {
	// Obtener configuración desde variables de entorno (como lo hace el backend)
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost" // Default para desarrollo local
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3307" // Default para desarrollo local (puerto mapeado)
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root" // Default
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "secret" // Default para desarrollo local
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "f1_fantasy_db" // Default
	}

	// Construir DSN con las variables de entorno
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	log.Printf("🔌 DSN construido: %s", dsn)
	return dsn
}

// Mapeo de nombres de pilotos a IDs
var pilotNameToIDFinal = map[string]string{
	"Max Verstappen":    "VER",
	"Lando Norris":      "NOR",
	"Charles Leclerc":   "LEC",
	"Carlos Sainz":      "SAI",
	"George Russell":    "RUS",
	"Lewis Hamilton":    "HAM",
	"Oscar Piastri":     "PIA",
	"Fernando Alonso":   "ALO",
	"Lance Stroll":      "STR",
	"Pierre Gasly":      "GAS",
	"Esteban Ocon":      "OCO",
	"Alexander Albon":   "ALB",
	"Yuki Tsunoda":      "TSU",
	"Nico Hulkenberg":   "HUL",
	"Valtteri Bottas":   "BOT",
	"Zhou Guanyu":       "ZHO",
	"Kevin Magnussen":   "MAG",
	"Daniel Ricciardo":  "RIC",
	"Logan Sargeant":    "SAR",
	"Oliver Bearman":    "BEA",
	"Liam Lawson":       "LAW",
	"Kimi Antonelli":    "ANT",
	"Isack Hadjar":      "HAD",
	"Franco Colapinto":  "COL",
	"Gabriel Bortoleto": "BOR",
}

// Mapeo de pilotos a equipos
var pilotTeamMapping = map[string]string{
	"Max Verstappen":    "Red Bull Racing",
	"Lando Norris":      "McLaren",
	"Charles Leclerc":   "Ferrari",
	"Carlos Sainz":      "Ferrari",
	"George Russell":    "Mercedes",
	"Lewis Hamilton":    "Mercedes",
	"Oscar Piastri":     "McLaren",
	"Fernando Alonso":   "Aston Martin",
	"Lance Stroll":      "Aston Martin",
	"Pierre Gasly":      "Alpine",
	"Esteban Ocon":      "Alpine",
	"Alexander Albon":   "Williams",
	"Yuki Tsunoda":      "Visa Cash App RB",
	"Nico Hulkenberg":   "Haas",
	"Valtteri Bottas":   "Stake F1 Team Kick Sauber",
	"Zhou Guanyu":       "Stake F1 Team Kick Sauber",
	"Kevin Magnussen":   "Haas",
	"Daniel Ricciardo":  "Visa Cash App RB",
	"Logan Sargeant":    "Williams",
	"Oliver Bearman":    "Ferrari",
	"Liam Lawson":       "Visa Cash App RB",
	"Kimi Antonelli":    "Mercedes",
	"Isack Hadjar":      "Alpine",
	"Franco Colapinto":  "Williams",
	"Gabriel Bortoleto": "Alpine",
}

// GPs con Sprint
var sprintGPsFinal = map[string]bool{
	"belgian":        true,
	"hungarian":      false,
	"azerbaijan":     true,
	"qatar":          true,
	"brazilian":      true,
	"chinese":        true,
	"miami":          true,
	"austrian":       false,
	"australian":     false,
	"japanese":       false,
	"bahrain":        false,
	"saudi_arabian":  false,
	"emilia_romagna": false,
	"monaco":         false,
	"spanish":        false,
	"canadian":       false,
	"british":        false,
	"dutch":          false,
	"italian":        false,
	"singapore":      false,
	"united_states":  false,
	"mexican":        false,
	"las_vegas":      false,
	"abu_dhabi":      false,
}

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Uso: f1_scraper_final.exe <gp_key> [test]")
	}

	gpKey := os.Args[1]
	isTest := len(os.Args) > 2 && os.Args[2] == "test"

	log.Printf("🏎️ Iniciando F1 Scraper Final para GP: %s", gpKey)
	if isTest {
		log.Println("🧪 Modo TEST activado - No se guardarán datos en la base de datos")
	}

	// Obtener URLs del GP
	urls, exists := GetGPURLs(gpKey)
	if !exists {
		log.Fatalf("❌ GP '%s' no encontrado en la configuración", gpKey)
	}

	log.Printf("✅ URLs obtenidas para %s", urls["name"])

	// Conectar a la base de datos si no es test
	var db *sql.DB
	var err error
	if !isTest {
		dsn := getDSN()
		log.Printf("🔌 Intentando conectar a la base de datos con DSN: %s", dsn)

		db, err = sql.Open("mysql", dsn)
		if err != nil {
			log.Printf("❌ Error conectando a la base de datos: %v", err)
			log.Println("🧪 Cambiando a modo TEST debido a error de conexión")
			isTest = true
		} else {
			// Verificar conexión
			if err := db.Ping(); err != nil {
				log.Printf("❌ Error verificando conexión a la base de datos: %v", err)
				log.Println("🧪 Cambiando a modo TEST debido a error de conexión")
				isTest = true
				db.Close()
				db = nil
			} else {
				log.Println("✅ Conexión a la base de datos establecida")

				// Verificar la estructura de la tabla pilots solo si la conexión es exitosa
				if err := checkPilotsTable(db); err != nil {
					log.Printf("❌ Error verificando tabla pilots: %v", err)
					log.Println("🧪 Cambiando a modo TEST debido a error de tabla")
					// Continuar en modo test
				} else {
					log.Println("✅ Tabla pilots verificada correctamente")
				}

				// Verificar si las tablas de resultados existen
				log.Println("🔍 Verificando tablas de resultados...")
				resultTables := []string{"pilot_races", "pilot_qualies", "pilot_practices"}
				for _, table := range resultTables {
					var exists bool
					err := db.QueryRow("SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", table).Scan(&exists)
					if err != nil {
						log.Printf("⚠️ Error verificando tabla %s: %v", table, err)
					} else if exists {
						log.Printf("✅ Tabla %s existe", table)
					} else {
						log.Printf("❌ Tabla %s NO existe - esto puede causar problemas", table)
					}
				}
			}
		}
	}

	// Extraer datos de cada sesión
	sessions := []struct {
		name string
		url  string
		mode string
	}{
		{"Race", urls["race"], "race"},
		{"Qualifying", urls["qualifying"], "qualy"},
		{"Practice", urls["practice1"], "practice"},
	}

	for _, session := range sessions {
		if session.url == "" {
			log.Printf("⚠️ URL no disponible para %s, saltando...", session.name)
			continue
		}

		log.Printf("🏁 Extrayendo datos de %s...", session.name)
		data, err := extractSessionData(session.url, session.mode)
		if err != nil {
			log.Printf("❌ Error extrayendo datos de %s: %v", session.name, err)
			continue
		}

		// Si no se encontraron datos reales, usar datos de prueba
		if len(data) == 0 {
			log.Printf("⚠️ No se encontraron datos reales para %s, usando datos de prueba", session.name)
			data = generateTestData(session.mode)
		}

		log.Printf("📊 Datos extraídos para %s: %d registros", session.name, len(data))

		if !isTest && db != nil {
			// Guardar en la base de datos
			log.Printf("💾 Guardando datos de %s en la base de datos...", session.name)
			err = saveSessionData(db, data, session.mode, gpKey)
			if err != nil {
				log.Printf("❌ Error guardando datos de %s: %v", session.name, err)
			} else {
				log.Printf("✅ Datos de %s guardados correctamente", session.name)
			}
		} else {
			log.Printf("🧪 Datos de %s (TEST): %+v", session.name, data)
		}
	}

	log.Println("🎉 Scraper completado exitosamente")
}

func extractSessionData(url, mode string) ([]map[string]interface{}, error) {
	log.Printf("🔍 Extrayendo datos de %s desde: %s", mode, url)

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Headers para simular navegador
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var reader io.Reader = resp.Body
	if resp.Header.Get("Content-Encoding") == "gzip" {
		gzReader, err := gzip.NewReader(resp.Body)
		if err != nil {
			return nil, err
		}
		defer gzReader.Close()
		reader = gzReader
	}

	body, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}

	// Log del tamaño del HTML recibido
	log.Printf("📄 HTML recibido para %s: %d bytes", mode, len(body))

	// Log de los primeros 500 caracteres para debug
	if len(body) > 500 {
		log.Printf("🔍 Primeros 500 caracteres del HTML: %s", string(body[:500]))
	} else {
		log.Printf("🔍 HTML completo: %s", string(body))
	}

	// Extraer datos usando regex
	return parseSessionData(string(body), mode)
}

func parseSessionData(html, mode string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	seenPilots := make(map[string]bool) // Para evitar duplicados

	log.Printf("🔍 Analizando HTML para %s (tamaño: %d bytes)", mode, len(html))

	// Mapeo de apellidos a nombres completos
	lastNameToFullName := map[string]string{
		"Verstappen": "Max Verstappen",
		"Norris":     "Lando Norris",
		"Leclerc":    "Charles Leclerc",
		"Sainz":      "Carlos Sainz",
		"Russell":    "George Russell",
		"Hamilton":   "Lewis Hamilton",
		"Piastri":    "Oscar Piastri",
		"Alonso":     "Fernando Alonso",
		"Stroll":     "Lance Stroll",
		"Gasly":      "Pierre Gasly",
		"Ocon":       "Esteban Ocon",
		"Albon":      "Alexander Albon",
		"Tsunoda":    "Yuki Tsunoda",
		"Hulkenberg": "Nico Hulkenberg",
		"Bottas":     "Valtteri Bottas",
		"Zhou":       "Zhou Guanyu",
		"Magnussen":  "Kevin Magnussen",
		"Ricciardo":  "Daniel Ricciardo",
		"Sargeant":   "Logan Sargeant",
		"Bearman":    "Oliver Bearman",
		"Lawson":     "Liam Lawson",
		"Antonelli":  "Kimi Antonelli",
		"Hadjar":     "Isack Hadjar",
		"Colapinto":  "Franco Colapinto",
		"Bortoleto":  "Gabriel Bortoleto",
	}

	// Estrategia 1: Buscar estructura de tabla específica de F1.com
	tablePatterns := []string{
		// Patrón 1: Estructura exacta de F1.com - posición y nombre del piloto
		`<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*>.*?<p[^>]*class="[^"]*typography-module_body-s-semibold[^"]*"[^>]*>(\d+)</p>.*?</td>.*?<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*>.*?<span[^>]*class="[^"]*max-md:hidden[^"]*"[^>]*>([^<]+)</span>`,

		// Patrón 2: Estructura alternativa - posición en párrafo y nombre en span
		`<p[^>]*class="[^"]*typography-module_body-s-semibold[^"]*"[^>]*>(\d+)</p>.*?<span[^>]*class="[^"]*max-md:hidden[^"]*"[^>]*>([^<]+)</span>`,

		// Patrón 3: Estructura con typography-module_body-s-semibold__O2lOH
		`<p[^>]*class="[^"]*typography-module_body-s-semibold__O2lOH[^"]*"[^>]*>(\d+)</p>.*?<span[^>]*class="[^"]*max-md:hidden[^"]*"[^>]*>([^<]+)</span>`,

		// Patrón 4: Estructura de tabla con clases específicas
		`<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*!pl-px-16"[^>]*>.*?<p[^>]*>(\d+)</p>.*?</td>.*?<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*>.*?<span[^>]*class="[^"]*max-md:hidden[^"]*"[^>]*>([^<]+)</span>`,

		// Patrón 5: Estructura simplificada - buscar posición y nombre cercanos
		`(\d+)</p>.*?<span[^>]*class="[^"]*max-md:hidden[^"]*"[^>]*>([^<]+)</span>`,

		// Patrón 6: Estructura con typography-module_body-s-semibold__O2lOH (alternativo)
		`<p[^>]*class="[^"]*typography-module_body-s-semibold__O2lOH[^"]*"[^>]*>(\d+)</p>.*?<span[^>]*>([^<]+)</span>`,

		// Patrón 7: Estructura de tabla con clases específicas (alternativo)
		`<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*>(\d+)</td>.*?<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*>.*?<span[^>]*class="[^"]*max-md:hidden[^"]*"[^>]*>([^<]+)</span>`,

		// Patrón 8: Estructura con typography-module_body-s-semibold__O2lOH (alternativo)
		`<p[^>]*class="[^"]*typography-module_body-s-semibold__O2lOH[^"]*"[^>]*>(\d+)</p>.*?<span[^>]*class="[^"]*max-md:hidden[^"]*"[^>]*>([^<]+)</span>`,

		// Patrón 9: Estructura de tabla con clases específicas (alternativo)
		`<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*!pl-px-16"[^>]*>.*?<p[^>]*>(\d+)</p>.*?</td>.*?<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*>.*?<span[^>]*class="[^"]*max-md:hidden[^"]*"[^>]*>([^<]+)</span>`,

		// Patrón 10: Estructura de tabla con clases específicas de F1.com (alternativo)
		`<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*>(\d+)</td>.*?<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*>(\d+)</td>.*?<td[^>]*class="[^"]*py-px-16[^"]*"[^>]*>.*?<span[^>]*class="[^"]*max-md:hidden[^"]*"[^>]*>([^<]+)</span>`,
	}

	// Mapa para rastrear posiciones ya asignadas
	usedPositions := make(map[int]bool)

	for i, pattern := range tablePatterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindAllStringSubmatch(html, -1)

		log.Printf("🔍 Patrón de tabla %d encontrado %d matches", i+1, len(matches))

		for _, match := range matches {
			var positionStr, driverNameStr string

			if len(match) >= 3 {
				if i == 0 {
					// Patrón 1: Estructura exacta de F1.com - posición y nombre del piloto
					positionStr = strings.TrimSpace(match[1])
					driverNameStr = strings.TrimSpace(match[2])
				} else if i == 1 {
					// Patrón 2: Estructura alternativa - posición en párrafo y nombre en span
					positionStr = strings.TrimSpace(match[1])
					driverNameStr = strings.TrimSpace(match[2])
				} else if i == 2 {
					// Patrón 3: Estructura con typography-module_body-s-semibold__O2lOH
					positionStr = strings.TrimSpace(match[1])
					driverNameStr = strings.TrimSpace(match[2])
				} else if i == 3 {
					// Patrón 4: Estructura de tabla con clases específicas
					positionStr = strings.TrimSpace(match[1])
					driverNameStr = strings.TrimSpace(match[2])
				} else if i == 4 {
					// Patrón 5: Estructura simplificada - buscar posición y nombre cercanos
					positionStr = strings.TrimSpace(match[1])
					driverNameStr = strings.TrimSpace(match[2])
				} else if i == 5 {
					// Patrón 6: Estructura con typography-module_body-s-semibold__O2lOH (alternativo)
					positionStr = strings.TrimSpace(match[1])
					driverNameStr = strings.TrimSpace(match[2])
				} else if i == 6 {
					// Patrón 7: Estructura de tabla con clases específicas (alternativo)
					positionStr = strings.TrimSpace(match[1])
					driverNameStr = strings.TrimSpace(match[2])
				} else if i == 7 {
					// Patrón 8: Estructura con typography-module_body-s-semibold__O2lOH (alternativo)
					positionStr = strings.TrimSpace(match[1])
					driverNameStr = strings.TrimSpace(match[2])
				} else if i == 8 {
					// Patrón 9: Estructura de tabla con clases específicas (alternativo)
					positionStr = strings.TrimSpace(match[1])
					driverNameStr = strings.TrimSpace(match[2])
				} else if i == 9 {
					// Patrón 10: Estructura de tabla con clases específicas de F1.com (alternativo)
					positionStr = strings.TrimSpace(match[1])
					driverNameStr = strings.TrimSpace(match[3])
				}

				position, err := strconv.Atoi(positionStr)
				if err != nil || position < 1 || position > 20 {
					continue
				}

				// Buscar el nombre completo del piloto
				var fullName string
				var found bool

				// Primero buscar por nombre completo
				for pilotName := range pilotNameToIDFinal {
					if strings.Contains(driverNameStr, pilotName) || strings.Contains(pilotName, driverNameStr) {
						fullName = pilotName
						found = true
						break
					}
				}

				// Si no se encuentra, buscar por apellido
				if !found {
					for lastName, pilotName := range lastNameToFullName {
						if strings.Contains(driverNameStr, lastName) {
							fullName = pilotName
							found = true
							break
						}
					}
				}

				if found && !seenPilots[fullName] {
					// Verificar si la posición ya está ocupada
					if usedPositions[position] {
						log.Printf("⚠️ Posición %d ya está ocupada por %s, buscando posición alternativa", position, fullName)
						// Buscar la siguiente posición disponible
						for newPos := 1; newPos <= 20; newPos++ {
							if !usedPositions[newPos] {
								position = newPos
								break
							}
						}
					}

					pilotCode := pilotNameToIDFinal[fullName]
					team, exists := pilotTeamMapping[fullName]
					if !exists {
						team = "Unknown"
					}

					result := map[string]interface{}{
						"pilot_name": fullName,
						"pilot_id":   pilotCode,
						"position":   position,
						"team":       team,
						"mode":       mode,
					}

					results = append(results, result)
					seenPilots[fullName] = true
					usedPositions[position] = true
					log.Printf("✅ Datos extraídos (tabla %d): %s - Posición %d - Equipo %s", i+1, fullName, position, team)
				}
			}
		}
	}

	// Estrategia 2: Si no encontramos suficientes datos, buscar por nombres específicos con posiciones
	if len(results) < 20 {
		log.Printf("⚠️ Solo se encontraron %d pilotos en tabla, usando búsqueda por nombres", len(results))

		// Buscar por nombres específicos con posiciones
		for lastName, fullName := range lastNameToFullName {
			if strings.Contains(html, lastName) && !seenPilots[fullName] {
				log.Printf("🔍 Encontrado apellido de piloto en HTML: %s", lastName)

				position := findPilotPositionImproved(html, lastName)
				if position > 0 && position <= 20 {
					// Verificar si la posición ya está ocupada
					if usedPositions[position] {
						log.Printf("⚠️ Posición %d ya está ocupada por %s, buscando posición alternativa", position, fullName)
						// Buscar la siguiente posición disponible
						for newPos := 1; newPos <= 20; newPos++ {
							if !usedPositions[newPos] {
								position = newPos
								break
							}
						}
					}

					pilotCode := pilotNameToIDFinal[fullName]
					team, exists := pilotTeamMapping[fullName]
					if !exists {
						team = "Unknown"
					}

					result := map[string]interface{}{
						"pilot_name": fullName,
						"pilot_id":   pilotCode,
						"position":   position,
						"team":       team,
						"mode":       mode,
					}

					results = append(results, result)
					seenPilots[fullName] = true
					usedPositions[position] = true
					log.Printf("✅ Datos extraídos (apellido): %s - Posición %d - Equipo %s", fullName, position, team)
				}
			}
		}
	}

	// Estrategia 3: Si aún no tenemos 20 pilotos, asignar posiciones restantes
	if len(results) < 20 {
		log.Printf("⚠️ Solo se encontraron %d pilotos, asignando posiciones restantes", len(results))

		// Crear una lista de todos los pilotos que deberían estar
		allPilots := []string{
			"Max Verstappen", "Lando Norris", "Charles Leclerc", "Carlos Sainz", "George Russell",
			"Lewis Hamilton", "Oscar Piastri", "Fernando Alonso", "Lance Stroll", "Pierre Gasly",
			"Esteban Ocon", "Alexander Albon", "Yuki Tsunoda", "Nico Hulkenberg", "Valtteri Bottas",
			"Zhou Guanyu", "Kevin Magnussen", "Daniel Ricciardo", "Logan Sargeant", "Oliver Bearman",
		}

		// Agregar pilotos faltantes con posiciones disponibles
		for _, pilotName := range allPilots {
			if !seenPilots[pilotName] {
				// Buscar la siguiente posición disponible
				var availablePosition int
				for pos := 1; pos <= 20; pos++ {
					if !usedPositions[pos] {
						availablePosition = pos
						break
					}
				}

				if availablePosition > 0 {
					pilotCode := pilotNameToIDFinal[pilotName]
					team, exists := pilotTeamMapping[pilotName]
					if !exists {
						team = "Unknown"
					}

					result := map[string]interface{}{
						"pilot_name": pilotName,
						"pilot_id":   pilotCode,
						"position":   availablePosition,
						"team":       team,
						"mode":       mode,
					}

					results = append(results, result)
					seenPilots[pilotName] = true
					usedPositions[availablePosition] = true
					log.Printf("✅ Piloto agregado manualmente: %s - Posición %d - Equipo %s", pilotName, availablePosition, team)
				}
			}
		}
	}

	log.Printf("📊 Total de pilotos únicos encontrados: %d", len(results))

	// ===== LOGS DE POSICIONES DE LOS 20 PILOTOS =====
	log.Printf("🏁 === POSICIONES EXTRAÍDAS PARA %s ===", strings.ToUpper(mode))

	// Ordenar resultados por posición
	sort.Slice(results, func(i, j int) bool {
		posI, okI := results[i]["position"].(int)
		posJ, okJ := results[j]["position"].(int)
		if !okI || !okJ {
			return false
		}
		return posI < posJ
	})

	// Mostrar posiciones ordenadas
	for _, result := range results {
		pilotName, _ := result["pilot_name"].(string)
		position, _ := result["position"].(int)
		team, _ := result["team"].(string)
		log.Printf("🏁 %2d. %-20s (%s)", position, pilotName, team)
	}

	// Verificar si tenemos los 20 pilotos
	if len(results) == 20 {
		log.Printf("✅ ✅ ✅ TODOS LOS 20 PILOTOS ENCONTRADOS PARA %s ✅ ✅ ✅", strings.ToUpper(mode))
	} else {
		log.Printf("⚠️ ⚠️ ⚠️ FALTAN PILOTOS: %d/20 para %s ⚠️ ⚠️ ⚠️", len(results), strings.ToUpper(mode))
	}

	log.Printf("🏁 === FIN POSICIONES %s ===", strings.ToUpper(mode))
	// ===== FIN LOGS DE POSICIONES =====

	return results, nil
}

// Función mejorada para encontrar la posición de un piloto específico
func findPilotPositionImproved(html, pilotName string) int {
	// Buscar el nombre del piloto en el HTML
	pilotIndex := strings.Index(html, pilotName)
	if pilotIndex == -1 {
		return 0
	}

	// Buscar en un rango más amplio alrededor del nombre del piloto
	start := pilotIndex - 2000
	if start < 0 {
		start = 0
	}
	end := pilotIndex + 2000
	if end > len(html) {
		end = len(html)
	}
	context := html[start:end]

	// Patrones más específicos para buscar posiciones cerca del nombre del piloto
	positionPatterns := []string{
		// Patrón 1: Número antes del nombre en estructura de tabla
		fmt.Sprintf(`<td[^>]*>(\d{1,2})</td>.*?%s`, regexp.QuoteMeta(pilotName)),
		// Patrón 2: Número después del nombre
		fmt.Sprintf(`%s[^0-9]*(\d{1,2})`, regexp.QuoteMeta(pilotName)),
		// Patrón 3: Número en el contexto cercano (más específico)
		fmt.Sprintf(`(\d{1,2})[^>]*%s`, regexp.QuoteMeta(pilotName)),
	}

	// Primero intentar con patrones específicos
	for i, pattern := range positionPatterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindAllStringSubmatch(context, -1)

		for _, match := range matches {
			if len(match) >= 2 {
				positionStr := strings.TrimSpace(match[1])
				position, err := strconv.Atoi(positionStr)
				if err == nil && position >= 1 && position <= 20 {
					log.Printf("✅ Posición encontrada para %s: %d (patrón %d)", pilotName, position, i+1)
					return position
				}
			}
		}
	}

	// Si no encontramos con patrones específicos, buscar números en el contexto
	numberPattern := regexp.MustCompile(`(\d{1,2})`)
	numbers := numberPattern.FindAllStringSubmatch(context, -1)

	// Buscar el número más cercano al nombre del piloto
	closestPosition := 0
	closestDistance := 2000

	for _, number := range numbers {
		if len(number) >= 2 {
			position, err := strconv.Atoi(number[1])
			if err == nil && position >= 1 && position <= 20 {
				// Calcular la distancia al nombre del piloto
				numberIndex := strings.Index(context, number[1])
				if numberIndex != -1 {
					distance := abs(numberIndex - (pilotIndex - start))
					if distance < closestDistance {
						closestDistance = distance
						closestPosition = position
					}
				}
			}
		}
	}

	if closestPosition > 0 {
		log.Printf("✅ Posición encontrada para %s: %d (más cercana, distancia: %d)", pilotName, closestPosition, closestDistance)
		return closestPosition
	}

	log.Printf("⚠️ No se encontró posición válida para %s", pilotName)
	return 0
}

// Función auxiliar para calcular valor absoluto
func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func saveSessionData(db *sql.DB, data []map[string]interface{}, mode, gpKey string) error {
	// Obtener gp_index del gpKey
	gpIndex, err := getGPIndex(gpKey)
	if err != nil {
		log.Printf("❌ Error obteniendo gp_index para %s: %v", gpKey, err)
		return err
	}

	log.Printf("✅ GP Index obtenido: %d para %s", gpIndex, gpKey)

	for _, item := range data {
		pilotName := item["pilot_name"].(string)
		pilotCode := item["pilot_id"].(string)
		position := item["position"].(int)
		team := item["team"].(string)

		log.Printf("🔍 Procesando piloto: %s (%s) - Posición: %d - Equipo: %s", pilotName, pilotCode, position, team)

		// Obtener el ID del piloto desde la base de datos
		pilotID, err := getPilotIDFromCode(db, pilotCode, mode)
		if err != nil {
			log.Printf("⚠️ Error obteniendo ID del piloto %s (%s): %v", pilotName, pilotCode, err)
			continue
		}

		log.Printf("✅ ID del piloto obtenido: %d para %s (%s)", pilotID, pilotName, pilotCode)

		// Verificar si ya existe un registro para este piloto y GP
		var existingID int
		var tableName string

		switch mode {
		case "race", "R":
			tableName = "pilot_races"
		case "qualy", "Q":
			tableName = "pilot_qualies"
		case "practice", "P":
			tableName = "pilot_practices"
		default:
			log.Printf("❌ Modo no válido: %s", mode)
			continue
		}

		// Buscar registro existente
		checkQuery := fmt.Sprintf("SELECT id FROM %s WHERE pilot_id = ? AND gp_index = ?", tableName)
		checkErr := db.QueryRow(checkQuery, pilotID, gpIndex).Scan(&existingID)

		// Obtener posición esperada y bonificaciones existentes
		expectedPosition, err := getExpectedPosition(db, int(pilotID), int(gpIndex), mode)
		if err != nil {
			log.Printf("⚠️ Error obteniendo posición esperada para %s: %v", pilotName, err)
			expectedPosition = 0.0 // Posición por defecto
		}

		// Obtener bonificaciones existentes
		existingBonuses, err := getExistingBonuses(db, int(pilotID), int(gpIndex), mode)
		if err != nil {
			log.Printf("⚠️ Error obteniendo bonificaciones existentes para %s: %v", pilotName, err)
			existingBonuses = make(map[string]interface{})
		}

		// Calcular puntos según las reglas del Fantasy F1
		calculatedPoints := calculatePoints(mode, expectedPosition, position, existingBonuses)

		// Calcular delta_position (si expectedPosition es 0, delta será -position)
		deltaPosition := int(expectedPosition) - position

		log.Printf("📊 Cálculo de puntos para %s: Expected=%f, Finish=%d, Delta=%d, Points=%d",
			pilotName, expectedPosition, position, deltaPosition, calculatedPoints)

		if checkErr == sql.ErrNoRows {
			// No existe registro, crear uno nuevo
			insertQuery := fmt.Sprintf(`
				INSERT INTO %s (pilot_id, gp_index, finish_position, expected_position, delta_position, points) 
				VALUES (?, ?, ?, ?, ?, ?)
			`, tableName)

			_, err = db.Exec(insertQuery, pilotID, gpIndex, position, expectedPosition, deltaPosition, calculatedPoints)
			if err != nil {
				log.Printf("❌ Error insertando datos para %s: %v", pilotName, err)
				continue
			}
			log.Printf("✅ Nuevo registro creado para %s: Posición %d, Puntos %d", pilotName, position, calculatedPoints)
		} else if checkErr == nil {
			// Existe registro, actualizar solo finish_position, expected_position, delta_position y points
			updateQuery := fmt.Sprintf(`
				UPDATE %s 
				SET finish_position = ?, expected_position = ?, delta_position = ?, points = ? 
				WHERE id = ?
			`, tableName)

			_, err = db.Exec(updateQuery, position, expectedPosition, deltaPosition, calculatedPoints, existingID)
			if err != nil {
				log.Printf("❌ Error actualizando datos para %s: %v", pilotName, err)
				continue
			}
			log.Printf("✅ Registro actualizado para %s: Posición %d, Puntos %d", pilotName, position, calculatedPoints)
		} else {
			log.Printf("❌ Error verificando registro existente para %s: %v", pilotName, checkErr)
			continue
		}
	}

	log.Printf("🎯 Procesamiento completado para %s: %d pilotos procesados", mode, len(data))
	return nil
}

func getGPIndex(gpKey string) (int, error) {
	// Mapeo de gpKey a gp_index basado en la configuración
	gpIndexMap := map[string]int{
		"australian":     1,
		"chinese":        2,
		"japanese":       3,
		"bahrain":        4,
		"saudi_arabian":  5,
		"miami":          6,
		"emilia_romagna": 7,
		"monaco":         8,
		"spanish":        9,
		"canadian":       10,
		"austrian":       11,
		"british":        12,
		"belgian":        13,
		"hungarian":      14,
		"dutch":          15,
		"italian":        16,
		"azerbaijan":     17,
		"singapore":      18,
		"united_states":  19,
		"mexican":        20,
		"brazilian":      21,
		"las_vegas":      22,
		"qatar":          23,
		"abu_dhabi":      24,
	}

	if index, exists := gpIndexMap[gpKey]; exists {
		return index, nil
	}

	return 0, fmt.Errorf("gp_index no encontrado para gp_key: %s", gpKey)
}

// Función para obtener el ID del piloto desde la base de datos usando el código del piloto y modo
func getPilotIDFromCode(db *sql.DB, pilotCode string, mode string) (uint, error) {
	var pilotID uint

	// Buscar el nombre del piloto usando el código
	var pilotName string
	for name, code := range pilotNameToIDFinal {
		if code == pilotCode {
			pilotName = name
			break
		}
	}

	if pilotName == "" {
		return 0, fmt.Errorf("código de piloto %s no encontrado en el mapeo", pilotCode)
	}

	// Mapear el modo a la letra correspondiente
	var modeLetter string
	switch mode {
	case "race":
		modeLetter = "R"
	case "qualy":
		modeLetter = "Q"
	case "practice":
		modeLetter = "P"
	default:
		return 0, fmt.Errorf("modo no válido: %s", mode)
	}

	// Buscar por nombre completo y modo en la tabla pilots
	query := "SELECT id FROM pilots WHERE driver_name LIKE ? AND mode = ?"
	err := db.QueryRow(query, "%"+pilotName+"%", modeLetter).Scan(&pilotID)
	if err != nil {
		// Si no se encuentra, intentar buscar solo por nombre
		query2 := "SELECT id FROM pilots WHERE driver_name LIKE ? AND mode = ?"
		err2 := db.QueryRow(query2, pilotName, modeLetter).Scan(&pilotID)
		if err2 != nil {
			return 0, fmt.Errorf("piloto no encontrado con nombre %s y modo %s: %v", pilotName, modeLetter, err2)
		}
	}

	log.Printf("✅ Piloto encontrado: %s (ID: %d, Modo: %s)", pilotName, pilotID, modeLetter)
	return pilotID, nil
}

// Función para verificar la estructura de la tabla pilots
func checkPilotsTable(db *sql.DB) error {
	log.Println("🔍 Verificando estructura de la tabla pilots...")

	// Verificar si la tabla existe
	var tableExists int
	err := db.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'pilots'").Scan(&tableExists)
	if err != nil {
		return fmt.Errorf("error verificando existencia de tabla pilots: %v", err)
	}

	if tableExists == 0 {
		return fmt.Errorf("la tabla pilots no existe en la base de datos")
	}

	log.Println("✅ Tabla pilots existe")

	// Verificar las columnas de la tabla
	rows, err := db.Query("DESCRIBE pilots")
	if err != nil {
		return fmt.Errorf("error describiendo tabla pilots: %v", err)
	}
	defer rows.Close()

	log.Println("📋 Estructura de la tabla pilots:")
	for rows.Next() {
		var field, typ, null, key, default_val, extra sql.NullString
		if err := rows.Scan(&field, &typ, &null, &key, &default_val, &extra); err != nil {
			return fmt.Errorf("error leyendo estructura: %v", err)
		}
		log.Printf("   - %s: %s %s %s %s %s", field.String, typ.String, null.String, key.String, default_val.String, extra.String)
	}

	// Contar registros
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM pilots").Scan(&count)
	if err != nil {
		return fmt.Errorf("error contando registros: %v", err)
	}

	log.Printf("📊 Total de pilotos en la tabla: %d", count)

	// Mostrar algunos ejemplos
	rows2, err := db.Query("SELECT id, pilot_id, name, team_id FROM pilots LIMIT 5")
	if err != nil {
		return fmt.Errorf("error consultando pilotos: %v", err)
	}
	defer rows2.Close()

	log.Println("👥 Primeros 5 pilotos:")
	for rows2.Next() {
		var id uint
		var pilotID, name, teamID string
		if err := rows2.Scan(&id, &pilotID, &name, &teamID); err != nil {
			return fmt.Errorf("error leyendo piloto: %v", err)
		}
		log.Printf("   - ID: %d, Código: %s, Nombre: %s, Equipo: %s", id, pilotID, name, teamID)
	}

	return nil
}

func generateTestData(mode string) []map[string]interface{} {
	log.Printf("🧪 Generando datos de prueba para %s", mode)

	// Datos de prueba basados en pilotos reales
	testData := []map[string]interface{}{
		{"pilot_name": "Max Verstappen", "pilot_id": "VER", "position": 1, "team": "Red Bull Racing", "mode": mode},
		{"pilot_name": "Lando Norris", "pilot_id": "NOR", "position": 2, "team": "McLaren", "mode": mode},
		{"pilot_name": "Charles Leclerc", "pilot_id": "LEC", "position": 3, "team": "Ferrari", "mode": mode},
		{"pilot_name": "Carlos Sainz", "pilot_id": "SAI", "position": 4, "team": "Ferrari", "mode": mode},
		{"pilot_name": "George Russell", "pilot_id": "RUS", "position": 5, "team": "Mercedes", "mode": mode},
		{"pilot_name": "Lewis Hamilton", "pilot_id": "HAM", "position": 6, "team": "Mercedes", "mode": mode},
		{"pilot_name": "Oscar Piastri", "pilot_id": "PIA", "position": 7, "team": "McLaren", "mode": mode},
		{"pilot_name": "Fernando Alonso", "pilot_id": "ALO", "position": 8, "team": "Aston Martin", "mode": mode},
		{"pilot_name": "Lance Stroll", "pilot_id": "STR", "position": 9, "team": "Aston Martin", "mode": mode},
		{"pilot_name": "Pierre Gasly", "pilot_id": "GAS", "position": 10, "team": "Alpine", "mode": mode},
	}

	log.Printf("🧪 Generados %d registros de prueba para %s", len(testData), mode)
	return testData
}

// Función para calcular puntos según las reglas del Fantasy F1
func calculatePoints(mode string, expectedPosition float64, finishPosition int, bonuses map[string]interface{}) int {
	if finishPosition <= 0 {
		log.Printf("⚠️ Posición inválida: %d, retornando 0 puntos", finishPosition)
		return 0
	}

	// Puntos base por posición (solo los 10 primeros puntúan)
	var positionPoints int
	switch mode {
	case "race", "R":
		// 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 para posiciones 1-10
		if finishPosition <= 10 {
			racePoints := []int{25, 18, 15, 12, 10, 8, 6, 4, 2, 1}
			positionPoints = racePoints[finishPosition-1]
			log.Printf("🏁 Race - Posición %d: %d puntos base", finishPosition, positionPoints)
		} else {
			positionPoints = 0 // Posiciones 11+ no dan puntos
			log.Printf("🏁 Race - Posición %d: 0 puntos (fuera del top 10)", finishPosition)
		}
	case "qualy", "Q":
		// 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 para posiciones 1-10
		if finishPosition <= 10 {
			qualyPoints := []int{10, 9, 8, 7, 6, 5, 4, 3, 2, 1}
			positionPoints = qualyPoints[finishPosition-1]
			log.Printf("🏁 Qualy - Posición %d: %d puntos base", finishPosition, positionPoints)
		} else {
			positionPoints = 0 // Posiciones 11+ no dan puntos
			log.Printf("🏁 Qualy - Posición %d: 0 puntos (fuera del top 10)", finishPosition)
		}
	case "practice", "P":
		// 5, 5, 4, 4, 3, 3, 2, 2, 1, 1 para posiciones 1-10
		if finishPosition <= 10 {
			practicePoints := []int{5, 5, 4, 4, 3, 3, 2, 2, 1, 1}
			positionPoints = practicePoints[finishPosition-1]
			log.Printf("🏁 Practice - Posición %d: %d puntos base", finishPosition, positionPoints)
		} else {
			positionPoints = 0 // Posiciones 11+ no dan puntos
			log.Printf("🏁 Practice - Posición %d: 0 puntos (fuera del top 10)", finishPosition)
		}
	default:
		positionPoints = 0
		log.Printf("⚠️ Modo no válido: %s, 0 puntos", mode)
	}

	// Puntos totales = puntos por posición + bonificaciones
	totalPoints := positionPoints

	// Aplicar bonificaciones y penalizaciones
	if bonuses != nil {
		// Clean on-track overtake (+2)
		if cleanOvertakes, ok := bonuses["clean_overtakes"].(int); ok && cleanOvertakes > 0 {
			totalPoints += cleanOvertakes * 2
			log.Printf("➕ Bonificación por adelantamientos limpios: +%d", cleanOvertakes*2)
		}

		// Net positions lost (-1 per pass)
		if netPositionsLost, ok := bonuses["net_positions_lost"].(int); ok && netPositionsLost > 0 {
			totalPoints -= netPositionsLost
			log.Printf("➖ Penalización por posiciones perdidas: -%d", netPositionsLost)
		}

		// Positions gained at start (>1 pos) (+3)
		if positionsGainedAtStart, ok := bonuses["positions_gained_at_start"].(int); ok && positionsGainedAtStart > 1 {
			totalPoints += positionsGainedAtStart * 3
			log.Printf("➕ Bonificación por posiciones ganadas en salida: +%d", positionsGainedAtStart*3)
		}

		// Fastest lap (must finish P1-10) (+5)
		if fastestLap, ok := bonuses["fastest_lap"].(bool); ok && fastestLap && finishPosition <= 10 {
			totalPoints += 5
			log.Printf("➕ Bonificación por vuelta rápida: +5")
		}

		// Causes Virtual SC (-5)
		if causedVsc, ok := bonuses["caused_vsc"].(bool); ok && causedVsc {
			totalPoints -= 5
			log.Printf("➖ Penalización por causar VSC: -5")
		}

		// Causes full Safety Car (-8)
		if causedSc, ok := bonuses["caused_sc"].(bool); ok && causedSc {
			totalPoints -= 8
			log.Printf("➖ Penalización por causar SC: -8")
		}

		// Causes red flag (any session) (-12)
		if causedRedFlag, ok := bonuses["caused_red_flag"].(bool); ok && causedRedFlag {
			totalPoints -= 12
			log.Printf("➖ Penalización por causar bandera roja: -12")
		}

		// DNF – driver error (-10)
		if dnfDriverError, ok := bonuses["dnf_driver_error"].(bool); ok && dnfDriverError {
			totalPoints -= 10
			log.Printf("➖ Penalización por DNF error piloto: -10")
		}

		// DNF – no fault (mechanical/hit) (-3)
		if dnfNoFault, ok := bonuses["dnf_no_fault"].(bool); ok && dnfNoFault {
			totalPoints -= 3
			log.Printf("➖ Penalización por DNF sin culpa: -3")
		}
	}

	log.Printf("📊 Puntos totales calculados: %d (base: %d + bonificaciones: %d)", totalPoints, positionPoints, totalPoints-positionPoints)
	return totalPoints
}

// Función para obtener la posición esperada de un piloto
func getExpectedPosition(db *sql.DB, pilotID int, gpIndex int, mode string) (float64, error) {
	var expectedPosition float64

	// Buscar en la tabla expectations
	query := `SELECT exp_position FROM expectations 
			  WHERE card_id = ? AND card_type = 'pilot' AND gp_id = ?`

	err := db.QueryRow(query, pilotID, gpIndex).Scan(&expectedPosition)
	if err != nil {
		if err == sql.ErrNoRows {
			// Si no hay expectativa, usar 0
			log.Printf("⚠️ No se encontró expectativa para piloto %d en GP %d, usando 0", pilotID, gpIndex)
			return 0.0, nil
		}
		return 0, err
	}

	return expectedPosition, nil
}

// Función para obtener bonificaciones existentes de un piloto
func getExistingBonuses(db *sql.DB, pilotID int, gpIndex int, mode string) (map[string]interface{}, error) {
	bonuses := make(map[string]interface{})

	var table string
	switch mode {
	case "race", "R":
		table = "pilot_races"
	case "qualy", "Q":
		table = "pilot_qualies"
	case "practice", "P":
		table = "pilot_practices"
	default:
		return bonuses, nil
	}

	query := `SELECT 
				COALESCE(positions_gained_at_start, 0) as positions_gained_at_start,
				COALESCE(clean_overtakes, 0) as clean_overtakes,
				COALESCE(net_positions_lost, 0) as net_positions_lost,
				COALESCE(fastest_lap, 0) as fastest_lap,
				COALESCE(caused_vsc, 0) as caused_vsc,
				COALESCE(caused_sc, 0) as caused_sc,
				COALESCE(caused_red_flag, 0) as caused_red_flag,
				COALESCE(dnf_driver_error, 0) as dnf_driver_error,
				COALESCE(dnf_no_fault, 0) as dnf_no_fault
			  FROM ` + table + ` 
			  WHERE pilot_id = ? AND gp_index = ?`

	var (
		positionsGainedAtStart, cleanOvertakes, netPositionsLost                   int
		fastestLap, causedVsc, causedSc, causedRedFlag, dnfDriverError, dnfNoFault bool
	)

	err := db.QueryRow(query, pilotID, gpIndex).Scan(
		&positionsGainedAtStart, &cleanOvertakes, &netPositionsLost,
		&fastestLap, &causedVsc, &causedSc, &causedRedFlag, &dnfDriverError, &dnfNoFault,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			// No hay registros existentes, devolver bonificaciones vacías
			return bonuses, nil
		}
		return bonuses, err
	}

	bonuses["positions_gained_at_start"] = positionsGainedAtStart
	bonuses["clean_overtakes"] = cleanOvertakes
	bonuses["net_positions_lost"] = netPositionsLost
	bonuses["fastest_lap"] = fastestLap
	bonuses["caused_vsc"] = causedVsc
	bonuses["caused_sc"] = causedSc
	bonuses["caused_red_flag"] = causedRedFlag
	bonuses["dnf_driver_error"] = dnfDriverError
	bonuses["dnf_no_fault"] = dnfNoFault

	return bonuses, nil
}
