# Duración de Elementos en el Mercado - Información Completa

## ⏰ **Duración de Elementos en Venta:**

### **72 horas (3 días)**
Cuando un usuario pone un elemento a la venta, este permanece en el mercado durante **72 horas** (3 días).

**Código en el backend:**
```go
// Si venta es positiva, poner a la venta
now := time.Now()
expires := now.Add(72 * time.Hour)  // 72 horas = 3 días
pbl.Venta = &req.Venta
pbl.VentaExpiresAt = &expires
```

### **Aplicable a todos los tipos de elementos:**
- ✅ **Pilotos** (`pilot_by_leagues`)
- ✅ **Track Engineers** (`track_engineer_by_league`)
- ✅ **Chief Engineers** (`chief_engineers_by_league`)
- ✅ **Team Constructors** (`teamconstructor_by_league`)

## 🔄 **Diferentes tipos de duración:**

### 1. **Elementos en Venta (72 horas)**
- **Campo:** `venta_expires_at`
- **Trigger:** Cuando el usuario pone un elemento a la venta
- **Duración:** 72 horas (3 días)
- **Acción:** El elemento se retira automáticamente del mercado

### 2. **Ofertas de la FIA (24 horas)**
- **Campo:** `league_offer_expires_at`
- **Trigger:** Cuando se genera una oferta de la FIA
- **Duración:** 24 horas (1 día)
- **Acción:** La oferta de la FIA expira y se puede generar una nueva

### 3. **Subastas (24 horas)**
- **Campo:** `end_time` en tabla `auctions`
- **Trigger:** Cuando se crea una subasta
- **Duración:** 24 horas (1 día)
- **Acción:** La subasta finaliza y se asigna al ganador

### 4. **Cláusulas de Rescate (14 días)**
- **Campo:** `clausulatime`
- **Trigger:** Después de una subasta exitosa
- **Duración:** 14 días
- **Acción:** El propietario puede activar la cláusula

## 📊 **Flujo de expiración:**

### **Elemento en Venta:**
1. **Usuario pone elemento a la venta** → `venta_expires_at = now + 72h`
2. **Se genera oferta de la FIA** → `league_offer_expires_at = now + 24h`
3. **Oferta de la FIA expira** → Se puede generar nueva oferta
4. **Elemento expira del mercado** → Se retira automáticamente

### **Subasta:**
1. **Se crea subasta** → `end_time = now + 24h`
2. **Subasta finaliza** → Se asigna al ganador
3. **Se genera cláusula** → `clausulatime = end_time + 14d`

## 🎯 **Comportamiento del sistema:**

### **Cuando expira un elemento en venta:**
- El elemento se retira automáticamente del mercado
- Se limpian las ofertas de la FIA asociadas
- El propietario mantiene la propiedad del elemento

### **Cuando expira una oferta de la FIA:**
- La oferta se marca como expirada
- Se puede generar una nueva oferta de la FIA
- El elemento permanece en venta hasta que expire

### **Cuando expira una subasta:**
- Se finaliza la subasta automáticamente
- Se asigna el elemento al ganador
- Se genera una cláusula de rescate

## 🔧 **Configuración actual:**

```go
// Duración de elementos en venta
expires := now.Add(72 * time.Hour)  // 3 días

// Duración de ofertas de la FIA
expires := time.Now().Add(24 * time.Hour)  // 1 día

// Duración de subastas
EndTime: time.Now().Add(24 * time.Hour)  // 1 día

// Duración de cláusulas
clausulaExpira := auction.EndTime.Add(14 * 24 * time.Hour)  // 14 días
```

## 📝 **Logs del sistema:**

El sistema genera logs cuando los elementos expiran:
- `[MARKET] Elemento expirado del mercado: ID X`
- `[FIA] Oferta expirada para elemento: ID X`
- `[AUCTION] Subasta finalizada: ID X`

## 🚨 **Consideraciones importantes:**

1. **Los elementos en venta duran 3 días** - No 24 horas como las subastas
2. **Las ofertas de la FIA duran 1 día** - Se pueden regenerar
3. **Las subastas duran 1 día** - Se finalizan automáticamente
4. **Las cláusulas duran 14 días** - Después de una subasta exitosa

## 💡 **Para cambiar la duración:**

Si quieres cambiar la duración de elementos en venta, modifica esta línea en el backend:
```go
expires := now.Add(72 * time.Hour)  // Cambiar 72 por las horas deseadas
``` 