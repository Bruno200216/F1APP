# Sistema de Migraciones de Base de Datos

## 📋 Descripción

Este sistema permite mantener sincronizada la estructura de la base de datos entre desarrollo y producción, ejecutando automáticamente los cambios necesarios.

## 🚀 Cómo Funciona

### 1. **Comportamiento por Entorno**

#### **🖥️ Desarrollo Local**
- Las migraciones se **registran** pero **NO se ejecutan**
- Puedes hacer cambios manuales en la base de datos
- El sistema muestra las migraciones disponibles en los logs
- No hay interferencia con tu trabajo local

#### **🚀 Producción**
- Las migraciones se **ejecutan automáticamente** al iniciar la aplicación
- Se aplican TODAS las migraciones pendientes de una vez
- La base de datos se actualiza automáticamente
- Se registra cada migración ejecutada

### 2. **Control por Variable de Entorno**
```bash
# Desarrollo (no ejecuta migraciones)
ENVIRONMENT=development

# Producción (ejecuta migraciones)
ENVIRONMENT=production
```

### 3. **Ejecución Inteligente**
- Solo se ejecutan las migraciones pendientes (no duplicadas)
- Se registra cada migración ejecutada en la tabla `migrations`
- Orden secuencial garantizado por ID

### 2. **Orden de Ejecución**
- Las migraciones se ejecutan en orden según su ID
- Cada migración tiene un ID único y secuencial
- No se pueden ejecutar migraciones fuera de orden

## 📝 Agregar Nueva Migración

### Opción 1: Usar el Script Automático
```bash
cd backend/tools
go run add_migration.go
```

Sigue las instrucciones:
1. Ingresa el nombre de la migración
2. Escribe el SQL (termina con 'END')
3. Copia el código generado a `migrations/migrations.go`

### Opción 2: Manual
1. Abre `backend/migrations/migrations.go`
2. Agrega una nueva entrada a `MigrationsList`:

```go
{
    ID:   7, // Siguiente número disponible
    Name: "Descripción de la migración",
    SQL: `
        ALTER TABLE tabla 
        ADD COLUMN nueva_columna VARCHAR(255);
    `,
},
```

## 🔧 Tipos de Migraciones

### 1. **Crear Tablas**
```sql
CREATE TABLE IF NOT EXISTS nueva_tabla (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
);
```

### 2. **Agregar Columnas**
```sql
ALTER TABLE tabla_existente 
ADD COLUMN IF NOT EXISTS nueva_columna VARCHAR(255);
```

### 3. **Modificar Columnas**
```sql
ALTER TABLE tabla_existente 
MODIFY COLUMN columna_existente INT NOT NULL;
```

### 4. **Agregar Índices**
```sql
ALTER TABLE tabla_existente 
ADD INDEX idx_nombre (columna);
```

### 5. **Eliminar Tablas**
```sql
DROP TABLE IF EXISTS tabla_a_eliminar;
```

## ⚠️ Buenas Prácticas

### 1. **Usar IF NOT EXISTS**
```sql
-- ✅ Correcto
ALTER TABLE tabla ADD COLUMN IF NOT EXISTS columna VARCHAR(255);

-- ❌ Incorrecto
ALTER TABLE tabla ADD COLUMN columna VARCHAR(255);
```

### 2. **Usar IF EXISTS para Eliminar**
```sql
-- ✅ Correcto
DROP TABLE IF EXISTS tabla;

-- ❌ Incorrecto
DROP TABLE tabla;
```

### 3. **Mantener IDs Secuenciales**
- No reutilizar IDs
- No saltar números
- Mantener orden cronológico

### 4. **Nombres Descriptivos**
```go
// ✅ Correcto
Name: "Add points_by_gp column to player_by_league",

// ❌ Incorrecto
Name: "Migration 1",
```

## 🐛 Solución de Problemas

### Error: "migration already exists"
- La migración ya fue ejecutada
- Verificar en la tabla `migrations`
- No es un error, es normal

### Error: "unknown column"
- Verificar que la columna existe antes de modificarla
- Usar `IF EXISTS` o `IF NOT EXISTS`

### Error: "duplicate column"
- Usar `IF NOT EXISTS` al agregar columnas
- Verificar que la columna no existe ya

## 📊 Verificar Estado

### Ver Migraciones Ejecutadas
```sql
SELECT * FROM migrations ORDER BY id;
```

### Ver Migraciones Pendientes
```sql
SELECT m.id, m.name 
FROM migrations m 
WHERE m.id NOT IN (SELECT id FROM migrations);
```

## 🔄 Flujo de Desarrollo

1. **Desarrollo Local**
   - Hacer cambios manuales en la base de datos
   - Crear migración con el script
   - Las migraciones se registran pero NO se ejecutan
   - Probar localmente con cambios manuales

2. **Subir a Producción**
   - Commit con la nueva migración
   - Deploy automático ejecuta TODAS las migraciones pendientes
   - Base de datos actualizada automáticamente con todos los cambios

## 📁 Estructura de Archivos

```
backend/
├── migrations/
│   └── migrations.go      # Lista de migraciones
├── tools/
│   └── add_migration.go   # Script para crear migraciones
└── MIGRATIONS_README.md   # Esta documentación
```

## 🎯 Ejemplos de Migraciones

### Ejemplo 1: Agregar Columna
```go
{
    ID:   7,
    Name: "Add is_active column to players",
    SQL: `
        ALTER TABLE players 
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `,
},
```

### Ejemplo 2: Crear Tabla
```go
{
    ID:   8,
    Name: "Create audit_log table",
    SQL: `
        CREATE TABLE IF NOT EXISTS audit_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            action VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,
},
```

### Ejemplo 3: Agregar Índice
```go
{
    ID:   9,
    Name: "Add index to player_by_league",
    SQL: `
        ALTER TABLE player_by_league 
        ADD INDEX IF NOT EXISTS idx_player_league (player_id, league_id);
    `,
},
``` 