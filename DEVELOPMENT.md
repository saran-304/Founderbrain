# FounderBrain Development Guide

## Quick Start

### Prerequisites

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables**
   
   Copy the `.env` file values to `artifacts/founderbrain-app/.env` (already done):
   ```
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Apply Database Migrations**
   
   Go to your Supabase dashboard at https://app.supabase.com and apply the migrations in order:
   - `artifacts/founderbrain-app/supabase/migrations/20261016000000_founderbrain_core.sql`
   - `artifacts/founderbrain-app/supabase/migrations/20261016001000_founderbrain_growth.sql`
   - `artifacts/founderbrain-app/supabase/migrations/20261017000000_founderbrain_member_update_privileges.sql`
   - `artifacts/founderbrain-app/supabase/migrations/20261017000100_founderbrain_public_portfolios.sql`

### Running the Application

**IMPORTANT**: You must run BOTH the API server and the frontend development server.

#### Option 1: Automated Startup (Easiest)

Double-click `start-dev.bat` in the project root. This will open two terminal windows:
- API Server on port 23608
- Frontend on port 3000

Then open http://localhost:3000 in your browser.

#### Option 2: Manual Startup (Two Terminal Windows)

**Terminal 1 - API Server (Port 23608):**
```powershell
cd artifacts\api-server
$env:PORT="23608"; $env:BASE_PATH="/"; pnpm run dev
```

**Terminal 2 - Frontend (Port 3000):**
```powershell
cd artifacts\founderbrain-app
$env:PORT="3000"; $env:BASE_PATH="/"; pnpm run dev
```

Then open http://localhost:3000 in your browser.

#### Option 3: Using Filter Commands (From Project Root)

**Terminal 1 - API Server:**
```powershell
$env:PORT="23608"; $env:BASE_PATH="/"; pnpm --filter @workspace/api-server run dev
```

**Terminal 2 - Frontend:**
```powershell
$env:PORT="3000"; $env:BASE_PATH="/"; pnpm --filter @workspace/founderbrain-app run dev
```

### Architecture

- **Frontend**: Runs on port 3000 (Vite dev server)
- **API Server**: Runs on port 23608 (Express server)
- **Proxy**: The Vite dev server proxies `/api/*` requests to the API server at `http://localhost:23608`
- **Supabase**: Authentication and database hosted at your Supabase project URL

### Common Issues

#### "workspaceQuery.data.map is not a function"

**Cause**: API server is not running or the frontend cannot reach it.

**Solution**: 
1. Ensure the API server is running on port 3001
2. Check that both servers are running without errors
3. Verify the Vite proxy configuration in `artifacts/founderbrain-app/vite.config.ts`

#### "Authentication isn't configured"

**Cause**: Environment variables are not loaded.

**Solution**: Ensure `artifacts/founderbrain-app/.env` exists with valid Supabase credentials.

#### "Cannot find workspace" or "No workspaces"

**Cause**: Database migrations not applied or user has no workspace yet.

**Solution**: 
1. Apply all migrations to your Supabase project
2. Sign up for a new account
3. The first workspace will be created automatically on first login

### TypeScript Verification

```bash
# Check all packages
pnpm run typecheck

# Check specific package
cd artifacts/founderbrain-app
pnpm run typecheck

cd ../api-server
pnpm run typecheck
```

### Production Build

```bash
# Build all packages
pnpm run build

# Frontend output: artifacts/founderbrain-app/dist/public
# API output: artifacts/api-server/dist/index.mjs
```

### API Development

After modifying `lib/api-spec/openapi.yaml`, regenerate the client code:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This updates:
- `lib/api-client-react/src/generated/` - React Query hooks
- `lib/api-zod/src/generated/` - Zod validation schemas
