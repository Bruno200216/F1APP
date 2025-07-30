# 🔧 Migración GORM para player_by_league

## 📋 Descripción

Esta migración usa **GORM** para actualizar la tabla `player_by_league` de manera segura y compatible con producción. GORM maneja automáticamente las migraciones y es más robusto que las migraciones SQL manuales.

## 🚀 Ventajas de usar GORM

- ✅ **Seguro para producción**: GORM maneja las migraciones de manera atómica
- ✅ **Compatible**: Funciona con diferentes versiones de MySQL
- ✅ **Automático**: Detecta cambios en el modelo y los aplica
- ✅ **Reversible**: Permite rollback si es necesario
- ✅ **Validación**: Verifica la integridad de los datos

## 📁 Archivos Creados

### Backend
- `backend/database/database.go` - Actualizado con migración específica
- `migrate_player_by_league.go` - Script independiente de migración

### Scripts
- `run-migration.ps1` - Script PowerShell para ejecutar migración

## 🔧 Cómo Aplicar la Migración

### Opción 1: Migración Automática (Recomendada)

La migración se ejecutará automáticamente cuando inicies el backend:

```bash
# Recompilar el backend
cd backend
go build -o main .

# Ejecutar el backend (la migración se ejecutará automáticamente)
./main
```

### Opción 2: Migración Manual

Si quieres ejecutar la migración manualmente:

```powershell
# En Windows (PowerShell)
.\run-migration.ps1

# En Linux/Mac
go run migrate_player_by_league.go
```

### Opción 3: Desde el Código

```go
// En tu aplicación
database.Connect()
database.MigratePlayerByLeague()
```

## 🔍 Qué Hace la Migración

### 1. AutoMigrate
- Crea la tabla si no existe
- Agrega columnas faltantes
- Actualiza tipos de datos si es necesario

### 2. Verificación de Estructura
- Verifica que la tabla existe
- Lista todas las columnas actuales
- Identifica columnas faltantes

### 3. Agregar Columnas Faltantes
```sql
-- Columnas que se agregan si faltan:
ALTER TABLE player_by_league ADD COLUMN money DECIMAL(12,2) DEFAULT 100000000.00;
ALTER TABLE player_by_league ADD COLUMN team_value DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE player_by_league ADD COLUMN owned_pilots JSON DEFAULT NULL;
ALTER TABLE player_by_league ADD COLUMN owned_track_engineers JSON DEFAULT NULL;
ALTER TABLE player_by_league ADD COLUMN owned_chief_engineers JSON DEFAULT NULL;
ALTER TABLE player_by_league ADD COLUMN owned_team_constructors JSON DEFAULT NULL;
ALTER TABLE player_by_league ADD COLUMN totalpoints INT DEFAULT 0;
```

## 🧪 Verificación

### Verificar que la migración funcionó:

```sql
USE f1fantasy;
DESCRIBE player_by_league;
```

Debería mostrar:
```
+------------------------+------------------+------+-----+-------------------+----------------+
| Field                  | Type             | Null | Key | Default           | Extra          |
+------------------------+------------------+------+-----+-------------------+----------------+
| id                     | bigint unsigned  | NO   | PRI | NULL              | auto_increment |
| player_id              | bigint unsigned  | NO   | MUL | NULL              |                |
| league_id              | bigint unsigned  | NO   | MUL | NULL              |                |
| money                  | decimal(12,2)    | YES  |     | 100000000.00     |                |
| team_value             | decimal(12,2)    | YES  |     | 0.00             |                |
| owned_pilots           | json             | YES  |     | NULL              |                |
| owned_track_engineers  | json             | YES  |     | NULL              |                |
| owned_chief_engineers  | json             | YES  |     | NULL              |                |
| owned_team_constructors| json             | YES  |     | NULL              |                |
| totalpoints            | int              | YES  |     | 0                 |                |
| created_at             | timestamp        | YES  |     | CURRENT_TIMESTAMP |                |
| updated_at             | timestamp        | YES  |     | CURRENT_TIMESTAMP | on update CURRENT_TIMESTAMP |
+------------------------+------------------+------+-----+-------------------+----------------+
```

## 🚀 Para Producción

### 1. Backup Antes de Migrar
```bash
mysqldump -u f1user -pf1password f1fantasy > backup_before_migration.sql
```

### 2. Ejecutar Migración
```bash
# Opción A: Reiniciar el backend (migración automática)
docker-compose restart backend

# Opción B: Ejecutar migración manual
.\run-migration.ps1
```

### 3. Verificar
```bash
# Probar crear una liga
curl -X POST http://localhost:3000/api/leagues \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test League","code":"TEST123"}'
```

## 🔄 Rollback (Si es necesario)

Si necesitas revertir la migración:

```sql
-- Eliminar las columnas agregadas
ALTER TABLE player_by_league 
DROP COLUMN money,
DROP COLUMN team_value,
DROP COLUMN owned_pilots,
DROP COLUMN owned_track_engineers,
DROP COLUMN owned_chief_engineers,
DROP COLUMN owned_team_constructors,
DROP COLUMN totalpoints;
```

## 📊 Logs de Migración

La migración genera logs detallados:

```
2025/07/30 18:30:00 Migrando tabla player_by_league...
2025/07/30 18:30:01 Agregando columna faltante: money
2025/07/30 18:30:01 Columna money agregada exitosamente
2025/07/30 18:30:01 Agregando columna faltante: team_value
2025/07/30 18:30:01 Columna team_value agregada exitosamente
2025/07/30 18:30:02 Migración de player_by_league completada
```

## 🎯 Resultado Esperado

Después de la migración:
- ✅ La tabla `player_by_league` tendrá todas las columnas necesarias
- ✅ Crear ligas funcionará sin errores 500
- ✅ El sistema de fichajes funcionará correctamente
- ✅ Compatible con producción

---

**¡La migración GORM está lista!** 🎉 Es más segura y robusta que las migraciones SQL manuales. 