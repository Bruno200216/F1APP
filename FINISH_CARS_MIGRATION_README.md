# Migración: Nueva columna `finish_cars` en `team_races`

## 📋 Resumen

Se ha añadido una nueva columna `finish_cars` a la tabla `team_races` para registrar cuántos coches de cada equipo acabaron la carrera.

## 🗄️ Cambios en la Base de Datos

### Nueva columna
- **Tabla**: `team_races`
- **Columna**: `finish_cars`
- **Tipo**: `TINYINT`
- **Valor por defecto**: `0`
- **Valores posibles**: `0`, `1`, `2`
- **Descripción**: Número de coches que acabaron la carrera para cada equipo

### Migración SQL
```sql
ALTER TABLE `team_races` 
ADD COLUMN `finish_cars` TINYINT DEFAULT 0 COMMENT 'Número de coches que acabaron la carrera (0, 1 o 2)';
```

## 🔧 Cambios en el Backend

### Modelo GORM (`backend/models/models.go`)
```go
type TeamRace struct {
    // ... campos existentes ...
    FinishCars int `gorm:"column:finish_cars;default:0"` // Nueva columna
    // ... resto de campos ...
}
```

### Endpoint (`backend/main.go`)
El endpoint `POST /api/admin/team-session-result` ahora acepta y guarda el campo `finish_cars`:

```go
var req struct {
    // ... campos existentes ...
    FinishCars int `json:"finish_cars"` // Nueva columna
    // ... resto de campos ...
}
```

## 🎨 Cambios en el Frontend

### AdminScoresPage (`frontend/src/pages/AdminScoresPage.jsx`)

Se ha añadido un nuevo campo en el formulario de "Team Session Results":

```jsx
<div>
  <label className="block text-text-primary text-small font-medium mb-2">
    Finish Cars (0, 1 or 2)
  </label>
  <select
    name="finish_cars"
    value={teamForm.finish_cars || 0}
    onChange={handleTeamFieldChange}
    className="w-full p-2 bg-surface border border-border rounded-md text-text-primary focus:border-accent-main focus:outline-none"
  >
    <option value={0}>0 cars finished</option>
    <option value={1}>1 car finished</option>
    <option value={2}>2 cars finished</option>
  </select>
</div>
```

## 🚀 Migración automática

La nueva columna `finish_cars` se creará automáticamente al iniciar el backend. No es necesario ejecutar migraciones manuales.

### Verificación manual (opcional)

Si quieres verificar que la columna se creó correctamente, puedes ejecutar:

```sql
DESCRIBE team_races;
```

Deberías ver la columna `finish_cars` en la lista.

### Scripts de migración manual (solo si es necesario)

Si por alguna razón necesitas ejecutar la migración manualmente:

#### En Windows (PowerShell)
```powershell
.\run_finish_cars_migration.ps1
```

#### En Linux/Mac (Bash)
```bash
./run_finish_cars_migration.sh
```

#### Manualmente
```bash
mysql -u root -p -e "source add_finish_cars_column.sql;"
```

## 🔧 Migración automática

### Cómo funciona

1. **Al iniciar el backend**: Se ejecuta `database.Migrate()`
2. **Verificación**: Se comprueba si la columna `finish_cars` existe en `team_races`
3. **Creación condicional**: Solo se crea la columna si no existe
4. **Logs informativos**: Se muestran mensajes en la consola del backend

### Logs esperados

```
Verificando columna finish_cars en tabla team_races...
Columna finish_cars agregada exitosamente a tabla team_races
```

O si ya existe:

```
Verificando columna finish_cars en tabla team_races...
Columna finish_cars ya existe en tabla team_races
```

### Probar la migración

Para verificar que la migración funciona correctamente:

1. **Iniciar el backend**:
   ```bash
   cd backend
   go run main.go
   ```

2. **Verificar los logs** en la consola del backend

3. **Verificar manualmente** en MySQL:
   ```sql
   DESCRIBE team_races;
   ```

4. **Probar el endpoint**:
   ```bash
   curl -X POST http://localhost:8080/api/admin/team-session-result \
     -H "Content-Type: application/json" \
     -d '{
       "gp_index": 1,
       "team": "Red Bull Racing",
       "expected_position": 1.5,
       "finish_position": 2,
       "delta_position": -1,
       "pitstop_time": 2.3,
       "finish_cars": 2,
       "points": 10
     }'
   ```

## 📊 Uso en la aplicación

### Formularios de equipos:

1. **Team Expected Positions**: Para establecer las posiciones esperadas de los equipos
2. **Team Finish Positions**: Para establecer las posiciones finales de los equipos  
3. **Team Session Results**: Para datos específicos del equipo:
   - **Pit Stop Time**: Tiempo de pit stop (opcional)
   - **Finish Cars**: Número de coches que acabaron (0, 1 o 2)

### Flujo de trabajo recomendado:

1. **Acceder a Admin Scores**: Ve a la página de Admin Scores
2. **Seleccionar GP**: Elige el Grand Prix correspondiente
3. **Establecer posiciones esperadas**: Usa "Team Expected Positions"
4. **Establecer posiciones finales**: Usa "Team Finish Positions"
5. **Añadir datos específicos**: Usa "Team Session Results" para pit stop y finish cars

### Nota importante:
- El formulario "Team Session Results" **NO afecta** las posiciones esperadas o finales
- Solo actualiza los campos específicos (`pitstop_time` y `finish_cars`)
- Si no introduces pit stop time, se mantiene el valor existente

## ✅ Verificación

Para verificar que la migración se ejecutó correctamente:

```sql
DESCRIBE team_races;
```

Deberías ver la nueva columna `finish_cars` en la lista.

## 🔄 Compatibilidad

- ✅ **Migración automática**: La columna se crea automáticamente al iniciar el backend
- ✅ **Backward compatible**: Los registros existentes tendrán `finish_cars = 0` por defecto
- ✅ **Frontend actualizado**: Formulario específico solo para `pitstop_time` y `finish_cars`
- ✅ **API actualizada**: Endpoint actualizado para no afectar posiciones existentes
- ✅ **Modelo actualizado**: GORM maneja la nueva columna correctamente
- ✅ **Verificación inteligente**: Solo se crea la columna si no existe
- ✅ **Separación de responsabilidades**: Posiciones y datos específicos en formularios separados

## 📝 Notas importantes

- El campo `finish_cars` es obligatorio y debe ser 0, 1 o 2
- Se usa para registrar cuántos coches de cada equipo acabaron la carrera
- Es útil para cálculos de puntos y estadísticas de equipos
- El valor por defecto es 0 para registros existentes 