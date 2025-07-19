# F1 Fantasy App - Plataforma de Seguimiento de Pilotos de F1

## Descripción
Plataforma de seguimiento y notificaciones de productos en marketplaces de segunda mano, enfocada en pilotos de F1 para fantasy sports. Desarrollada con React en el frontend y Go en el backend, usando JWT para autenticación, GORM como ORM.

## Estructura del Proyecto

```
F1APP/
├── backend/
│   ├── database/
│   │   └── database.go
│   ├── models/
│   │   └── models.go
│   ├── examples/
│   │   └── array_usage.go
│   └── main.go
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

## Estructura de Base de Datos

### Modelos Principales

#### 1. Player (Jugador)
- **ID**: Identificador único
- **Name**: Nombre del jugador
- **Email**: Email único del jugador
- **PasswordHash**: Hash de la contraseña
- **IsActive**: Estado activo/inactivo
- **DriversByPlayer**: Array de pilotos que posee el jugador
- **Leagues**: Array de ligas en las que participa

#### 2. League (Liga)
- **ID**: Identificador único
- **Name**: Nombre de la liga
- **Description**: Descripción de la liga
- **IsActive**: Estado activo/inactivo
- **Drivers**: Array de 60 pilotos disponibles en la liga
- **Players**: Array de jugadores en la liga
- **Calendar**: Array de calendario de carreras

#### 3. DriverByPlayer (Piloto de un Jugador)
- **ID**: Identificador único
- **PlayerID**: ID del jugador propietario
- **DriverName**: Nombre del piloto
- **Team**: Equipo del piloto
- **ImageURL**: URL de la imagen del piloto
- **TotalPoints**: Puntos totales
- **WeekPoints**: Puntos de la semana
- **Valor**: Valor del piloto
- **Clausula**: Cláusula de rescisión
- **Arrays de métricas**: Practice, Qualifying y Race con sus respectivas métricas

#### 4. Driver (Piloto de una Liga)
- **ID**: Identificador único
- **LeagueID**: ID de la liga
- **DriverName**: Nombre del piloto
- **Team**: Equipo del piloto
- **ImageURL**: URL de la imagen del piloto
- **TotalPoints**: Puntos totales
- **WeekPoints**: Puntos de la semana
- **Valor**: Valor del piloto
- **Clausula**: Cláusula de rescisión
- **Arrays de métricas**: Practice, Qualifying y Race con sus respectivas métricas

#### 5. LeaguePlayer (Relación League-Player)
- **ID**: Identificador único
- **LeagueID**: ID de la liga
- **PlayerID**: ID del jugador
- **JoinedAt**: Fecha de unión

### Arrays de Métricas por Categoría

#### Practice
- `PracticePointFinish`: Puntos de finalización
- `PracticeTeamBattle`: Batallas de equipo
- `PracticeRedFlag`: Banderas rojas

#### Qualifying
- `QualifyingPassQ1`: Pasar Q1
- `QualifyingPassQ2`: Pasar Q2
- `QualifyingPositionFinish`: Posición final
- `QualifyingTeamBattle`: Batallas de equipo
- `QualifyingRedFlag`: Banderas rojas

#### Race
- `RacePoints`: Puntos de carrera
- `RacePosition`: Posición en carrera
- `StartPosition`: Posición de salida
- `FinishPosition`: Posición de llegada
- `FastestLap`: Vuelta rápida
- `DriverOfTheDay`: Piloto del día
- `SafetyCar`: Safety car
- `RaceTeamBattle`: Batallas de equipo
- `RaceRedFlag`: Banderas rojas

### Calendario de F1 2025
El sistema incluye el calendario desde agosto hasta diciembre de 2025:
- Belgian Grand Prix (3 agosto)
- Dutch Grand Prix (24 agosto)
- Italian Grand Prix (7 septiembre)
- Azerbaijan Grand Prix (21 septiembre)
- Singapore Grand Prix (5 octubre)
- Japanese Grand Prix (19 octubre)
- Qatar Grand Prix (2 noviembre)
- United States Grand Prix (16 noviembre)
- Mexican Grand Prix (23 noviembre)
- Brazilian Grand Prix (30 noviembre)
- Las Vegas Grand Prix (7 diciembre)
- Abu Dhabi Grand Prix (14 diciembre)

### Parrilla de Pilotos F1 2025
Incluye los 20 pilotos oficiales con sus equipos actualizados:
- **Red Bull Racing**: Max Verstappen, Yuki Tsunoda
- **Mercedes**: George Russell, Kimi Antonelli
- **McLaren**: Oscar Piastri, Lando Norris
- **Ferrari**: Charles Leclerc, Lewis Hamilton
- **Aston Martin**: Fernando Alonso, Lance Stroll
- **Alpine**: Pierre Gasly, Franco Colapinto
- **Stake F1 Team Kick Sauber**: Nico Hulkenberg, Gabriel Bortoleto
- **Haas**: Esteban Ocon, Oliver Bearman
- **Williams**: Alexander Albon, Carlos Sainz
- **Visa Cash App RB**: Isack Hadjar, Liam Lawson

## Funcionalidades

### Gestión de Ligas
- Crear ligas con 60 pilotos disponibles
- Añadir jugadores a ligas
- Gestionar calendarios por liga

### Gestión de Jugadores
- Crear jugadores
- Asignar pilotos a jugadores
- Participar en múltiples ligas

### Seguimiento de Métricas
- Añadir métricas por categoría (Practice, Qualifying, Race)
- Seguimiento individual por piloto y jugador
- Estadísticas agregadas

### Ejemplos de Uso
El archivo `backend/examples/array_usage.go` incluye ejemplos de:
- Añadir métricas a pilotos de jugadores
- Añadir métricas a pilotos de ligas
- Obtener estadísticas de pilotos
- Obtener próximos circuitos
- Gestionar ligas y jugadores

## Tecnologías

### Backend
- **Go**: Lenguaje principal
- **GORM**: ORM para base de datos
- **JWT**: Autenticación
- **PostgreSQL**: Base de datos (con soporte para arrays)

### Frontend
- **React**: Framework de interfaz
- **TypeScript**: Tipado estático
- **Material-UI**: Componentes de interfaz

## Instalación y Configuración

### Backend
```bash
cd backend
go mod init f1-fantasy-app
go mod tidy
go run main.go
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Notas Técnicas

- Los arrays de métricas se almacenan como `int[]` en PostgreSQL
- Las relaciones muchos a muchos se gestionan con tablas intermedias
- El sistema está optimizado para notificaciones automáticas
- Los puntos se calculan desde el frontend para mayor flexibilidad
- Soporte completo para múltiples ligas por jugador 