package main

// GPURLs contiene las URLs de todos los GPs de la temporada 2025
var GPURLs = map[string]map[string]string{
	"belgian": {
		"name":         "Belgian Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1265/belgium/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1265/belgium/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1265/belgium/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1265/belgium/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1265/belgium/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1265/belgium/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1265/belgium/fastest-laps",
		"gp_index":     "1265",
	},
	"hungarian": {
		"name":         "Hungarian Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1266/hungary/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1266/hungary/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1266/hungary/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1266/hungary/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1266/hungary/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1266/hungary/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1266/hungary/fastest-laps",
		"gp_index":     "1266",
	},
	"dutch": {
		"name":         "Dutch Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1267/netherlands/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1267/netherlands/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1267/netherlands/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1267/netherlands/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1267/netherlands/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1267/netherlands/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1267/netherlands/fastest-laps",
		"gp_index":     "1267",
	},
	"italian": {
		"name":         "Italian Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1268/italy/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1268/italy/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1268/italy/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1268/italy/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1268/italy/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1268/italy/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1268/italy/fastest-laps",
		"gp_index":     "1268",
	},
	"azerbaijan": {
		"name":         "Azerbaijan Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1269/azerbaijan/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1269/azerbaijan/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1269/azerbaijan/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1269/azerbaijan/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1269/azerbaijan/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1269/azerbaijan/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1269/azerbaijan/fastest-laps",
		"gp_index":     "1269",
	},
	"singapore": {
		"name":         "Singapore Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1270/singapore/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1270/singapore/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1270/singapore/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1270/singapore/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1270/singapore/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1270/singapore/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1270/singapore/fastest-laps",
		"gp_index":     "1270",
	},
	"japanese": {
		"name":         "Japanese Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1271/japan/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1271/japan/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1271/japan/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1271/japan/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1271/japan/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1271/japan/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1271/japan/fastest-laps",
		"gp_index":     "1271",
	},
	"qatar": {
		"name":         "Qatar Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1272/qatar/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1272/qatar/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1272/qatar/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1272/qatar/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1272/qatar/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1272/qatar/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1272/qatar/fastest-laps",
		"gp_index":     "1272",
	},
	"united_states": {
		"name":         "United States Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1273/united-states/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1273/united-states/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1273/united-states/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1273/united-states/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1273/united-states/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1273/united-states/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1273/united-states/fastest-laps",
		"gp_index":     "1273",
	},
	"mexican": {
		"name":         "Mexican Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1274/mexico/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1274/mexico/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1274/mexico/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1274/mexico/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1274/mexico/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1274/mexico/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1274/mexico/fastest-laps",
		"gp_index":     "1274",
	},
	"brazilian": {
		"name":         "Brazilian Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1275/brazil/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1275/brazil/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1275/brazil/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1275/brazil/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1275/brazil/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1275/brazil/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1275/brazil/fastest-laps",
		"gp_index":     "1275",
	},
	"las_vegas": {
		"name":         "Las Vegas Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1276/las-vegas/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1276/las-vegas/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1276/las-vegas/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1276/las-vegas/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1276/las-vegas/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1276/las-vegas/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1276/las-vegas/fastest-laps",
		"gp_index":     "1276",
	},
	"abu_dhabi": {
		"name":         "Abu Dhabi Grand Prix",
		"race":         "https://www.formula1.com/en/results/2025/races/1277/abu-dhabi/race-result",
		"qualifying":   "https://www.formula1.com/en/results/2025/races/1277/abu-dhabi/qualifying",
		"practice1":    "https://www.formula1.com/en/results/2025/races/1277/abu-dhabi/practice/1",
		"practice2":    "https://www.formula1.com/en/results/2025/races/1277/abu-dhabi/practice/2",
		"practice3":    "https://www.formula1.com/en/results/2025/races/1277/abu-dhabi/practice/3",
		"pit_stops":    "https://www.formula1.com/en/results/2025/races/1277/abu-dhabi/pit-stop-summary",
		"fastest_laps": "https://www.formula1.com/en/results/2025/races/1277/abu-dhabi/fastest-laps",
		"gp_index":     "1277",
	},
}

// GetGPURLs devuelve las URLs de un GP específico
func GetGPURLs(gpKey string) (map[string]string, bool) {
	urls, exists := GPURLs[gpKey]
	return urls, exists
}

// GetAllGPKeys devuelve todas las claves de GP disponibles
func GetAllGPKeys() []string {
	keys := make([]string, 0, len(GPURLs))
	for k := range GPURLs {
		keys = append(keys, k)
	}
	return keys
}
