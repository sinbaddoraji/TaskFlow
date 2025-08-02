# TaskFlow - Task Management System

Simple task and project management application.

## Setup

### Prerequisites
- .NET 9.0 SDK
- Node.js 20+
- MongoDB running locally

### Backend (API)
```bash
cd TaskFlow.Api
dotnet run
```
Runs on: https://localhost:7170

**Configuration**: MongoDB connection in `appsettings.Development.json`

### Frontend (Client)
```bash
cd TaskFlow.Client
npm install
npm run dev
```
Runs on: http://localhost:5173

**Configuration**: API URL in `.env.development` (points to backend)

## Configuration Files

### API Configuration
- `appsettings.Development.json` - MongoDB connection for development
- `.env.example` - Environment variables template

### Client Configuration  
- `.env.development` - Points to local API (https://localhost:7170)
- `.env.example` - Environment variables template

## Architecture
- **Backend**: ASP.NET Core API → MongoDB
- **Frontend**: React/TypeScript → Backend API