# L2LP Evidence Tracker

## Overview

L2LP Evidence Tracker is a production-ready web application designed for Irish SEN (Special Educational Needs) teachers. It replaces the traditional Google Drive + spreadsheet workflow by providing a streamlined system for uploading evidence (photos, videos, documents), tagging them with learning outcomes, and tracking coverage of Level 2 Learning Programme (L2LP) outcomes.

The application is built as a mobile-first utility tool optimized for teachers working on phones and Chromebooks, prioritizing speed and efficiency in evidence capture workflows.

## Recent Changes

- **Jan 2026**: Initial production release with full CRUD for students, evidence upload wizard, coverage tracking, and learning outcomes catalog
- **Features**: Landing page, authentication via Replit Auth, mobile-first responsive UI with bottom navigation (mobile) and sidebar (desktop), dark/light theme toggle
- **Data**: 40 L2LP learning outcomes auto-seeded on first startup across 10 strands (Managing money, Using public facilities, Personal care and hygiene, Food preparation, Communication, Social skills, Leisure and recreation, Home management, Work skills, Self-advocacy)

## Key Pages

- **Landing (`/`)**: Public page for unauthenticated users with feature highlights and Sign In button
- **Students (`/students`)**: List of students with search, add student dialog, and stats (evidence count, outcomes covered)
- **Student Dashboard (`/students/:id`)**: Individual student view with tabs for Evidence, Coverage, and Missing Outcomes
- **Upload Evidence (`/upload`)**: 5-step wizard - Select Student, Upload File (optional), Select Outcomes, Add Details, Review & Submit
- **Evidence Library (`/library`)**: Browse all evidence with filters by student, type, context, and outcome
- **Learning Outcomes (`/outcomes`)**: Browse all 40 L2LP outcomes organized by strand with search and filter

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Design System**: Material Design principles with Inter font, mobile-first responsive layouts

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON API endpoints under `/api/*`
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Entities**:
  - Students (belongs to user)
  - Learning Outcomes (L2LP curriculum items)
  - Evidence (files linked to students)
  - Evidence-Outcomes (many-to-many join table)

### File Structure
```
client/           # React frontend application
  src/
    components/   # Reusable UI components
    pages/        # Route-level page components
    hooks/        # Custom React hooks
    lib/          # Utility functions and API client
server/           # Express backend
  replit_integrations/  # Auth and object storage modules
shared/           # Shared types and schema definitions
  schema.ts       # Drizzle database schema
  models/         # Data model definitions
```

### Build System
- Development: Vite dev server with HMR proxied through Express
- Production: Vite builds static assets, esbuild bundles server to single file
- Output: `dist/` directory with `public/` for static files and `index.cjs` for server

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and migrations

### Authentication
- **Replit Auth**: OpenID Connect authentication provider
- **Sessions**: Stored in PostgreSQL `sessions` table
- **Required Env Vars**: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

### File Storage
- **Google Cloud Storage**: Object storage for evidence files (photos, videos, documents)
- **Upload Flow**: Presigned URL pattern - client requests URL from backend, uploads directly to storage
- **Integration**: Uppy library for file upload UI with AWS S3 compatible backend

### Third-Party Libraries
- **Uppy**: File upload handling with dashboard UI
- **date-fns**: Date formatting and manipulation
- **zod**: Runtime type validation for API requests
- **Radix UI**: Accessible UI component primitives