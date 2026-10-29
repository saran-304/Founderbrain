# FounderBrain AI Provider Fix

## Root Cause Analysis

### Issue: "No AI provider is connected yet"

**Root Cause**: The `GEMINI_API_KEY` in the `.env` file was invalid (placeholder value starting with `REDACTED_SECRET instead of a valid Google AI Studio API key).

### Failing File
- `artifacts/api-server/src/routes/assistants.ts` (line 116-119)
- The Gemini API returned 401 Unauthorized, which the server converted to 502 Bad Gateway

### Error Flow
1. Frontend sends POST request to `/api/assistants/runs`
2. API server validates GEMINI_API_KEY exists
3. API server calls Gemini API with the key
4. Gemini API returns 401 (invalid key)
5. API server returns 502 with generic error message
6. Frontend displays "No AI provider is connected yet"

## Fixes Applied

### 1. Environment Variable Loading (API Server)
**File**: `artifacts/api-server/src/index.ts`

Added dotenv configuration to load environment variables from project root:
```typescript
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
```

**Result**: API server now correctly loads `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `GEMINI_API_KEY`

### 2. Enhanced Error Handling (API Server)
**File**: `artifacts/api-server/src/routes/assistants.ts`

**Changes**:
- Added API key format validation (checks for `AIza` prefix or auth key format)
- Added specific error messages for different Gemini API status codes:
  - 401: Invalid or expired API key
  - 403: Access forbidden (check restrictions/billing)
  - 429: Rate limit exceeded
  - Other: Return actual error body from Gemini API

**Result**: Users now see actionable error messages instead of generic "provider unavailable"

### 3. Enhanced Error Display (Frontend)
**File**: `artifacts/founderbrain-app/src/pages/operating.tsx`

**Changes**:
- Updated error handler to extract actual error message from API response
- Display specific error message in toast notification

**Result**: Users see the actual reason for failure (e.g., "Gemini API key is invalid or expired")

### 4. Updated Environment Variable Template
**File**: `.env.example`

**Changes**:
- Removed hardcoded placeholder values
- Added clear instructions for obtaining valid keys
- Explained valid API key formats

## What You Need to Do

### Obtain a Valid Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API key"
4. Copy the key (starts with `AIza` for standard keys, or is an auth key)
5. Update your `.env` file with the valid key:

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

### Verify Supabase Configuration

Ensure your `.env` file has valid Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-valid-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-valid-anon-key
```

### Restart the API Server

After updating `.env`:
```bash
cd artifacts/api-server
pnpm run build
PORT=3001 node --enable-source-maps ./dist/index.mjs
```

### Test the AI Assistant

1. Sign in to the application
2. Navigate to the Assistants page
3. Enter a prompt (at least 20 characters)
4. Click "Generate guidance"
5. You should now see either:
   - A valid AI response (if API key is valid)
   - A specific error message (if API key is invalid/expired/has restrictions)

## Verification

Run typecheck and build:
```bash
cd FounderBrain-SaaS
pnpm run typecheck
pnpm run build
```

Both should complete successfully with no errors.

## Architecture Notes

### Gemini Integration
- **Model**: `gemini-3.8-flash` (valid model as of October 2026)
- **API**: REST API endpoint `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`
- **Authentication**: Bearer token via `x-goog-api-key` header
- **Rate Limiting**: 3 requests per minute per user (enforced server-side)

### No Provider Registry
The codebase does not use a provider registry or abstraction layer. It directly calls the Gemini API with no fallback to other providers. This is intentional for simplicity and cost control.

### Security
- API key is server-side only (never exposed to frontend)
- No logging of API key values
- Format validation before API call to fail fast

## Common Issues

### "Gemini API key is invalid or expired"
- Get a new key from https://aistudio.google.com/apikey
- If key starts with `AIza`, ensure it has Gemini API restrictions (not unrestricted)
- If key is an auth key, ensure it's bound to a service account with Gemini API access

### "Gemini API access forbidden"
- Check API key restrictions in Google Cloud Console
- Ensure the Google Cloud project has billing enabled
- Verify the key has access to the Generative Language API

### "Gemini API rate limit exceeded"
- Wait before trying again
- The server enforces 3 requests per minute per user
- Upgrade your Google Cloud project quota if needed

## Files Modified

1. `artifacts/api-server/src/index.ts` - Added dotenv configuration
2. `artifacts/api-server/src/routes/assistants.ts` - Enhanced error handling
3. `artifacts/founderbrain-app/src/pages/operating.tsx` - Enhanced error display
4. `.env.example` - Updated with clear instructions
5. `artifacts/api-server/package.json` - Added dotenv dependency
