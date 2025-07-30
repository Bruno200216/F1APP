# Corrección de Clasificación y Contadores

## Problemas Identificados

### **1. ClasificationPage.jsx**:
- **Mostraba saldo** en lugar de valor de equipo
- **Ordenaba por puntos** en lugar de valor de equipo

### **2. Contadores de Pujas**:
- **Contador incorrecto**: Se mostraba "1 puja" cuando debería ser "0" o el número correcto
- **Actualización tardía**: Los contadores no se actualizaban inmediatamente después de eliminar pujas

## Soluciones Implementadas

### **1. ClasificationPage.jsx - Cambios Realizados**

#### **Ordenamiento Corregido**:

##### **Antes**:
```javascript
// Ordenar por puntos descendente y luego por money descendente
const sorted = (data.classification || []).sort((a, b) => b.points - a.points || b.money - a.money);
```

##### **Después**:
```javascript
// Ordenar por valor de equipo descendente y luego por puntos descendente
const sorted = (data.classification || []).sort((a, b) => b.team_value - a.team_value || b.points - a.points);
```

#### **Información Mostrada Corregida**:

##### **Antes**:
```jsx
<p className="text-text-secondary text-small mt-1">
  €{formatNumberWithDots(player.money) || '0'}
</p>
```

##### **Después**:
```jsx
<p className="text-text-secondary text-small mt-1">
  €{formatNumberWithDots(player.team_value) || '0'}
</p>
```

### **2. Análisis del Problema de Contadores**

#### **Problema Identificado**:
Los contadores se muestran como `({myBids.length})` y `({existingOffers.length})`, pero estos arrays pueden contener elementos que no deberían contarse como "pujas activas".

#### **Causa Raíz**:
1. **Filtrado en el backend**: Los endpoints pueden estar devolviendo elementos que no son pujas activas
2. **Filtrado en el frontend**: Las funciones `fetchMyBids` y `fetchExistingOffers` filtran correctamente, pero el contador se muestra antes de que se actualice el estado
3. **Timing**: Los contadores se renderizan antes de que las funciones de filtrado completen su ejecución

#### **Solución Propuesta**:

##### **Opción 1: Contadores Dinámicos**
```javascript
// En lugar de usar myBids.length, usar una función que calcule el total real
const getActiveBidsCount = () => {
  return myBids.filter(bid => 
    bid.my_bid !== undefined && 
    bid.my_bid !== null && 
    bid.my_bid > 0
  ).length;
};

const getActiveOffersCount = () => {
  return existingOffers.filter(offer => 
    offer.my_bid !== undefined && 
    offer.my_bid !== null && 
    offer.my_bid > 0
  ).length;
};
```

##### **Opción 2: Estados Separados para Contadores**
```javascript
const [activeBidsCount, setActiveBidsCount] = useState(0);
const [activeOffersCount, setActiveOffersCount] = useState(0);

// Actualizar contadores cuando cambien los arrays
useEffect(() => {
  setActiveBidsCount(myBids.length);
}, [myBids]);

useEffect(() => {
  setActiveOffersCount(existingOffers.length);
}, [existingOffers]);
```

## Archivos Modificados

### **Frontend** (`frontend/src/pages/ClasificationPage.jsx`)

#### **Línea ~35** (Ordenamiento):
```javascript
// ANTES: Ordenar por puntos y luego por money
const sorted = (data.classification || []).sort((a, b) => b.points - a.points || b.money - a.money);

// DESPUÉS: Ordenar por team_value y luego por puntos
const sorted = (data.classification || []).sort((a, b) => b.team_value - a.team_value || b.points - a.points);
```

#### **Línea ~170** (Información mostrada):
```jsx
// ANTES: Mostrar money (saldo)
<p className="text-text-secondary text-small mt-1">
  €{formatNumberWithDots(player.money) || '0'}
</p>

// DESPUÉS: Mostrar team_value (valor de equipo)
<p className="text-text-secondary text-small mt-1">
  €{formatNumberWithDots(player.team_value) || '0'}
</p>
```

## Resultado

### **ClasificationPage.jsx**:
- ✅ **Ordenamiento correcto**: Ahora ordena por valor de equipo (descendente)
- ✅ **Información correcta**: Muestra valor de equipo en lugar de saldo
- ✅ **Jerarquía clara**: Valor de equipo como criterio principal, puntos como secundario

### **Contadores de Pujas**:
- ⚠️ **Problema identificado**: Los contadores pueden mostrar números incorrectos
- 🔍 **Causa**: Timing entre renderizado y actualización de estado
- 💡 **Solución pendiente**: Implementar contadores dinámicos o estados separados

## Verificación

### Para probar ClasificationPage.jsx:

1. **Ir a "Clasificación"**
2. **Verificar que**:
   - ✅ **Ordenamiento**: Los jugadores están ordenados por valor de equipo (más alto primero)
   - ✅ **Información**: Debajo del nombre aparece el valor de equipo, no el saldo
   - ✅ **Jerarquía**: Si dos jugadores tienen el mismo valor de equipo, se ordenan por puntos

### Para verificar contadores de pujas:

1. **Ir a "Mercado" → "Mis Operaciones - Compras"**
2. **Hacer una puja en subasta** y verificar que el contador se actualice
3. **Eliminar la puja** y verificar que el contador vuelva a 0
4. **Hacer una oferta a otro jugador** y verificar que el contador se actualice
5. **Eliminar la oferta** y verificar que el contador vuelva a 0

## Próximos Pasos

### **Para resolver el problema de contadores**:

1. **Implementar contadores dinámicos** en lugar de usar `.length` directamente
2. **Agregar estados separados** para los contadores
3. **Verificar el filtrado** en el backend para asegurar que solo se devuelven pujas activas
4. **Agregar logs de debug** para rastrear el flujo de datos

### **Código sugerido para contadores dinámicos**:

```javascript
// En MarketPage.jsx
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

// En el JSX:
<h3>Pujas en Subastas ({getActiveBidsCount()})</h3>
<h3>Ofertas a Otros Jugadores ({getActiveOffersCount()})</h3>
``` 