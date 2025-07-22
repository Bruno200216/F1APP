# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Go)
```bash
cd backend
go mod tidy          # Download dependencies
go run main.go       # Run development server (port 8080)
```

### Frontend (React)
```bash
cd frontend
npm install          # Install dependencies
npm start            # Run development server (port 3000, proxies to backend)
npm run build        # Create production build
npm test             # Run tests
```

## Architecture Overview

**F1APP** is a full-stack F1 Fantasy application with auction-based pilot trading and comprehensive fantasy scoring.

### Technology Stack
- **Backend**: Go with Gin framework, MySQL + GORM, JWT authentication
- **Frontend**: React 18 with Material-UI, Context API for state management
- **Database**: MySQL with complex JSON arrays for metrics storage

### Key Business Logic

#### Fantasy Game Mechanics
- Players build squads from 20 F1 drivers across 3 session types (Practice, Qualifying, Race)
- Auction-based market system with bidding, ownership transfers, and league offers
- Complex scoring based on position deltas, performance bonuses, and session-specific metrics
- Financial management: budgets, sponsorship bonuses, salary payments

#### Session Types & Scoring
- **Practice**: Position finishing, team battles, red flag penalties
- **Qualifying**: Q1/Q2 progression, final positions, team performance
- **Race**: Full race metrics including overtakes, safety cars, fastest laps, DNFs

### Core Data Models
- **Player**: User accounts with authentication, money, and cross-league participation
- **League**: Fantasy leagues with 60 available pilots and market mechanics
- **PilotByLeague**: Driver ownership within leagues with bidding system
- **Pilot**: F1 drivers with performance metrics stored as JSON arrays
- **GrandPrix**: Race calendar with circuits and scheduling

## API Architecture

The backend (`backend/main.go`) provides 40+ REST endpoints organized by domain:

### Authentication
- `POST /api/register`, `/api/login` - User management

### League Management  
- CRUD operations for leagues, joining, classification tracking
- Market endpoints for auctions, bidding, and offers

### Pilot & Performance
- Pilot profile management with detailed metrics
- Admin endpoints for submitting race results and managing sessions

## Frontend Structure

### Component Organization
- **Pages**: Full-page components (`src/pages/`) for each app section
- **Components**: Reusable UI elements (`src/components/`) like cards and dialogs  
- **Context**: `LeagueContext.jsx` manages global league selection state

### Key Features
- Material-UI design system with responsive mobile-first approach
- Bottom navigation for primary app sections
- Real-time market refresh timers and live bidding interfaces
- Comprehensive image assets for drivers and country flags

## Database Patterns

### JSON Array Storage
Performance metrics are stored as JSON arrays in MySQL:
```go
PracticePointFinish    []int `gorm:"type:json"`
QualifyingPassQ1       []int `gorm:"type:json"`  
RacePosition          []int `gorm:"type:json"`
```

### Complex Relationships
- Many-to-many: Players ↔ Leagues via `LeaguePlayer`
- One-to-many: League → PilotByLeague (with bidding state)
- Ownership tracking: Player → DriversByPlayer arrays

## Development Notes

### Backend Patterns
- Single `main.go` file contains all HTTP handlers and business logic
- GORM handles database operations with automatic migrations
- Environment configuration via `.env` file with database credentials
- JWT middleware for protected routes

### Frontend Patterns  
- React Router for navigation with league-aware routing
- Material-UI components with consistent theming
- Proxy configuration routes API calls to backend during development
- Context API manages league selection across components

### Data Flow
- Complex auction mechanics with bid placement, acceptance, and rejection
- Real-time market state synchronization between players
- Session result submission flows from admin interfaces to scoring calculations
- Cross-league player management with financial tracking