# F1 Scraper - Documentación

## Descripción
El scraper de F1 es una herramienta que extrae automáticamente los resultados de qualifying desde la página oficial de Formula 1 (f1.com) y los almacena en la base de datos de la aplicación.

## Funcionalidades

### 1. Extracción de Datos
- **Posiciones de qualifying**: Extrae las posiciones finales de todos los pilotos
- **Información del piloto**: Nombre, código, número, equipo
- **Tiempos**: Tiempos de Q1, Q2 y Q3
- **Vueltas**: Número de vueltas completadas

### 2. Integración con Base de Datos
- **Creación automática**: Crea nuevos pilotos si no existen
- **Actualización**: Actualiza posiciones existentes
- **Mapeo de GPs**: Convierte claves de GP a índices de base de datos

## Endpoints de API

### POST /api/admin/run-scraper
Ejecuta el scraper para un GP específico.

**Parámetros:**
```json
{
  "gp_key": "china"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Scraper ejecutado exitosamente",
  "gp_key": "china",
  "data": {
    "success": true,
    "message": "Datos extraídos exitosamente para GP: china",
    "data": [...],
    "gp_key": "china"
  }
}
```

### GET /api/admin/scraper-data/:gp_key
Obtiene los datos del scraper sin ejecutarlo.

**Parámetros:**
- `gp_key`: Clave del GP (ej: "china", "bahrain")

## Claves de GP Soportadas

| Clave | Nombre | GP Index |
|-------|--------|----------|
| bahrain | Bahrain | 1 |
| saudi_arabia | Saudi Arabia | 2 |
| australia | Australia | 3 |
| japan | Japan | 4 |
| china | China | 5 |
| miami | Miami | 6 |
| emilia_romagna | Emilia Romagna | 7 |
| monaco | Monaco | 8 |
| spain | Spain | 9 |
| canada | Canada | 10 |
| austria | Austria | 11 |
| great_britain | Great Britain | 12 |
| belgium | Belgium | 13 |
| hungary | Hungary | 14 |
| netherlands | Netherlands | 15 |
| italy | Italy | 16 |
| azerbaijan | Azerbaijan | 17 |
| singapore | Singapore | 18 |
| united_states | United States | 19 |
| mexican | Mexican | 20 |
| brazilian | Brazilian | 21 |
| las_vegas | Las Vegas | 22 |
| qatar | Qatar | 23 |
| abu_dhabi | Abu Dhabi | 24 |

## Uso desde la Interfaz

### 1. Acceder a Admin Scores
- Navegar a la página de Admin Scores
- Ir a la sección "Scraper de F1.com"

### 2. Seleccionar GP
- Elegir el Grand Prix desde el dropdown
- El sistema automáticamente mapea el nombre a la clave correcta

### 3. Ejecutar Scraper
- Hacer clic en "Ejecutar Scraper"
- Confirmar la acción en el modal
- Esperar a que se complete el proceso

### 4. Verificar Resultados
- Los datos se almacenan automáticamente en la base de datos
- Se pueden ver en la tabla de pilotos y qualifying

## Estructura de Datos Extraídos

```go
type ScrapedDriverData struct {
    Position     int    `json:"position"`      // Posición final
    DriverNumber string `json:"driver_number"` // Número del piloto
    DriverName   string `json:"driver_name"`   // Nombre completo
    DriverCode   string `json:"driver_code"`   // Código de 3 letras
    Team         string `json:"team"`          // Nombre del equipo
    Q1Time       string `json:"q1_time"`       // Tiempo Q1
    Q2Time       string `json:"q2_time"`       // Tiempo Q2
    Q3Time       string `json:"q3_time"`       // Tiempo Q3
    Laps         string `json:"laps"`          // Número de vueltas
}
```

## Logs y Debugging

El scraper genera logs detallados con el prefijo `[SCRAPER]`:

```
[SCRAPER] Iniciando scraper para GP: china
[SCRAPER] URL objetivo: https://www.formula1.com/en/results/2025/races/1255/china/qualifying
[SCRAPER] Datos extraídos: 20 pilotos
[SCRAPER] Guardando 20 registros de pilotos en la base de datos
[SCRAPER] Piloto Max Verstappen procesado exitosamente (Posición: 1)
[SCRAPER] Scraper completado exitosamente para GP: china
```

## Manejo de Errores

### Errores Comunes
1. **Error de conexión HTTP**: Problemas de red o sitio no disponible
2. **Error de parsing HTML**: Cambios en la estructura de la página
3. **Error de base de datos**: Problemas de conexión o permisos
4. **GP no válido**: Clave de GP no reconocida

### Solución de Problemas
- Verificar conectividad a internet
- Comprobar que la URL de F1.com sea accesible
- Revisar logs del backend para errores específicos
- Verificar que la clave del GP sea correcta

## Limitaciones

- Solo extrae datos de qualifying (no race o practice)
- Depende de la estructura HTML de f1.com
- Requiere que el GP haya terminado para tener resultados
- Los datos se extraen en tiempo real desde la web

## Seguridad

- Solo usuarios administradores pueden ejecutar el scraper
- Se valida la autenticación antes de ejecutar
- Los datos se sanitizan antes de almacenar en la BD
- No se almacenan datos sensibles o personales

## Mantenimiento

### Actualizaciones
- Revisar periódicamente la estructura HTML de f1.com
- Actualizar el mapeo de claves de GP si es necesario
- Monitorear logs para detectar cambios en la página

### Backup
- Los datos extraídos se almacenan en la base de datos principal
- Se recomienda hacer backup antes de ejecutar el scraper
- Los datos existentes se actualizan, no se sobrescriben 