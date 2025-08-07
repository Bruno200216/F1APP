# F1 Scraper Final - Documentación Completa

## 🎯 Descripción

El **F1 Scraper Final** es la versión definitiva del scraper para extraer datos de Fórmula 1 desde `formula1.com` y guardarlos en tu base de datos Fantasy F1. Esta versión incluye todas las mejoras y correcciones de versiones anteriores.

## ✨ Características Principales

- ✅ **Manejo de compresión gzip**: Descomprime automáticamente el contenido de F1.com
- ✅ **Headers de navegador**: Simula un navegador real para evitar bloqueos
- ✅ **Diferenciación Sprint**: Usa Practice 1 para GPs con Sprint, Practice 3 para GPs normales
- ✅ **Mapeo completo de pilotos**: Convierte nombres de pilotos a IDs de tu base de datos
- ✅ **Mapeo de equipos**: Asigna equipos correctos a cada piloto
- ✅ **Modo test**: Permite probar sin afectar la base de datos
- ✅ **Integración completa**: Guarda datos en `pilot_races`, `pilot_qualies`, `pilot_practices`

## 🏁 GPs Soportados

| GP Key | Nombre | GP Index | Sprint |
|--------|--------|----------|--------|
| `belgian` | Belgian Grand Prix | 1 | ✅ |
| `hungarian` | Hungarian Grand Prix | 13 | ❌ |

## 🚀 Uso

### Modo Test (Sin base de datos)
```powershell
# Probar con Bélgica
.\test_scraper_final.ps1 belgian

# Probar con Hungría
.\test_scraper_final.ps1 hungarian

# O directamente
.\f1_scraper_final.exe belgian test
```

### Modo Producción (Con base de datos)
```powershell
# Ejecutar con base de datos
.\run_scraper_final.ps1 belgian

# O directamente
.\f1_scraper_final.exe belgian
```

## 📊 Datos Extraídos

### Carrera (Race)
- **Posición final** de cada piloto
- **Puntos F1 estándar** (25, 18, 15, 12, 10, 8, 6, 4, 2, 1)
- **Equipo** de cada piloto
- **Vuelta rápida** (TODO: implementar detección)

### Clasificación (Qualifying)
- **Posición final** de cada piloto
- **Equipo** de cada piloto

### Prácticas (Practice)
- **Posición final** de cada piloto
- **Equipo** de cada piloto
- **Practice 1** para GPs con Sprint
- **Practice 3** para GPs normales

## 🔧 Configuración

### Base de Datos
El scraper se conecta a MySQL con estas credenciales:
```go
dsn := "root:password@tcp(localhost:3306)/f1fantasy?charset=utf8mb4&parseTime=True&loc=Local"
```

### Mapeo de Pilotos
```go
var pilotNameToIDFinal = map[string]string{
    "Max Verstappen":    "VER",
    "Lando Norris":      "NOR",
    "Charles Leclerc":   "LEC",
    // ... más pilotos
}
```

### Mapeo de Equipos
```go
var pilotTeamMapping = map[string]string{
    "Max Verstappen":    "Red Bull Racing",
    "Lando Norris":      "McLaren",
    "Charles Leclerc":   "Ferrari",
    // ... más pilotos
}
```

### GPs con Sprint
```go
var sprintGPsFinal = map[string]bool{
    "belgian":     true,
    "hungarian":   false,
    "azerbaijan":  true,
    "qatar":       true,
    "brazilian":   true,
    // ... más GPs
}
```

## 📁 Estructura de Archivos

```
backend/tools/
├── f1_scraper_final.go          # Scraper principal
├── run_scraper_final.ps1        # Script para ejecutar con BD
├── test_scraper_final.ps1       # Script para modo test
├── go.mod                        # Dependencias Go
└── README_SCRAPER_FINAL.md      # Esta documentación
```

## 🔍 Funcionamiento Técnico

### 1. Extracción de Datos
- **Headers de navegador**: Simula Chrome para evitar bloqueos
- **Compresión gzip**: Maneja automáticamente la compresión de F1.com
- **Búsqueda directa**: Busca nombres de pilotos conocidos en el HTML
- **Mapeo de equipos**: Asigna equipos basado en datos conocidos de 2025

### 2. Procesamiento
- **Posiciones**: Asigna posiciones secuenciales (1, 2, 3...)
- **Puntos**: Calcula puntos F1 estándar según posición
- **Mapeo**: Convierte nombres de pilotos a IDs de tu BD

### 3. Base de Datos
- **Upsert**: Crea o actualiza registros existentes
- **Relaciones**: Usa `pilot_id` y `gp_index` como claves
- **Transacciones**: Manejo seguro de errores

## 🐛 Solución de Problemas

### Error: "No se encontraron resultados"
- Verifica que la URL de F1.com sea correcta
- Comprueba que el GP tenga datos disponibles
- Revisa la conexión a internet

### Error: "Piloto no encontrado en mapeo"
- Añade el piloto al mapeo `pilotNameToIDFinal`
- Verifica que el nombre coincida exactamente

### Error: "Error conectando a la base de datos"
- Verifica que MySQL esté ejecutándose
- Comprueba las credenciales en el código
- Asegúrate de que la BD `f1fantasy` existe

## 🔄 Próximas Mejoras

- [ ] **Detección de vuelta rápida** desde fastest-laps
- [ ] **Pit stop times** desde pit-stop-summary
- [ ] **Más GPs** (Dutch, Italian, etc.)
- [ ] **Validación de datos** antes de guardar
- [ ] **Logging detallado** para debugging
- [ ] **Configuración externa** (archivo YAML)

## 📝 Notas Importantes

1. **F1.com cambia frecuentemente**: Si el scraper deja de funcionar, puede que F1.com haya cambiado su estructura
2. **Datos en tiempo real**: Los datos solo están disponibles después de que termine cada sesión
3. **Rate limiting**: F1.com puede bloquear requests muy frecuentes
4. **Backup**: Siempre haz backup de tu BD antes de ejecutar el scraper

## 🎉 ¡Listo para usar!

El scraper final está completamente funcional y puede extraer datos de carrera, clasificación y prácticas de F1.com y guardarlos en tu base de datos Fantasy F1.

**Comando recomendado para empezar:**
```powershell
.\test_scraper_final.ps1 belgian
```

## 📋 Archivos Eliminados

Se han eliminado los siguientes archivos obsoletos:
- `complete_scraper.go` - Versión anterior con errores
- `f1_scraper_v2.go` - Versión anterior con errores
- `f1_scraper.go` - Versión anterior con errores
- `f1_scraper_test.go` - Versión anterior con errores
- `f1_scraper_v3.go` - Versión anterior con errores
- Y todos los archivos de debug y test obsoletos

**Solo se mantiene el scraper final que funciona correctamente.** 