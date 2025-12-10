# DayZ Player Health Tracker

## Overview
A web application that receives player health data from a DayZ server via webhook and displays beautiful, real-time statistics in an iOS Health-style interface.

## Features
- **Webhook Endpoint**: `/api/webhook` - Receives POST requests with player data from DayZ server mod
- **Player Dashboard**: View all players with their current health status
- **Detailed Metrics**: Health, Blood, Energy, Water with progress bars and trends
- **Historical Charts**: Line charts showing health trends over time using Recharts
- **Position Tracking**: Visual map grid showing player coordinates on Chernarus
- **Disease Monitoring**: Display of active diseases and health conditions
- **Dark/Light Theme**: Toggle between dark and light modes

## Project Architecture

### Frontend (client/src/)
- **App.tsx**: Main application with routing and theme provider
- **pages/home.tsx**: Main dashboard page
- **components/**: 
  - `player-sidebar.tsx` - Player list with search
  - `player-detail.tsx` - Full player stats view
  - `health-metric-card.tsx` - Primary health metric cards
  - `health-chart.tsx` - Recharts line charts
  - `position-card.tsx` - Coordinate visualization
  - `disease-status.tsx` - Active conditions display
  - `webhook-info.tsx` - Webhook URL display

### Backend (server/)
- **routes.ts**: API endpoints for players, snapshots, and webhook
- **storage.ts**: Database operations using Drizzle ORM
- **db.ts**: PostgreSQL connection

### Shared (shared/)
- **schema.ts**: Database models, Zod validation schemas, TypeScript types

## API Endpoints
- `GET /api/players` - List all players with latest snapshot
- `GET /api/players/:id/snapshots` - Get player's historical snapshots
- `POST /api/webhook` - Receive data from DayZ server

## Webhook Format
The DayZ mod should send POST requests with this JSON structure:
```json
{
  "ServerDate": "2025-9-20 21:39",
  "Players": [
    {
      "Name": "PlayerName",
      "ID": "SteamID64",
      "Health": 100,
      "Blood": 5000,
      "Shock": 100,
      "Water": 3000,
      "Energy": 5000,
      "HeatComfort": 0.5,
      "Stamina": 100,
      "Wetness": 0,
      "EnvironmentTemp": 20,
      "Playtime": 60,
      "DistanceWalked": 1000,
      "KilledZombies": 10,
      "Position": [13304, 68, 11904],
      "Diseases": []
    }
  ]
}
```

## Database
PostgreSQL with Drizzle ORM:
- **players**: Steam ID, name, last seen timestamp
- **player_snapshots**: All health metrics with timestamps

## Tech Stack
- React + TypeScript
- Express.js backend
- PostgreSQL + Drizzle ORM
- Tailwind CSS + Shadcn UI
- Recharts for data visualization
- TanStack Query for data fetching
