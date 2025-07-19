# Backend F1 Fantasy App

## Configuración Inicial

### 1. Instalar Dependencias
```bash
go mod tidy
```

### 2. Configurar Variables de Entorno
Copia el archivo `env.example` a `.env` y configura tus variables:
```bash
cp env.example .env
```

### 3. Configurar Base de Datos PostgreSQL
- Crear una base de datos PostgreSQL
- Configurar las credenciales en el archivo `.env`
- Asegúrate de que PostgreSQL tenga soporte para arrays (`int[]`)

### 4. Ejecutar el Proyecto
```bash
go run main.go
```

## Estructura del Proyecto

### Modelos (`models/models.go`)
- **Player**: Jugadores del sistema
- **League**: Ligas de F1 Fantasy
- **Driver**: Pilotos disponibles en ligas
- **DriverByPlayer**: Pilotos que posee un jugador
- **LeaguePlayer**: Relación muchos a muchos entre League y Player

### Base de Datos (`database/database.go`)
- Configuración de conexión PostgreSQL
- Migraciones automáticas
- Población inicial de datos

### Ejemplos (`examples/array_usage.go`)
- Funciones de ejemplo para gestionar métricas
- Operaciones CRUD para pilotos y ligas
- Gestión de estadísticas

## Funcionalidades

### Gestión de Ligas
- Crear ligas con 60 pilotos
- Añadir jugadores a ligas
- Gestionar calendarios por liga

### Gestión de Jugadores
- Crear jugadores
- Asignar pilotos a jugadores
- Participar en múltiples ligas

### Métricas de Pilotos
- Practice: Puntos, batallas de equipo, banderas rojas
- Qualifying: Pasar Q1/Q2, posición final, batallas de equipo
- Race: Posición, vuelta rápida, piloto del día, safety car

## API Endpoints

El servidor incluye:
- CORS configurado para desarrollo
- Endpoint básico en `/`
- Puerto configurable (por defecto 8080)

## Próximos Pasos

1. Implementar endpoints REST completos
2. Añadir autenticación JWT
3. Crear controladores para cada modelo
4. Implementar validaciones
5. Añadir tests unitarios 