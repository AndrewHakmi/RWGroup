# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RWGroup real estate agency website - a property catalog platform with feed import capabilities. The system displays residential complexes (ЖК), properties for sale/rent, and manages lead generation forms.

## Development Commands

### Running the Application
```bash
npm run dev              # Run both client (Vite) and server (Express) concurrently
npm run client:dev       # Client only on http://localhost:5173
npm run server:dev       # Server only on http://localhost:3001
```

### Build & Quality
```bash
npm run build           # TypeScript check + Vite production build
npm run check           # TypeScript type checking (no emit)
npm run lint            # ESLint across the codebase
npm run preview         # Preview production build locally
```

## Architecture

### Stack
- **Frontend**: React 18 + TypeScript + Vite + React Router v7
- **Backend**: Express.js REST API (port 3001)
- **Database**: JSON file storage (`server/data/db.json`)
- **Styling**: TailwindCSS + class-variance-authority (CVA)
- **State**: Zustand for UI state
- **Dev Setup**: Vite proxy forwards `/api/*` to Express server

### Project Structure
```
src/
  components/
    catalog/         # Property/complex cards, filters, tabs
    forms/          # Lead generation modals
    layout/         # Header, Footer, SiteLayout
    ui/             # Reusable UI components (Button, Input, Modal, etc.)
  pages/            # Route pages (Home, Catalog, Property, Complex, Collection)
    admin/          # Admin panel pages (feeds, imports, collections, leads)
  store/            # Zustand stores

server/
  routes/           # Express routes (auth, public, leads, admin, analytics)
  lib/              # Utilities (storage, seed, phone formatting, ID generation)
  middleware/       # adminAuth, rateLimit
  data/             # db.json file storage

shared/
  types.ts          # Shared TypeScript types used by both client and server
```

### Data Flow
1. Client makes API calls to `/api/*` endpoints
2. Vite dev server proxies to Express backend at `localhost:3001`
3. Express routes use `storage.ts` helpers to read/write `db.json`
4. Shared types (`shared/types.ts`) ensure type safety across stack

## Key Domain Concepts

### Property Data Model
The system manages three core entities:

1. **Complex** (Жилой комплекс / ЖК) - Residential development projects
   - Category: always `'newbuild'`
   - Contains multiple properties
   - Has price_from, area_from (minimum values)
   - Linked to properties via `external_id`/`complex_external_id`

2. **Property** (Лот) - Individual units
   - Categories: `'newbuild' | 'secondary' | 'rent'`
   - Deal types: `'sale' | 'rent'`
   - Key fields: bedrooms, price, area_total, district, metro
   - Can belong to a complex or standalone

3. **Collection** (Подборка) - Curated property/complex lists
   - Manually managed in admin panel
   - Used for "Featured of the Week" sections

### Feed Import System
The system imports property data from external sources (developers, partners):
- **Formats**: XLSX, CSV, XML, JSON
- **Modes**: Manual upload or auto-fetch via URL
- **Process**: Upload → Column mapping → Preview → Import
- **Lifecycle**: Records matched by `source_id + external_id`, missing records marked as `hidden`

### Lead Forms
Four form types with specific purposes:
1. `consultation` - General inquiry (name + phone)
2. `buy_sell` - Purchase/sale request with tabs (name + phone)
3. `view_details` - Property viewing request (name + phone)
4. `partner` - Partnership inquiry (name + phone + comment)

All forms track source context (page, block, object_id) for analytics.

## Code Patterns

### Type Safety
- All shared types in `shared/types.ts` imported with `.js` extension for ESM compatibility
- Use `DbShape` interface for database structure
- Type guards ensure runtime safety when reading external data

### UI Component Patterns
- UI components in `src/components/ui/` use CVA for variant management
- Example: `Button` has `variant` and `size` props managed via `cva()`
- Consistent use of `cn()` utility (tailwind-merge + clsx) for className merging

### API Conventions
- Public routes in `server/routes/public.ts`
- Admin routes in `server/routes/admin.ts` with `adminAuth` middleware
- Responses follow `{ success: boolean, data?: any, error?: string }` pattern
- Lead creation includes IP and user-agent tracking

### Storage Helpers
Use functions from `server/lib/storage.ts`:
- `readDb()` - Read entire database
- `writeDb(db)` - Write entire database
- `withDb(fn)` - Atomic read-modify-write operation

### Path Aliases
TypeScript paths configured with `@/*` pointing to `src/*`:
```typescript
import { Button } from '@/components/ui/Button'
```

## Technical Specifications

### Real Estate Business Rules
Based on `website_tech_spec.md` and `.trae/documents/tech_arch_rwgroup_website.md`:

1. **Data Normalization**:
   - Bedrooms: numeric only (0-4)
   - Price: numeric only
   - District/metro: from reference lists
   - Status: `'active' | 'hidden' | 'archived'`

2. **Import Mapping**:
   - Admin UI allows column mapping for XLSX/CSV/XML/JSON
   - Preview before commit
   - Error logs for failed imports
   - Template saving for recurring imports

3. **SEO Requirements**:
   - Slugs for all entities (properties, complexes, collections)
   - Meta tags and OpenGraph support needed
   - Schema.org structured data planned
   - Analytics tracking via source metadata

4. **Home Page Structure** (10 sections):
   - Hero, Catalogs, Featured, Advantages, Pricing, Steps, Mission, Team, Reviews, Partner form
   - Content managed via `db.json` home object

## Development Workflow

### Adding a New Feature
1. Define types in `shared/types.ts` if needed
2. Create API route in `server/routes/`
3. Update `DbShape` if database structure changes
4. Implement UI components in `src/components/`
5. Add page route if needed in `src/pages/`
6. Use `npm run check` to verify types

### Modifying the Database
1. Update `DbShape` interface in `shared/types.ts`
2. Modify seed logic in `server/lib/seed.ts` if needed
3. Database auto-reseeds on server restart if empty
4. For production, manual migration of `db.json` required

### Admin Panel Access
- Route: `/admin`
- Authentication managed via `server/middleware/adminAuth.ts`
- Login credentials configured in environment or hardcoded
- All admin routes prefixed with `/api/admin/*`

## Important Notes

- **Database**: Currently JSON file-based, designed to migrate to PostgreSQL (Supabase planned per tech spec)
- **Image Handling**: URLs stored in arrays, actual storage TBD (S3-compatible planned)
- **Phone Formatting**: Use `formatPhone()` from `server/lib/phone.ts` for Russian numbers
- **ID Generation**: Use `newId()` from `server/lib/ids.ts` for consistent UUID format
- **Seed Data**: Runs once on server start if `db.json` missing, controlled by `ensureSeed()` in `server/lib/seed.ts`
- **Concurrent Development**: Always use `npm run dev` to run both client and server together
