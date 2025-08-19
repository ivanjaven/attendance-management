# Attendance Management System

A QR code-based attendance management system designed for educational institutions, built with Vue.js, Node.js, TypeScript, and Supabase.

## Features

- **QR Code Scanning**: Track student time-in and time-out using QR codes.
- **Late Tracking**: Automatically calculate late arrivals with a 70-minute cumulative limit per quarter.
- **Role-Based Access**: Support for Admin, Teacher, and Staff roles with distinct permissions.
- **Real-Time Dashboard**: Display live attendance analytics and notifications.
- **Cross-Platform**: Compatible with desktop and web environments.

## Tech Stack

- **Frontend**: Vue.js 3, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- A Supabase account with a project set up

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd attendance-management-system
   npm install
   ```

2. **Environment Setup**
   - Create `backend/.env`:
     ```env
     SUPABASE_URL=your_supabase_project_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     PORT=3001
     FRONTEND_URL=http://localhost:5173
     JWT_SECRET=your_jwt_secret
     ```
   - Create `frontend/.env`:
     ```env
     VITE_API_URL=http://localhost:3001/api
     VITE_APP_TITLE=Attendance Management System
     ```

3. **Database Setup**
   - Execute the SQL script from `backend/docs/schema.sql` in your Supabase dashboard to set up the database schema.

4. **Start Development**
   ```bash
   npm run dev  # Starts both frontend and backend
   ```

## Project Structure

```
├── backend/           # Node.js API
│   ├── src/          # Backend source code
│   └── docs/         # Database schema and documentation
├── frontend/         # Vue.js application
├── shared/           # Shared TypeScript types
└── package.json      # Workspace configuration
```

## Development Commands

```bash
npm run dev              # Start both frontend and backend services
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run build            # Build all packages
npm run lint             # Run code linting
npm run type-check       # Run TypeScript validation
npm run clean            # Clean build artifacts
```
