# Sistema de Ofertas de la FIA - Documentación Completa

## 📊 **Tablas donde se guardan las ofertas de la FIA:**

### 1. **`pilot_by_leagues`**
- **Campo:** `league_offer_value` (DECIMAL) - Valor de la oferta de la FIA
- **Campo:** `league_offer_expires_at` (DATETIME) - Fecha de expiración
- **Descripción:** Ofertas de la FIA para pilotos en venta

### 2. **`track_engineer_by_league`**
- **Campo:** `league_offer_value` (DECIMAL) - Valor de la oferta de la FIA
- **Campo:** `league_offer_expires_at` (DATETIME) - Fecha de expiración
- **Descripción:** Ofertas de la FIA para track engineers en venta

### 3. **`chief_engineers_by_league`**
- **Campo:** `league_offer_value` (DECIMAL) - Valor de la oferta de la FIA
- **Campo:** `league_offer_expires_at` (DATETIME) - Fecha de expiración
- **Descripción:** Ofertas de la FIA para chief engineers en venta

### 4. **`teamconstructor_by_league`**
- **Campo:** `league_offer_value` (DECIMAL) - Valor de la oferta de la FIA
- **Campo:** `league_offer_expires_at` (DATETIME) - Fecha de expiración
- **Descripción:** Ofertas de la FIA para team constructors en venta

## 🔄 **Cuándo se generan las ofertas de la FIA:**

### ✅ **Generación Manual (Admin)**
- **Endpoint:** `POST /api/generate-fia-offers`
- **Endpoint:** `POST /api/generate-fia-offers-owned`
- **Botón:** "Generar Ofertas FIA" en la interfaz de admin
- **Condiciones:** Solo usuarios admin pueden ejecutar

### ✅ **Generación Automática después de Subastas**
- **Función:** `generateFIAOffersForLeague()`
- **Trigger:** Después de finalizar subastas
- **Condiciones:** Solo para elementos que están en venta

### ❌ **Generación Automática cada 24 horas (ELIMINADA)**
- **Razón:** Se eliminó para evitar spam de ofertas
- **Comportamiento anterior:** Generaba ofertas automáticamente cada 24 horas

## 🎯 **Condiciones para generar ofertas de la FIA:**

1. **Elemento debe estar en venta:**
   - `venta IS NOT NULL`
   - `venta_expires_at > now()`

2. **No debe tener oferta previa:**
   - `league_offer_value IS NULL`

3. **Solo para elementos válidos:**
   - Pilotos, Track Engineers, Chief Engineers, Team Constructors

## 💰 **Cálculo del valor de las ofertas:**

```go
func generateFIAOffer(saleValue float64) float64 {
    // Generar un valor aleatorio entre 0.9 y 1.1 (90% a 110%)
    multiplier := 0.9 + rand.Float64()*0.2
    result := saleValue * multiplier
    // Redondear a 2 decimales para evitar problemas de precisión
    return math.Round(result*100) / 100
}
```

**Rango:** Entre 90% y 110% del valor de venta
**Ejemplo:** Si un piloto está en venta por 1,000,000€, la FIA ofrecerá entre 900,000€ y 1,100,000€

## ⏰ **Duración de las ofertas:**

- **Expiración:** 24 horas desde la generación
- **Campo:** `league_offer_expires_at`

## 🔧 **Endpoints relacionados:**

### Generación de Ofertas:
- `POST /api/generate-fia-offers` - Para elementos en venta
- `POST /api/generate-fia-offers-owned` - Para elementos con propietario

### Gestión de Ofertas:
- `POST /api/pilotbyleague/accept-league-offer` - Aceptar oferta FIA
- `POST /api/pilotbyleague/reject-league-offer` - Rechazar oferta FIA
- `POST /api/trackengineerbyleague/accept-league-offer` - Aceptar oferta FIA
- `POST /api/trackengineerbyleague/reject-league-offer` - Rechazar oferta FIA
- `POST /api/chiefengineerbyleague/accept-league-offer` - Aceptar oferta FIA
- `POST /api/chiefengineerbyleague/reject-league-offer` - Rechazar oferta FIA
- `POST /api/teamconstructorbyleague/accept-league-offer` - Aceptar oferta FIA
- `POST /api/teamconstructorbyleague/reject-league-offer` - Rechazar oferta FIA

### Consulta de Ofertas:
- `GET /api/my-market-sales` - Elementos en venta con ofertas FIA
- `GET /api/player/received-offers` - Ofertas recibidas de jugadores

## 🎨 **Visualización en el Frontend:**

### Sección "OFERTA DE LA FIA":
- Muestra el valor de la oferta de la FIA
- Botones "Aceptar" y "Rechazar"
- Fecha de expiración
- Solo aparece si `league_offer_value` no es NULL

### Sección "OFERTAS RECIBIDAS":
- Muestra ofertas de otros jugadores
- No incluye ofertas de la FIA (estas van en sección separada)

## 🚨 **Problemas comunes:**

1. **No aparecen ofertas de la FIA:**
   - Verificar que el elemento esté en venta
   - Verificar que no tenga oferta previa
   - Verificar que el usuario sea admin para generar ofertas

2. **Ofertas expiradas:**
   - Las ofertas expiran después de 24 horas
   - Se pueden generar nuevas ofertas manualmente

3. **Permisos de admin:**
   - Solo usuarios con `is_admin = true` pueden generar ofertas
   - Verificar en la tabla `players`

## 📝 **Logs del sistema:**

El sistema genera logs detallados:
- `[FIA]` - Generación de ofertas
- `[FIA-OFFERS]` - Endpoint de generación manual
- `[FIA-OWNED-OFFERS]` - Ofertas para elementos con propietario

## 🔍 **Para debuggear:**

1. **Verificar elementos en venta:**
   ```sql
   SELECT * FROM pilot_by_leagues 
   WHERE venta IS NOT NULL AND venta_expires_at > NOW();
   ```

2. **Verificar ofertas de la FIA:**
   ```sql
   SELECT * FROM pilot_by_leagues 
   WHERE league_offer_value IS NOT NULL;
   ```

3. **Verificar permisos de admin:**
   ```sql
   SELECT * FROM players WHERE is_admin = true;
   ``` 