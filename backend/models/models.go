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
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	TotalPoints  int       `json:"total_points" gorm:"default:0"`
}

// Modelo único de pilotos generales

type Pilot struct {
	ID                       uint      `json:"id" gorm:"primaryKey"`
	OwnerID                  uint      `json:"owner_id" gorm:"default:0"`
	DriverName               string    `json:"driver_name" gorm:"not null"`
	Team                     string    `json:"team" gorm:"not null"`
	ImageURL                 string    `json:"image_url" gorm:"not null"`
	Mode                     string    `json:"mode" gorm:"not null"` // R, Q, P
	TotalPoints              int       `json:"total_points" gorm:"default:0"`
	PracticePointFinish      []int     `json:"practice_point_finish" gorm:"type:json;serializer:json"`
	PracticeTeamBattle       []int     `json:"practice_team_battle" gorm:"type:json;serializer:json"`
	PracticeRedFlag          []int     `json:"practice_red_flag" gorm:"type:json;serializer:json"`
	QualifyingPassQ1         []int     `json:"qualifying_pass_q1" gorm:"type:json;serializer:json"`
	QualifyingPassQ2         []int     `json:"qualifying_pass_q2" gorm:"type:json;serializer:json"`
	QualifyingPositionFinish []int     `json:"qualifying_position_finish" gorm:"type:json;serializer:json"`
	QualifyingTeamBattle     []int     `json:"qualifying_team_battle" gorm:"type:json;serializer:json"`
	QualifyingRedFlag        []int     `json:"qualifying_red_flag" gorm:"type:json;serializer:json"`
	RacePoints               []int     `json:"race_points" gorm:"type:json;serializer:json"`
	RacePosition             []int     `json:"race_position" gorm:"type:json;serializer:json"`
	StartPosition            []int     `json:"start_position" gorm:"type:json;serializer:json"`
	FinishPosition           []int     `json:"finish_position" gorm:"type:json;serializer:json"`
	FastestLap               []int     `json:"fastest_lap" gorm:"type:json;serializer:json"`
	DriverOfTheDay           []int     `json:"driver_of_the_day" gorm:"type:json;serializer:json"`
	SafetyCar                []int     `json:"safety_car" gorm:"type:json;serializer:json"`
	RaceTeamBattle           []int     `json:"race_team_battle" gorm:"type:json;serializer:json"`
	RaceRedFlag              []int     `json:"race_red_flag" gorm:"type:json;serializer:json"`
	ValorGlobal              float64   `json:"valor_global" gorm:"-"`
	Value                    float64   `json:"value" gorm:"not null;default:0"`
	Ventas7Fichajes          int       `json:"ventas7fichajes" gorm:"column:ventas7fichajes"`
	PointsByGP               []byte    `json:"points_by_gp" gorm:"type:json"`
	CreatedAt                time.Time `json:"created_at"`
	UpdatedAt                time.Time `json:"updated_at"`
}

// Modelo básico de liga

type League struct {
	ID                uint       `json:"id" gorm:"primaryKey"`
	Name              string     `json:"name" gorm:"not null"`
	Code              string     `json:"code" gorm:"unique;not null"`
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
	Clausula             string     `json:"clausula" gorm:"type:text"`
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
	ID          uint64  `json:"id" gorm:"primaryKey"`
	PlayerID    uint64  `json:"player_id" gorm:"not null"`
	LeagueID    uint64  `json:"league_id" gorm:"not null"`
	Money       float64 `json:"money" gorm:"default:100000000"`
	TeamValue   float64 `json:"team_value" gorm:"default:0"`
	OwnedPilots string  `json:"owned_pilots" gorm:"type:json"`
}

// Forzar el nombre de la tabla para GORM
func (PlayerByLeague) TableName() string {
	return "player_by_league"
}

// Modelo para grandes premios (f1_grand_prixes)
type GrandPrix struct {
	ID      uint      `json:"id" gorm:"primaryKey"`
	Name    string    `json:"name"`
	Date    time.Time `json:"date"`
	Circuit string    `json:"circuit"`
	Country string    `json:"country"`
	Flag    string    `json:"flag"`
}

func (GrandPrix) TableName() string {
	return "f1_grand_prixes"
}
