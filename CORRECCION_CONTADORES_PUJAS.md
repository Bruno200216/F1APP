# Corrección de Contadores de Pujas

## Problema Identificado

**Contador incorrecto en "Datos Generales"**:
- **Antes**: Solo contaba pujas en subastas (`myBids.length`)
- **Problema**: No incluía ofertas a otros jugadores
- **Resultado**: Mostraba "1 puja" cuando había 1 puja en subasta + 1 oferta a otro jugador

## Solución Implementada

### **1. Funciones de Contadores Dinámicos**

#### **Nuevas funciones agregadas**:

```javascript
// Contadores dinámicos para pujas activas
const getActiveBidsCount = () => {
  return myBids.filter(bid => 
    bid.my_bid !== undefined && 
    bid.my_bid !== null && 
    bid.my_bid > 0 &&
    bid.is_auction === true
  ).length;
};

const getActiveOffersCount = () => {
  return existingOffers.filter(offer => 
    offer.my_bid !== undefined && 
    offer.my_bid !== null && 
    offer.my_bid > 0 &&
    offer.is_auction === false
  ).length;
};

// Total de pujas activas (subastas + ofertas)
const getTotalActiveBidsCount = () => {
  return getActiveBidsCount() + getActiveOffersCount();
};
```

### **2. Contador Corregido en "Datos Generales"**

#### **Antes**:
```jsx
<p className="text-h3 font-bold text-state-warning">
  {myBids.length} puja{myBids.length !== 1 ? 's' : ''}
</p>
```

#### **Después**:
```jsx
<p className="text-h3 font-bold text-state-warning">
  {getTotalActiveBidsCount()} puja{getTotalActiveBidsCount() !== 1 ? 's' : ''}
</p>
```

## Funcionalidad de las Nuevas Funciones

### **getActiveBidsCount()**:
- ✅ **Filtra pujas en subastas**: Solo cuenta pujas donde `is_auction === true`
- ✅ **Verifica pujas válidas**: Solo cuenta pujas con `my_bid > 0`
- ✅ **Excluye pujas nulas**: Ignora pujas con `my_bid` undefined o null

### **getActiveOffersCount()**:
- ✅ **Filtra ofertas a otros jugadores**: Solo cuenta ofertas donde `is_auction === false`
- ✅ **Verifica ofertas válidas**: Solo cuenta ofertas con `my_bid > 0`
- ✅ **Excluye ofertas nulas**: Ignora ofertas con `my_bid` undefined o null

### **getTotalActiveBidsCount()**:
- ✅ **Suma total real**: Combina pujas en subastas + ofertas a otros jugadores
- ✅ **Contador preciso**: Refleja el número real de operaciones activas
- ✅ **Actualización dinámica**: Se recalcula automáticamente cuando cambian los arrays

## Archivos Modificados

### **Frontend** (`frontend/src/pages/MarketPage.jsx`)

#### **Línea ~169** (Nuevas funciones):
```javascript
// Contadores dinámicos para pujas activas
const getActiveBidsCount = () => {
  return myBids.filter(bid => 
    bid.my_bid !== undefined && 
    bid.my_bid !== null && 
    bid.my_bid > 0 &&
    bid.is_auction === true
  ).length;
};

const getActiveOffersCount = () => {
  return existingOffers.filter(offer => 
    offer.my_bid !== undefined && 
    offer.my_bid !== null && 
    offer.my_bid > 0 &&
    offer.is_auction === false
  ).length;
};

// Total de pujas activas (subastas + ofertas)
const getTotalActiveBidsCount = () => {
  return getActiveBidsCount() + getActiveOffersCount();
};
```

#### **Línea ~1600** (Contador corregido):
```jsx
// ANTES:
{myBids.length} puja{myBids.length !== 1 ? 's' : ''}

// DESPUÉS:
{getTotalActiveBidsCount()} puja{getTotalActiveBidsCount() !== 1 ? 's' : ''}
```

## Resultado

### **Contador "Pujas activas"**:
- ✅ **Antes**: Solo mostraba pujas en subastas
- ✅ **Después**: Muestra TODAS las pujas activas (subastas + ofertas a otros jugadores)
- ✅ **Ejemplo**: Si hay 1 puja en subasta + 1 oferta a otro jugador = "2 pujas"

### **Funcionalidad**:
- ✅ **Contador preciso**: Refleja el número real de operaciones activas
- ✅ **Actualización automática**: Se recalcula cuando se agregan/eliminan pujas
- ✅ **Filtrado correcto**: Solo cuenta pujas válidas y activas
- ✅ **Diferenciación clara**: Distingue entre subastas y ofertas a otros jugadores

## Verificación

### Para probar la corrección:

1. **Ir a "Mercado" → "Mis Operaciones - Compras"**
2. **Hacer una puja en subasta**:
   - Verificar que el contador muestre "1 puja"
3. **Hacer una oferta a otro jugador**:
   - Verificar que el contador muestre "2 pujas"
4. **Eliminar una puja**:
   - Verificar que el contador se actualice correctamente
5. **Eliminar todas las pujas**:
   - Verificar que el contador muestre "0 pujas"

### Información esperada:
- **1 puja en subasta**: "1 puja"
- **1 oferta a otro jugador**: "1 puja"
- **1 puja en subasta + 1 oferta**: "2 pujas"
- **Sin pujas activas**: "0 pujas" o mensaje "Sin pujas activas"

## Ventajas de la Solución

### **1. Precisión**:
- ✅ **Contador real**: Muestra el número exacto de operaciones activas
- ✅ **Filtrado inteligente**: Solo cuenta pujas válidas y activas
- ✅ **Sin duplicados**: No cuenta la misma puja dos veces

### **2. Flexibilidad**:
- ✅ **Funciones separadas**: Permite contar subastas y ofertas por separado
- ✅ **Fácil mantenimiento**: Lógica clara y reutilizable
- ✅ **Escalable**: Fácil agregar nuevos tipos de pujas

### **3. UX Mejorada**:
- ✅ **Información clara**: El usuario ve el número real de operaciones
- ✅ **Actualización inmediata**: Los contadores se actualizan en tiempo real
- ✅ **Consistencia**: Los contadores coinciden con la información mostrada 