package models

import (
	"time"
)

// Modelo de usuario (player)
type Player struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Name         string    `json:"name" gorm:"not null"`
	Email        string    `json:"email" gorm:"unique;not null"`
	PasswordHash string    `json:"-" gorm:"not null"`
	Money        float64   `json:"money" gorm:"default:50000000"`
	IsActive     bool      `json:"is_active" gorm:"default:true"`
	IsAdmin      bool      `json:"is_admin" gorm:"default:false;column:is_admin"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	TotalPoints  int       `json:"total_points" gorm:"default:0"`
}

// Modelo único de pilotos generales

type Pilot struct {
	ID                       uint           `json:"id" gorm:"primaryKey"`
	OwnerID                  uint           `json:"owner_id" gorm:"default:0"`
	DriverName               string         `json:"driver_name" gorm:"not null"`
	Team                     string         `json:"team" gorm:"not null"`
	ImageURL                 string         `json:"image_url" gorm:"not null"`
	Mode                     string         `json:"mode" gorm:"not null"` // R, Q, P
	TotalPoints              int            `json:"total_points" gorm:"default:0"`
	PracticePointFinish      []int          `json:"practice_point_finish" gorm:"type:json;serializer:json"`
	PracticeTeamBattle       []int          `json:"practice_team_battle" gorm:"type:json;serializer:json"`
	PracticeRedFlag          []int          `json:"practice_red_flag" gorm:"type:json;serializer:json"`
	QualifyingPassQ1         []int          `json:"qualifying_pass_q1" gorm:"type:json;serializer:json"`
	QualifyingPassQ2         []int          `json:"qualifying_pass_q2" gorm:"type:json;serializer:json"`
	QualifyingPositionFinish []int          `json:"qualifying_position_finish" gorm:"type:json;serializer:json"`
	QualifyingTeamBattle     []int          `json:"qualifying_team_battle" gorm:"type:json;serializer:json"`
	QualifyingRedFlag        []int          `json:"qualifying_red_flag" gorm:"type:json;serializer:json"`
	RacePoints               []int          `json:"race_points" gorm:"type:json;serializer:json"`
	RacePosition             []int          `json:"race_position" gorm:"type:json;serializer:json"`
	StartPosition            []int          `json:"start_position" gorm:"type:json;serializer:json"`
	FinishPosition           []int          `json:"finish_position" gorm:"type:json;serializer:json"`
	FastestLap               []int          `json:"fastest_lap" gorm:"type:json;serializer:json"`
	DriverOfTheDay           []int          `json:"driver_of_the_day" gorm:"type:json;serializer:json"`
	SafetyCar                []int          `json:"safety_car" gorm:"type:json;serializer:json"`
	RaceTeamBattle           []int          `json:"race_team_battle" gorm:"type:json;serializer:json"`
	RaceRedFlag              []int          `json:"race_red_flag" gorm:"type:json;serializer:json"`
	ValorGlobal              float64        `json:"valor_global" gorm:"-"`
	Value                    float64        `json:"value" gorm:"not null;default:0"`
	Ventas7Fichajes          int            `json:"ventas7fichajes" gorm:"column:ventas7fichajes"`
	PointsByGP               []byte         `json:"points_by_gp" gorm:"type:json"`
	TrackEngineerID          uint           `json:"track_engineer_id"`
	ChiefEngineerID          uint           `json:"chief_engineer_id"`
	TrackEngineer            *TrackEngineer `gorm:"foreignKey:TrackEngineerID"`
	ChiefEngineer            *ChiefEngineer `gorm:"foreignKey:ChiefEngineerID"`
	CreatedAt                time.Time      `json:"created_at"`
	UpdatedAt                time.Time      `json:"updated_at"`
}

// Modelo básico de liga

type League struct {
	ID                uint       `json:"id" gorm:"primaryKey"`
	Name              string     `json:"name" gorm:"not null"`
	Code              string     `json:"code" gorm:"unique;not null"`
	PlayerID          uint       `json:"player_id"`
	MarketPilots      []byte     `json:"market_pilots" gorm:"type:json"`
	MarketNextRefresh *time.Time `json:"market_next_refresh"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// Modelo para pilotos por liga

type PilotByLeague struct {
	ID                   uint       `json:"id" gorm:"primaryKey"`
	PilotID              uint       `json:"pilot_id" gorm:"not null"`
	LeagueID             uint       `json:"league_id" gorm:"not null"`
	OwnerID              uint       `json:"owner_id" gorm:"default:0"`
	Clausulatime         *time.Time `json:"clausulatime" gorm:"column:clausulatime"`
	ClausulaValue        *float64   `json:"clausula_value" gorm:"column:clausula_value"`
	Bids                 []byte     `json:"bids" gorm:"type:json"`
	Venta                *int       `json:"venta" gorm:"column:venta"` // Nuevo campo para el precio de venta
	VentaExpiresAt       *time.Time `json:"venta_expires_at" gorm:"column:venta_expires_at"`
	LeagueOfferValue     *float64   `json:"league_offer_value" gorm:"column:league_offer_value"`
	LeagueOfferExpiresAt *time.Time `json:"league_offer_expires_at" gorm:"column:league_offer_expires_at"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

func (PilotByLeague) TableName() string {
	return "pilot_by_leagues"
}

type Bid struct {
	PlayerID uint `json:"player_id"`
	Valor    int  `json:"valor"`
}

type PlayerByLeague struct {
	ID                    uint64  `json:"id" gorm:"primaryKey"`
	PlayerID              uint64  `json:"player_id" gorm:"not null"`
	LeagueID              uint64  `json:"league_id" gorm:"not null"`
	Money                 float64 `json:"money" gorm:"default:100000000"`
	TeamValue             float64 `json:"team_value" gorm:"default:0"`
	OwnedPilots           string  `json:"owned_pilots" gorm:"type:json"`
	OwnedTrackEngineers   string  `json:"owned_track_engineers" gorm:"type:json;column:owned_track_engineers"`
	OwnedChiefEngineers   string  `json:"owned_chief_engineers" gorm:"type:json;column:owned_chief_engineers"`
	OwnedTeamConstructors string  `json:"owned_team_constructors" gorm:"type:json;column:owned_team_constructors"`
	TotalPoints           int     `json:"totalpoints" gorm:"default:0"`
}

// Forzar el nombre de la tabla para GORM
func (PlayerByLeague) TableName() string {
	return "player_by_league"
}

// Modelo para grandes premios (f1_grand_prixes)
type GrandPrix struct {
	GPIndex   uint64    `json:"gp_index" gorm:"primaryKey;column:gp_index"`
	Name      string    `json:"name"`
	Date      time.Time `json:"date"`
	StartDate time.Time `json:"start_date" gorm:"column:start_date"`
	Circuit   string    `json:"circuit"`
	Country   string    `json:"country"`
	Flag      string    `json:"flag"`
}

func (GrandPrix) TableName() string {
	return "f1_grand_prixes"
}

// Modelos para puntuaciones desacopladas por sesión

type PilotRace struct {
	ID                     uint   `gorm:"primaryKey"`
	PilotID                uint   `gorm:"not null"`
	GPIndex                uint64 `gorm:"not null;column:gp_index"`
	StartPosition          int
	FinishPosition         int
	ExpectedPosition       float64
	DeltaPosition          int
	Points                 int
	PositionsGainedAtStart int
	CleanOvertakes         int
	NetPositionsLost       int
	FastestLap             bool
	CausedVSC              bool
	CausedSC               bool
	CausedRedFlag          bool
	DNFDriverError         bool
	DNFNoFault             bool
	Pilot                  Pilot     `gorm:"foreignKey:PilotID"`
	GrandPrix              GrandPrix `gorm:"foreignKey:GPIndex;references:GPIndex"`
}

type PilotQualy struct {
	ID               uint   `gorm:"primaryKey"`
	PilotID          uint   `gorm:"not null"`
	GPIndex          uint64 `gorm:"not null;column:gp_index"`
	StartPosition    int
	FinishPosition   int
	ExpectedPosition float64
	DeltaPosition    int
	Points           int
	CausedRedFlag    bool
	Pilot            Pilot     `gorm:"foreignKey:PilotID"`
	GrandPrix        GrandPrix `gorm:"foreignKey:GPIndex;references:GPIndex"`
}

type PilotPractice struct {
	ID               uint   `gorm:"primaryKey"`
	PilotID          uint   `gorm:"not null"`
	GPIndex          uint64 `gorm:"not null;column:gp_index"`
	StartPosition    int
	FinishPosition   int
	ExpectedPosition float64
	DeltaPosition    int
	Points           int
	CausedRedFlag    bool
	Pilot            Pilot     `gorm:"foreignKey:PilotID"`
	GrandPrix        GrandPrix `gorm:"foreignKey:GPIndex;references:GPIndex"`
}

// Modelo de Ingeniero de Pista

type TrackEngineer struct {
	ID          uint      `gorm:"primaryKey"`
	Name        string    `gorm:"not null"`
	Value       float64   `gorm:"not null;default:0"`
	ImageURL    string    `gorm:"not null"`
	GPIndex     uint64    `gorm:"not null"`
	Performance bool      `gorm:"not null;default:false"`
	Team        string    `gorm:"not null"`
	TotalPoints int       `gorm:"not null;default:0"`
	PointsByGP  []byte    `gorm:"type:json"`
	GrandPrix   GrandPrix `gorm:"foreignKey:GPIndex;references:GPIndex"`
}

// Modelo de Ingeniero Jefe

type ChiefEngineer struct {
	ID                   uint      `gorm:"primaryKey"`
	Name                 string    `gorm:"not null"`
	Value                float64   `gorm:"not null;default:0"`
	ImageURL             string    `gorm:"not null"`
	GPIndex              uint64    `gorm:"not null"`
	Team                 string    `gorm:"not null"`
	TeamExpectedPosition float64   `gorm:"not null;default:0"`
	TeamFinishPosition   float64   `gorm:"not null;default:0"`
	TotalPoints          int       `gorm:"not null;default:0"`
	PointsByGP           []byte    `gorm:"type:json"`
	GrandPrix            GrandPrix `gorm:"foreignKey:GPIndex;references:GPIndex"`
}

// TrackEngineerByLeague: ingeniero de pista por liga

type TrackEngineerByLeague struct {
	ID                   uint       `gorm:"primaryKey"`
	TrackEngineerID      uint       `gorm:"not null"`
	LeagueID             uint       `gorm:"not null"`
	OwnerID              uint       `gorm:"default:0"`
	CreatedAt            time.Time  `gorm:"autoCreateTime"`
	UpdatedAt            time.Time  `gorm:"autoUpdateTime"`
	Bids                 []byte     `gorm:"type:json"`
	Venta                *int       `gorm:"column:venta"`
	VentaExpiresAt       *time.Time `gorm:"column:venta_expires_at"`
	LeagueOfferValue     *float64   `gorm:"column:league_offer_value"`
	LeagueOfferExpiresAt *time.Time `gorm:"column:league_offer_expires_at"`
	ClausulaExpiresAt    *time.Time `gorm:"column:clausula_expires_at"`
	ClausulaValue        *float64   `gorm:"column:clausula_value"`

	TrackEngineer TrackEngineer `gorm:"foreignKey:TrackEngineerID"`
	League        League        `gorm:"foreignKey:LeagueID"`
}

func (TrackEngineerByLeague) TableName() string {
	return "track_engineer_by_league"
}

// ChiefEngineerByLeague: ingeniero jefe por liga

type ChiefEngineerByLeague struct {
	ID                   uint       `gorm:"primaryKey"`
	ChiefEngineerID      uint       `gorm:"not null"`
	LeagueID             uint       `gorm:"not null"`
	OwnerID              uint       `gorm:"default:0"`
	CreatedAt            time.Time  `gorm:"autoCreateTime"`
	UpdatedAt            time.Time  `gorm:"autoUpdateTime"`
	Bids                 []byte     `gorm:"type:json"`
	Venta                *int       `gorm:"column:venta"`
	VentaExpiresAt       *time.Time `gorm:"column:venta_expires_at"`
	LeagueOfferValue     *float64   `gorm:"column:league_offer_value"`
	LeagueOfferExpiresAt *time.Time `gorm:"column:league_offer_expires_at"`
	ClausulaExpiresAt    *time.Time `gorm:"column:clausula_expires_at"`
	ClausulaValue        *float64   `gorm:"column:clausula_value"`

	ChiefEngineer ChiefEngineer `gorm:"foreignKey:ChiefEngineerID"`
	League        League        `gorm:"foreignKey:LeagueID"`
}

func (ChiefEngineerByLeague) TableName() string {
	return "chief_engineers_by_league"
}

// Modelo de Team Constructor

type TeamConstructor struct {
	ID           uint      `gorm:"primaryKey"`
	Name         string    `gorm:"not null"`
	Value        float64   `gorm:"not null;default:0"`
	GPIndex      uint64    `gorm:"not null"`
	FinishPilots []byte    `gorm:"type:json"`
	ImageURL     string    `gorm:"not null"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	GrandPrix    GrandPrix `gorm:"foreignKey:GPIndex;references:GPIndex"`
}

func (TeamConstructor) TableName() string {
	return "teamconstructor"
}

// TeamConstructorByLeague: constructor por liga

type TeamConstructorByLeague struct {
	ID                   uint       `gorm:"primaryKey"`
	TeamConstructorID    uint       `gorm:"not null;column:teamconstructor_id"`
	LeagueID             uint       `gorm:"not null"`
	OwnerID              uint       `gorm:"default:0"`
	CreatedAt            time.Time  `gorm:"autoCreateTime"`
	UpdatedAt            time.Time  `gorm:"autoUpdateTime"`
	Bids                 []byte     `gorm:"type:json"`
	Venta                *int       `gorm:"column:venta"`
	VentaExpiresAt       *time.Time `gorm:"column:venta_expires_at"`
	LeagueOfferValue     *float64   `gorm:"column:league_offer_value"`
	LeagueOfferExpiresAt *time.Time `gorm:"column:league_offer_expires_at"`
	ClausulaExpiresAt    *time.Time `gorm:"column:clausula_expires_at"`
	ClausulaValue        *float64   `gorm:"column:clausula_value"`

	TeamConstructor TeamConstructor `gorm:"foreignKey:TeamConstructorID"`
	League          League          `gorm:"foreignKey:LeagueID"`
}

func (TeamConstructorByLeague) TableName() string {
	return "teamconstructor_by_league"
}

// Modelo para carreras de equipos
type TeamRace struct {
	ID                uint      `gorm:"primaryKey"`
	TeamConstructorID uint      `gorm:"not null;column:teamconstructor_id"`
	GPIndex           uint64    `gorm:"not null;column:gp_index"`
	FinishPosition    *int      `gorm:"column:finish_position"`
	ExpectedPosition  *float64  `gorm:"column:expected_position"`
	DeltaPosition     *int      `gorm:"column:delta_position"`
	PitstopTime       *float64  `gorm:"column:pitstop_time"`
	Points            int       `gorm:"default:0"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	// Relaciones
	TeamConstructor TeamConstructor `gorm:"foreignKey:TeamConstructorID"`
	GrandPrix       GrandPrix       `gorm:"foreignKey:GPIndex;references:GPIndex"`
}

func (TeamRace) TableName() string {
	return "team_races"
}

// Modelo para elementos del mercado unificado
type MarketItem struct {
	ID         uint   `gorm:"primaryKey"`
	LeagueID   uint   `gorm:"not null"`
	ItemType   string `gorm:"not null"` // "pilot", "track_engineer", "chief_engineer", "team_constructor"
	ItemID     uint   `gorm:"not null"` // ID del elemento específico (PilotByLeague, TrackEngineerByLeague, etc.)
	IsActive   bool   `gorm:"default:true"`
	IsInMarket bool   `gorm:"default:false;column:is_in_market"` // Nuevo campo para marcar si está en el mercado actual
	CreatedAt  time.Time
	UpdatedAt  time.Time
	League     League `gorm:"foreignKey:LeagueID"`
}

func (MarketItem) TableName() string {
	return "market_items"
}

// Modelo para alineaciones de jugadores
type Lineup struct {
	ID                uint      `json:"id" gorm:"primaryKey"`
	PlayerID          uint      `json:"player_id" gorm:"not null"`
	LeagueID          uint      `json:"league_id" gorm:"not null"`
	GPIndex           uint64    `json:"gp_index" gorm:"not null;column:gp_index"`
	RacePilots        []byte    `json:"race_pilots" gorm:"type:json"`       // Array de pilot_by_league_id
	QualifyingPilots  []byte    `json:"qualifying_pilots" gorm:"type:json"` // Array de pilot_by_league_id
	PracticePilots    []byte    `json:"practice_pilots" gorm:"type:json"`   // Array de pilot_by_league_id
	TeamConstructorID *uint     `json:"team_constructor_id" gorm:"column:team_constructor_id"`
	ChiefEngineerID   *uint     `json:"chief_engineer_id" gorm:"column:chief_engineer_id"`
	TrackEngineers    []byte    `json:"track_engineers" gorm:"type:json"` // Array de track_engineer_by_league_id
	LineupPoints      int       `json:"lineup_points" gorm:"default:0"`   // Puntos totales de la alineación
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	// Relaciones
	Player    Player    `gorm:"foreignKey:PlayerID"`
	League    League    `gorm:"foreignKey:LeagueID"`
	GrandPrix GrandPrix `gorm:"foreignKey:GPIndex;references:GPIndex"`
}

func (Lineup) TableName() string {
	return "lineups"
}
