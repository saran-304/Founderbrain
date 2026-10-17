# FounderBrain

FounderBrain is a startup operating system for founders, combining workspace operations, founder connections, community, mentorship, fundraising, and a Gemini-powered startup assistant.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/founderbrain-app run dev` — run the FounderBrain web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secrets: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for browser authentication and API access
- Server-side Supabase variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` are fallback names; the API also accepts the `VITE_` names
- Optional secret: `GEMINI_API_KEY` enables the assistant; without it, the API returns an explicit unavailable response
- `PORT` and `BASE_PATH` are supplied by the managed artifact workflows and should not be set manually
- The root build supplies safe defaults for `PORT` and `BASE_PATH` so package builds also work outside a managed workflow
- The app uses the configured Supabase project; the template `lib/db` package and `DATABASE_URL` are not part of FounderBrain's data path

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Data and authentication: Supabase Auth, PostgREST, and row-level security
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/founderbrain-app/src/` — routed React frontend and Supabase authentication
- `artifacts/founderbrain-app/supabase/migrations/` — Supabase schema, policies, functions, and triggers
- `artifacts/api-server/src/routes/` — authenticated API handlers
- `lib/api-spec/openapi.yaml` — API source of truth
- `lib/api-client-react/` and `lib/api-zod/` — generated client hooks and validation schemas
- `lib/founderbrain-design-system/` — shared FounderBrain components and theme

## Architecture decisions

- API calls use a Supabase client created with the verified caller token so database RLS remains authoritative.
- The web app is the root artifact; API requests use the shared `/api` route.
- Supabase migrations are stored with the app and are not applied automatically by this repository's API workflow.

## Product

The app includes account access, workspace projects/tasks/goals, dashboard and activity, team invitations, founder discovery and connections, community posts, portfolios, mentorship, fundraising, notifications, settings, and saved Gemini assistant runs.

## User preferences

Preserve the imported FounderBrain implementation and existing visual identity; do not replace it with a generic template.

## Gotchas

- Change `lib/api-spec/openapi.yaml` first, then run codegen before using generated hooks or schemas.
- Do not apply a Supabase migration until its target project and applied-migration history are confirmed.
- Never expose Supabase or Gemini secrets to the browser except the configured Supabase anon/public key.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
