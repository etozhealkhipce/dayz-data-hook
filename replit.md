# DayZ Player Health Tracker

## Overview
A multi-tenant SaaS web application that receives player health data from DayZ servers via webhook and displays beautiful, real-time statistics in an iOS Health-style interface with DayZ survival/military theming. Server admins can register accounts, create multiple servers with unique webhook URLs, and view player statistics.

## Architecture

### Multi-Tenant Design
- **Admins**: Server administrators who can register and manage multiple servers
- **Servers**: Each server has a unique 32-character nanoid webhook URL for secure data ingestion
- **Players & Snapshots**: Player data is scoped to servers, with full tenant isolation

### Security Features
- Passport.js local strategy with bcrypt password hashing
- Express-session for session management
- Tenant isolation: All player data queries verify server ownership
- Webhook URLs are 32-character cryptographically random strings (nanoid)
- Server admins can only access their own servers' data
- Webhook can be regenerated to cut off leaked URLs
- isActive flag to deactivate server webhooks

## Features
- **Authentication**: Register, login, logout with session persistence
- **Server Management**: Create, view, regenerate webhook, delete servers
- **Webhook Endpoint**: `/api/webhook/:webhookId` - Receives POST requests from DayZ server mod
- **Player Dashboard**: View all players with their current health status per server
- **Detailed Metrics**: Health, Blood, Energy, Water with progress bars and trends
- **Historical Charts**: Line charts showing health trends over time using Recharts
- **Position Tracking**: Visual map grid showing player coordinates on Chernarus
- **Disease Monitoring**: Display of active diseases and health conditions
- **Dark/Light Theme**: Toggle between dark and light modes

## Project Architecture

### Frontend (client/src/)
- **App.tsx**: Main application with routing, AuthProvider, and theme provider
- **hooks/use-auth.tsx**: Authentication context hook for managing user state
- **pages/login.tsx**: Login page with email/password form
- **pages/register.tsx**: Registration page for new admins
- **pages/dashboard.tsx**: Server management dashboard with CRUD operations
- **pages/server.tsx**: Player list and detail view for a specific server
- **pages/history.tsx**: Historical charts for a player's health data
- **components/**: 
  - `player-detail.tsx` - Full player stats view
  - `health-metric-card.tsx` - Primary health metric cards
  - `health-chart.tsx` - Recharts line charts
  - `position-card.tsx` - Coordinate visualization
  - `disease-status.tsx` - Active conditions display

### Backend (server/)
- **routes.ts**: API endpoints for auth, servers, players, and webhook
- **storage.ts**: Database operations using Drizzle ORM
- **auth.ts**: Passport.js configuration with local strategy
- **db.ts**: PostgreSQL connection

### Shared (shared/)
- **schema.ts**: Database models, Zod validation schemas, TypeScript types

## Database Schema

### admins
- id (serial, primary key)
- email (varchar, unique)
- passwordHash (varchar)
- name (varchar)
- createdAt (timestamp)

### servers
- id (serial, primary key)
- adminId (integer, foreign key to admins)
- name (varchar)
- webhookId (varchar, unique, 32-char nanoid)
- isActive (boolean, default true)
- createdAt (timestamp)

### players
- id (serial, primary key)
- serverId (integer, foreign key to servers)
- steamId (varchar)
- name (varchar)
- lastSeen (timestamp)

### player_snapshots
- id (serial, primary key)
- playerId (integer, foreign key to players)
- All health metrics (health, blood, shock, water, energy, etc.)
- createdAt (timestamp)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new admin account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout current session
- `GET /api/auth/me` - Get current authenticated user

### Server Management (requires auth)
- `GET /api/servers` - List all servers for authenticated admin
- `POST /api/servers` - Create new server
- `POST /api/servers/:id/regenerate-webhook` - Generate new webhook URL
- `DELETE /api/servers/:id` - Delete server and all its data

### Player Data (requires auth, verifies ownership)
- `GET /api/servers/:id/players` - List all players with latest snapshot
- `GET /api/servers/:serverId/players/:playerId/snapshots` - Get player's historical snapshots

### Webhook (no auth, uses secret webhookId)
- `POST /api/webhook/:webhookId` - Receive data from DayZ server

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

## Tech Stack
- React + TypeScript
- Express.js backend
- PostgreSQL + Drizzle ORM
- Passport.js + bcrypt for authentication
- Express-session for sessions
- Tailwind CSS + Shadcn UI
- Recharts for data visualization
- TanStack Query for data fetching
- Nanoid for secure webhook ID generation
