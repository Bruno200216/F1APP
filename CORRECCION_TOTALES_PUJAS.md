# Corrección de Totales de Pujas

## Problema Identificado

**Totales incorrectos en diferentes secciones**:
1. **"Datos Generales"**: Solo mostraba la suma de pujas en subastas, no incluía ofertas a otros jugadores
2. **Secciones específicas**: Mostraban "restante" en lugar de solo el total de ese tipo

### Problema:
- **Datos Generales**: `calculateTotalBids()` solo sumaba `myBids` (subastas)
- **Secciones específicas**: Mostraban "En pujas: X€" + "Disponible: Y€" (información redundante)

## Solución Implementada

### **1. Función calculateTotalBids Corregida**

#### **Antes**:
```javascript
const calculateTotalBids = () => {
  const total = myBids.reduce((total, bid) => {
    // Solo sumaba pujas en subastas
    let bidAmount = 0;
    if (bid.my_bid !== undefined && bid.my_bid !== null && bid.my_bid > 0) {
      bidAmount = Number(bid.my_bid);
    } else {
      bidAmount = Number(
        bid.bid_amount || 
        bid.amount || 
        bid.value || 
        bid.puja || 
        0
      );
    }
    return total + bidAmount;
  }, 0);
  return total;
};
```

#### **Después**:
```javascript
const calculateTotalBids = () => {
  // Sumar pujas en subastas
  const auctionBids = myBids.reduce((total, bid) => {
    let bidAmount = 0;
    if (bid.my_bid !== undefined && bid.my_bid !== null && bid.my_bid > 0) {
      bidAmount = Number(bid.my_bid);
    } else {
      bidAmount = Number(
        bid.bid_amount || 
        bid.amount || 
        bid.value || 
        bid.puja || 
        0
      );
    }
    return total + bidAmount;
  }, 0);

  // Sumar ofertas a otros jugadores
  const playerOffers = existingOffers.reduce((total, offer) => {
    let offerAmount = 0;
    if (offer.my_bid !== undefined && offer.my_bid !== null && offer.my_bid > 0) {
      offerAmount = Number(offer.my_bid);
    } else {
      offerAmount = Number(
        offer.bid_amount || 
        offer.amount || 
        offer.value || 
        offer.puja || 
        0
      );
    }
    return total + offerAmount;
  }, 0);

  const total = auctionBids + playerOffers;
  console.log('Total bids calculated:', total, '(auction:', auctionBids, '+ offers:', playerOffers, ')');
  return total;
};
```

### **2. Secciones Específicas Simplificadas**

#### **Pujas en Subastas**:

##### **Antes**:
```jsx
{/* Información de pujas y saldo para subastas */}
{myBids.length > 0 && (
  <div className="flex items-center gap-4 text-xs">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-state-error"></div>
      <span className="text-text-secondary">En pujas:</span>
      <span className="font-bold text-state-error">{formatCurrency(calculateTotalAuctionBids())}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-state-success"></div>
      <span className="text-text-secondary">Disponible:</span>
      <span className="font-bold text-state-success">{formatCurrency(playerMoney - calculateTotalAuctionBids())}</span>
    </div>
  </div>
)}
```

##### **Después**:
```jsx
{/* Información de pujas en subastas */}
{myBids.length > 0 && (
  <div className="flex items-center gap-4 text-xs">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-state-error"></div>
      <span className="text-text-secondary">Total en pujas:</span>
      <span className="font-bold text-state-error">{formatCurrency(calculateTotalAuctionBids())}</span>
    </div>
  </div>
)}
```

#### **Ofertas a Otros Jugadores**:

##### **Antes**:
```jsx
{/* Información de ofertas y saldo para otros jugadores */}
{existingOffers.length > 0 && (
  <div className="flex items-center gap-4 text-xs">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-state-error"></div>
      <span className="text-text-secondary">En ofertas:</span>
      <span className="font-bold text-state-error">{formatCurrency(calculateTotalPlayerOffers())}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-state-success"></div>
      <span className="text-text-secondary">Disponible:</span>
      <span className="font-bold text-state-success">{formatCurrency(playerMoney - calculateTotalPlayerOffers())}</span>
    </div>
  </div>
)}
```

##### **Después**:
```jsx
{/* Información de ofertas a otros jugadores */}
{existingOffers.length > 0 && (
  <div className="flex items-center gap-4 text-xs">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-state-error"></div>
      <span className="text-text-secondary">Total en ofertas:</span>
      <span className="font-bold text-state-error">{formatCurrency(calculateTotalPlayerOffers())}</span>
    </div>
  </div>
)}
```

## Archivos Modificados

### **Frontend** (`frontend/src/pages/MarketPage.jsx`)

#### **Línea ~97** (calculateTotalBids):
```javascript
// ANTES: Solo sumaba myBids (subastas)
const total = myBids.reduce((total, bid) => { ... }, 0);

// DESPUÉS: Suma myBids + existingOffers (subastas + ofertas)
const auctionBids = myBids.reduce((total, bid) => { ... }, 0);
const playerOffers = existingOffers.reduce((total, offer) => { ... }, 0);
const total = auctionBids + playerOffers;
```

#### **Línea ~1980** (Pujas en Subastas):
```jsx
// ANTES:
<span className="text-text-secondary">En pujas:</span>
// + información de "Disponible"

// DESPUÉS:
<span className="text-text-secondary">Total en pujas:</span>
// Solo información del total
```

#### **Línea ~2139** (Ofertas a Otros Jugadores):
```jsx
// ANTES:
<span className="text-text-secondary">En ofertas:</span>
// + información de "Disponible"

// DESPUÉS:
<span className="text-text-secondary">Total en ofertas:</span>
// Solo información del total
```

## Resultado

### **Datos Generales**:
- ✅ **Total correcto**: Ahora suma TODAS las pujas (subastas + ofertas a otros jugadores)
- ✅ **Información completa**: Refleja el dinero total comprometido en todas las operaciones

### **Secciones Específicas**:
- ✅ **Pujas en Subastas**: Solo muestra "Total en pujas: X€"
- ✅ **Ofertas a Otros Jugadores**: Solo muestra "Total en ofertas: X€"
- ✅ **Información limpia**: Sin información redundante de "disponible"

### **Funcionalidad**:
- ✅ **Cálculos precisos**: Cada sección muestra su total específico
- ✅ **Datos Generales**: Muestra la suma total de todas las operaciones
- ✅ **UX mejorada**: Información más clara y concisa

## Verificación

### Para probar la corrección:

1. **Reiniciar el backend** para cargar los cambios
2. **Ir a "Mercado" → "Mis Operaciones - Compras"**
3. **Hacer pujas en subastas** y verificar que:
   - **Datos Generales**: Muestra el total de todas las pujas
   - **Pujas en Subastas**: Solo muestra el total de pujas en subastas
4. **Hacer ofertas a otros jugadores** y verificar que:
   - **Datos Generales**: Muestra el total de todas las pujas (actualizado)
   - **Ofertas a Otros Jugadores**: Solo muestra el total de ofertas a otros jugadores

### Información esperada:
- **Datos Generales**: "Total en pujas: X€" (suma de subastas + ofertas)
- **Pujas en Subastas**: "Total en pujas: Y€" (solo subastas)
- **Ofertas a Otros Jugadores**: "Total en ofertas: Z€" (solo ofertas) 