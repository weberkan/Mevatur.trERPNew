# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Meva Panel & Muhasebe** is a comprehensive ERP system for managing Hajj (Hac) and Umrah pilgrimages. It's a full-stack Next.js application with both web and desktop deployment capabilities.

### Core Features
- **Group Management**: Create and manage pilgrimage groups (Hac/Umrah/Gezi)
- **Participant Management**: Handle participant details, fees, and payments
- **Room Assignment**: Hotel room management and assignment system
- **Financial Tracking**: Multi-currency support (USD, TRY, SAR) with real-time exchange rates
- **Export System**: Generate Word documents, Excel files, and HTML reports
- **Authentication**: Role-based access control with admin/user permissions
- **Desktop App**: Electron-based desktop application for offline use

## Development Commands

### Primary Commands
```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Create production build with static export
npm run start        # Start production server (after build)
npm run lint         # Run ESLint linting

# Desktop Application
./package-app.sh     # Package Linux desktop application
./create-exe.sh      # Create Windows executable (requires Wine)
```

### Testing & Development
```bash
# Single test file (if tests exist)
npm run test -- components/groups.test.tsx

# Build verification
npm run build && cd out && python -m http.server 8000

# Check TypeScript
npx tsc --noEmit
```

## Architecture Overview

### Application Structure

**Frontend Architecture:**
- **Next.js 14** with App Router and TypeScript
- **Client-side routing** with authentication guards
- **Static export** configuration for desktop/web deployment
- **Responsive design** with mobile-first approach

**State Management:**
- **Zustand** for global state with persistence
- **Local Storage** for data persistence (can be replaced with database)
- **Optimistic updates** with error handling
- **Multi-currency** normalization system

**Component Architecture:**
- **Module-based**: Each major feature is a self-contained module
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Export System**: Specialized components for document generation
- **Form Handling**: React Hook Form with Zod validation

### Key Directories

```
app/                    # Next.js 14 App Router pages
├── dashboard/          # Main application dashboard
├── login/              # Authentication pages
├── company/            # Company finance module
└── users/              # User management (admin only)

components/             # React components
├── ui/                 # shadcn/ui components (Radix UI primitives)
├── groups.tsx          # Group management module
├── participants.tsx    # Participant management
├── payments.tsx        # Payment tracking
├── rooming.tsx         # Room assignment system
├── reports.tsx         # Report generation
└── top-nav.tsx         # Navigation with currency converter

lib/                    # Utility functions and API layers
├── api-*.ts           # API functions for each module
├── auth.ts            # JWT authentication system
├── export-*.ts        # Document export functions
├── rates.ts           # Exchange rate management
├── validators.ts      # Zod validation schemas
└── utils.ts           # General utilities

store/                  # Zustand state management
└── app-store-backup.ts # Main application store

database/               # Database schema and seeds
├── schema.sql         # PostgreSQL schema for auth system
└── seeds.sql          # Initial data for development
```

### Data Flow Architecture

**State Management Flow:**
1. **Zustand Store**: Central state with persistence middleware
2. **API Layer**: RESTful API functions for server communication  
3. **Component State**: Local state for UI interactions
4. **Form State**: React Hook Form for complex forms

**Authentication Flow:**
1. **Session Storage**: Client-side session management
2. **JWT Tokens**: Server-side authentication (when API is used)
3. **Role-based Access**: Admin/user permission system
4. **Route Guards**: Component-level authentication protection

**Export System Flow:**
1. **Data Preparation**: Transform store data for export
2. **Format Generation**: Create Word/Excel/HTML documents
3. **Client Download**: Browser-based file downloads
4. **Print Optimization**: CSS-optimized HTML for printing

### Multi-Currency System

The application handles three currencies with automatic conversion:
- **Primary**: TRY (Turkish Lira) - all amounts normalized to TRY
- **Secondary**: USD, SAR with real-time exchange rates
- **Rate Management**: External API integration for live rates
- **Historical Tracking**: Rate history for financial accuracy

### Data Models

**Core Entities:**
- **Groups**: Pilgrimage groups with duration-based pricing
- **Participants**: Individual pilgrims with room preferences
- **Rooms**: Hotel rooms with capacity constraints
- **Payments**: Financial transactions with currency support
- **Expenses**: Group expenses with categorization
- **Company Entries**: Overall financial tracking

## Key Development Patterns

### Component Patterns
- **Module Components**: Self-contained feature modules with CRUD operations
- **Dialog System**: Modal dialogs for forms and confirmations
- **Table Management**: Sortable, filterable data tables with actions
- **Form Validation**: Zod schemas with TypeScript integration

### State Patterns
- **Immutable Updates**: Using Zustand's set function properly
- **Optimistic UI**: Immediate UI updates with error rollback
- **Persistence**: Automatic localStorage sync with versioning
- **Migration System**: Store version management for updates

### Export Patterns
- **Document Generation**: docx library for Word documents
- **Spreadsheet Creation**: xlsx library for Excel files
- **Print-Optimized HTML**: CSS styling for professional reports
- **Data Transformation**: Clean separation between data and presentation

## Authentication System

The application supports both simple session-based auth and JWT-based authentication:

**Development Mode**: 
- Session storage with hardcoded credentials
- Admin role check: `user.role === 'admin'`
- Company access: Password protection (`571632`)

**Production Ready**:
- PostgreSQL database with user management
- JWT token authentication with role-based permissions
- Audit logging for user activities

### User Roles
- **Admin**: Full system access including user management
- **Manager**: Group and financial management
- **User**: Basic participant and payment management

## Desktop Application

The application can be packaged as a desktop app using Electron:

**Linux Packaging**: `./package-app.sh` creates AppImage
**Windows Packaging**: `./create-exe.sh` creates executable (requires Wine)
**Distribution**: Self-contained applications with embedded Node.js

## Configuration Notes

### Environment Variables
```bash
# Required for database mode
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_PORT=5432

# Required for JWT authentication
JWT_SECRET=your-super-secret-jwt-key

# Next.js configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Build Configuration
- **Static Export**: Configured for deployment without Node.js server
- **TypeScript**: Strict mode with path mapping (`@/*`)
- **Tailwind CSS**: Utility-first styling with custom color palette
- **Image Optimization**: Disabled for static export compatibility

## Common Development Tasks

### Adding New Modules
1. Create component in `components/[module-name].tsx`
2. Add API functions in `lib/api-[module-name].ts`
3. Update Zustand store with new state and actions
4. Add route in `app/` directory if needed
5. Update navigation in `components/top-nav.tsx`

### Export Function Development
1. Create export function in `lib/export-[type].ts`
2. Implement data transformation logic
3. Add export buttons to relevant components
4. Test with sample data for all scenarios

### Database Integration
1. Update API functions to use database instead of localStorage
2. Implement proper error handling and validation
3. Add authentication middleware to API routes
4. Update Zustand store to work with async operations

## Performance Considerations

- **Bundle Size**: ~260KB gzipped with lazy loading
- **Build Time**: ~30 seconds for full build
- **Memory Usage**: ~50MB for desktop application
- **Startup Time**: ~2 seconds for desktop app

## Turkish Language Support

The entire application is in Turkish:
- **UI Text**: All user-facing text is in Turkish
- **Data Fields**: Turkish field names and labels
- **Export Templates**: Turkish document templates
- **Currency Display**: Turkish currency formatting conventions

When adding new features, maintain Turkish language consistency and use appropriate date/number formatting for Turkish locale.