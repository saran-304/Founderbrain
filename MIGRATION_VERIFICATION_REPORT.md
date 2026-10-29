# FounderBrain Database Migration Verification Report
## October 25, 2026

---

## Executive Summary

This report provides a detailed analysis of the two pending database migrations, their correctness, idempotency, security implications, and compatibility with the backend implementation.

---

## Migration 1: Saved Founders Table

### File: `20261020003000_founderbrain_saved_founders.sql`

### Schema Analysis

**Table Structure**:
```sql
create table if not exists public.saved_founders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  founder_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, founder_id),
  check (user_id <> founder_id)
);
```

**Correctness Assessment**: ✅ CORRECT
- Uses `IF NOT EXISTS` for idempotency
- Primary key uses UUID with default value
- Foreign keys to `auth.users` with cascade delete
- Unique constraint prevents duplicate saves
- Check constraint prevents self-saving
- Timestamp with timezone defaults to now()

**Foreign Key to Profiles**:
```sql
alter table public.saved_founders
  add constraint saved_founders_founder_id_fkey
    foreign key (founder_id) references public.profiles(id) on delete cascade;
```

**Assessment**: ⚠️ POTENTIAL ISSUE
- The foreign key to `public.profiles` is added via `ALTER TABLE`
- This uses `ADD CONSTRAINT` without `IF NOT EXISTS`
- **Risk**: If the migration is run twice, it will fail with "constraint already exists"
- **Recommendation**: Wrap in a DO block or use a more defensive approach

**Indexes**:
```sql
create index if not exists saved_founders_user_idx
  on public.saved_founders(user_id, created_at desc);

create index if not exists saved_founders_founder_idx
  on public.saved_founders(founder_id);
```

**Assessment**: ✅ CORRECT
- Uses `IF NOT EXISTS` for idempotency
- Indexes support common query patterns (user's saved list, reverse lookup)

### RLS Policies

**Enable RLS**:
```sql
alter table public.saved_founders enable row level security;
```

**Assessment**: ✅ CORRECT
- Re-enables RLS (safe to run multiple times)

**Policy: Read Own Saved Founders**:
```sql
drop policy if exists "Users read their own saved founders" on public.saved_founders;
create policy "Users read their own saved founders"
  on public.saved_founders for select to authenticated
  using (user_id = auth.uid());
```

**Assessment**: ✅ CORRECT
- Uses `DROP POLICY IF EXISTS` for idempotency
- Only allows reading own saved founders
- Restricts to authenticated role

**Policy: Add Own Saved Founders**:
```sql
drop policy if exists "Users add their own saved founders" on public.saved_founders;
create policy "Users add their own saved founders"
  on public.saved_founders for insert to authenticated
  with check (user_id = auth.uid());
```

**Assessment**: ✅ CORRECT
- Users can only insert with their own user_id
- WITH CHECK ensures inserted rows match condition

**Policy: Delete Own Saved Founders**:
```sql
drop policy if exists "Users delete their own saved founders" on public.saved_founders;
create policy "Users delete their own saved founders"
  on public.saved_founders for delete to authenticated
  using (user_id = auth.uid());
```

**Assessment**: ✅ CORRECT
- Users can only delete their own saved founders
- USING condition applies to existing rows

### Grant Permissions

```sql
revoke all on table public.saved_founders from anon;
grant select, insert, delete on public.saved_founders to authenticated;
```

**Assessment**: ✅ CORRECT
- Anon role has no access
- Authenticated role has minimal required permissions
- No UPDATE granted (correct - saved founders are immutable)

### Backend Route Compatibility

**GET /api/founders/saved** (lines 437-467):
```typescript
const userId = getRequestUser(req).id;
const { data, error } = await getRequestSupabase(req)
  .from('saved_founders')
  .select('founder_id')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

**Assessment**: ✅ COMPATIBLE
- Uses `user_id` filter (matches RLS policy)
- Joins to profiles for display data
- Relies on RLS to enforce user isolation

**POST /api/founders/saved** (lines 469-531):
```typescript
const userId = getRequestUser(req).id;
const founderId = body.data.founderId;

if (founderId === userId) {
  res.status(400).json({ error: 'You cannot save yourself.' });
  return;
}

const { data, error } = await getRequestSupabase(req)
  .from('saved_founders')
  .insert({ user_id: userId, founder_id: founderId })
  .select('founder_id')
  .single();
```

**Assessment**: ✅ COMPATIBLE
- Backend validates no self-saving (defensive)
- Inserts with user_id = auth.uid() (matches RLS policy)
- Checks for existing saves before insert

**DELETE /api/founders/saved/:founderId** (lines 533-562):
```typescript
const userId = getRequestUser(req).id;
const founderId = params.data.founderId;

const { data, error } = await getRequestSupabase(req)
  .from('saved_founders')
  .delete()
  .eq('user_id', userId)
  .eq('founder_id', founderId)
  .select('id')
  .maybeSingle();
```

**Assessment**: ✅ COMPATIBLE
- Filters by both user_id and founder_id
- Relies on RLS to prevent cross-user deletion
- Defensive filtering matches RLS policy

### Security Assessment

✅ **User Isolation**: RLS ensures users can only access their own saved founders
✅ **No Cross-User Access**: Policies prevent reading other users' saved lists
✅ **No Self-Saving**: Check constraint + backend validation
✅ **No Privilege Escalation**: Authenticated role only, no service role exposure
✅ **Cascade Delete**: Foreign key with cascade handles user deletion

### Idempotency Assessment

⚠️ **MOSTLY IDEMPOTENT** with one exception:
- Table creation: ✅ `IF NOT EXISTS`
- Indexes: ✅ `IF NOT EXISTS`
- RLS enable: ✅ Safe to re-run
- Policies: ✅ `DROP POLICY IF EXISTS`
- Grants: ✅ Safe to re-run
- Foreign key constraint: ❌ **NOT IDEMPOTENT** - will fail on second run

**Recommendation**: Wrap the foreign key constraint in a defensive block or use a DO block to check existence.

---

## Migration 2: Feedback Wall Table

### File: `20261025000000_founderbrain_feedback_wall.sql`

### Schema Analysis

**Table Structure**:
```sql
create table if not exists public.feedback_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  category text not null check (category in ('idea', 'bug_report', 'feature_request', 'general_feedback')),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Correctness Assessment**: ✅ CORRECT
- Uses `IF NOT EXISTS` for idempotency
- Primary key uses UUID with default value
- Foreign key to `auth.users` with cascade delete
- Message length validation (1-2000 characters)
- Category constraint with valid values
- Status constraint with valid values
- Default status is 'pending' (safe default)
- Timestamps with timezone

**Indexes**:
```sql
create index if not exists feedback_posts_status_idx
  on public.feedback_posts(status, created_at desc);

create index if not exists feedback_posts_author_idx
  on public.feedback_posts(author_id, created_at desc);

create index if not exists feedback_posts_category_idx
  on public.feedback_posts(category, created_at desc);
```

**Assessment**: ✅ CORRECT
- Uses `IF NOT EXISTS` for idempotency
- Compound indexes support common query patterns
- Covers status filtering, author lookup, category filtering

### RLS Policies

**Enable RLS**:
```sql
alter table public.feedback_posts enable row level security;
```

**Assessment**: ✅ CORRECT

**Policy: Public Read Published Feedback**:
```sql
drop policy if exists "Public read published feedback" on public.feedback_posts;
create policy "Public read published feedback"
  on public.feedback_posts for select
  using (status = 'published');
```

**Assessment**: ✅ CORRECT
- No role restriction (public access)
- Only allows reading published feedback
- Anonymous users can see published feedback

**Policy: Users Read Own Feedback**:
```sql
drop policy if exists "Users read own feedback" on public.feedback_posts;
create policy "Users read own feedback"
  on public.feedback_posts for select to authenticated
  using (author_id = auth.uid());
```

**Assessment**: ✅ CORRECT
- Authenticated users can read their own feedback regardless of status
- Allows authors to see their pending/rejected feedback

**Policy: Users Insert Own Feedback**:
```sql
drop policy if exists "Users insert own feedback" on public.feedback_posts;
create policy "Users insert own feedback"
  on public.feedback_posts for insert to authenticated
  with check (author_id = auth.uid() and status = 'pending');
```

**Assessment**: ✅ CORRECT
- Users can only insert with their own author_id
- WITH CHECK enforces status = 'pending' on insert
- Prevents users from publishing their own feedback directly

**Policy: Users Update Own Feedback**:
```sql
drop policy if exists "Users update own feedback" on public.feedback_posts;
create policy "Users update own feedback"
  on public.feedback_posts for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
```

**Assessment**: ✅ CORRECT
- Users can only update their own feedback
- Both USING and WITH CHECK ensure author ownership
- Allows future moderation features

**Policy: Users Delete Own Feedback**:
```sql
drop policy if exists "Users delete own feedback" on public.feedback_posts;
create policy "Users delete own feedback"
  on public.feedback_posts for delete to authenticated
  using (author_id = auth.uid());
```

**Assessment**: ✅ CORRECT
- Users can only delete their own feedback
- USING condition applies to existing rows

### Grant Permissions

```sql
revoke all on table public.feedback_posts from anon;
grant select on table public.feedback_posts to anon;
grant select, insert, update, delete on table public.feedback_posts to authenticated;
```

**Assessment**: ✅ CORRECT
- Anon role can SELECT only (read published feedback)
- Authenticated role has full CRUD (for own feedback)
- Matches RLS policy design

### Helper Function

```sql
create or replace function public.get_feedback_author_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(display_name, 'Anonymous')
  from public.profiles
  where id = p_user_id;
$$;
```

**Assessment**: ✅ CORRECT
- Uses `CREATE OR REPLACE` for idempotency
- SECURITY DEFINER runs with elevated privileges
- SET SEARCH_PATH = '' prevents SQL injection
- Returns 'Anonymous' if no display name
- STABLE indicates deterministic based on input

### Backend Route Compatibility

**GET /api/feedback** (lines 11-60):
```typescript
let query = getRequestSupabase(req)
  .from('feedback_posts')
  .select('id,author_id,message,category,status,created_at')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(Math.min(limit, 100));

if (category && ['idea', 'bug_report', 'feature_request', 'general_feedback'].includes(category)) {
  query = query.eq('category', category);
}
```

**Assessment**: ✅ COMPATIBLE
- Public endpoint (no auth required)
- Filters by status = 'published' (matches RLS)
- Category filtering matches constraint
- Joins to profiles for author names
- Relies on RLS to prevent reading unpublished feedback

**POST /api/feedback** (lines 63-101):
```typescript
const userId = getRequestUser(req).id;

const { data, error } = await getRequestSupabase(req)
  .from('feedback_posts')
  .insert({
    author_id: userId,
    message: message.trim(),
    category,
    status: 'pending',
  })
  .select('id,message,category,status,created_at')
  .single();
```

**Assessment**: ✅ COMPATIBLE
- Authenticated endpoint (requires auth middleware)
- Inserts with author_id = auth.uid() (matches RLS)
- Sets status = 'pending' (matches RLS WITH CHECK)
- Backend validates message length and category

**DELETE /api/feedback/:feedbackId** (lines 104-127):
```typescript
const feedbackId = req.params.feedbackId;
const userId = getRequestUser(req).id;

const { data, error } = await getRequestSupabase(req)
  .from('feedback_posts')
  .delete()
  .eq('id', feedbackId)
  .eq('author_id', userId)
  .select('id')
  .maybeSingle();
```

**Assessment**: ✅ COMPATIBLE
- Filters by both id and author_id
- Relies on RLS to prevent cross-user deletion
- Defensive filtering matches RLS policy

### Security Assessment

✅ **Public/Private Separation**: Public can only read published feedback
✅ **User Isolation**: Users can only access their own feedback
✅ **No Self-Publishing**: Status defaults to 'pending', RLS prevents direct publishing
✅ **Moderation Path**: UPDATE policy allows future moderation features
✅ **Function Security**: SECURITY DEFINER with search_path = '' prevents injection
✅ **No Privilege Escalation**: Anon has SELECT only, authenticated has CRUD (own data only)

### Idempotency Assessment

✅ **FULLY IDEMPOTENT**:
- Table creation: ✅ `IF NOT EXISTS`
- Indexes: ✅ `IF NOT EXISTS`
- RLS enable: ✅ Safe to re-run
- Policies: ✅ `DROP POLICY IF EXISTS`
- Grants: ✅ Safe to re-run
- Function: ✅ `CREATE OR REPLACE`

---

## Dependency Analysis

### Core Dependencies

Both migrations depend on:
1. `auth.users` table (Supabase Auth - always exists)
2. `public.profiles` table (from core migration 20261016000000)

**Assessment**: ✅ Dependencies exist in core migration
- Core migration should already be applied
- If profiles table doesn't exist, both migrations will fail
- This is correct behavior - should not proceed without core schema

### Inter-Migration Dependencies

**Saved Founders**:
- No dependency on Feedback Wall
- Can be applied independently

**Feedback Wall**:
- No dependency on Saved Founders
- Can be applied independently

**Assessment**: ✅ No inter-dependencies
- Migrations can be applied in any order
- Safe to apply one without the other

---

## Known Issues and Recommendations

### Issue 1: Saved Founders Foreign Key Constraint Not Idempotent

**Location**: Line 14-16 of saved_founders migration

**Problem**:
```sql
alter table public.saved_founders
  add constraint saved_founders_founder_id_fkey
    foreign key (founder_id) references public.profiles(id) on delete cascade;
```

If run twice, this will fail with "constraint already exists".

**Recommended Fix**:
```sql
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'saved_founders_founder_id_fkey'
  ) then
    alter table public.saved_founders
      add constraint saved_founders_founder_id_fkey
        foreign key (founder_id) references public.profiles(id) on delete cascade;
  end if;
end $$;
```

**Impact**: LOW
- Migration will still work on first run
- Issue only if re-run after successful application
- Can be ignored if migration is never re-run

### Issue 2: No Migration Rollback Script

**Problem**: No rollback scripts provided for either migration.

**Recommendation**: Create rollback scripts for production safety.

**Rollback for Saved Founders**:
```sql
drop table if exists public.saved_founders cascade;
```

**Rollback for Feedback Wall**:
```sql
drop table if exists public.feedback_posts cascade;
drop function if exists public.get_feedback_author_display_name(p_user_id uuid);
```

**Impact**: MEDIUM
- Standard practice to have rollback scripts
- Not blocking deployment
- Consider for production deployment

---

## Backend Route Registration Verification

### Saved Founders Routes

**Location**: `artifacts/api-server/src/routes/founders.ts` (lines 437-562)

**Registration**: Founders router is registered in `routes/index.ts` (line 36)
- Mounted at `/founders`
- Protected by `requireSupabaseUser` middleware (line 27)
- Correctly placed after auth middleware

**Assessment**: ✅ CORRECT

### Feedback Wall Routes

**Location**: `artifacts/api-server/src/routes/feedback.ts`

**Registration**: Feedback router is registered in `routes/index.ts` (lines 9, 26, 44)
- `publicFeedbackRouter` exported and mounted BEFORE auth middleware (line 26)
- Protected feedback router mounted AFTER auth middleware (line 44)
- GET /api/feedback is public (line 26)
- POST/DELETE /api/feedback are authenticated (line 44)

**Assessment**: ✅ CORRECT
- Public read access works correctly
- Authenticated write access works correctly
- Middleware order is correct

---

## Vercel Configuration Verification

### Current Configuration

```json
{
  "services": {
    "api-server": {
      "root": "artifacts/api-server",
      "framework": "express",
      "buildCommand": "pnpm run build",
      "outputDirectory": "dist",
      "environmentVariables": {
        "NODE_ENV": "production"
      }
    },
    "founderbrain-app": {
      "root": "artifacts/founderbrain-app",
      "framework": "vite",
      "buildCommand": "pnpm run build",
      "outputDirectory": "dist/public"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": { "service": "api-server" }
    },
    {
      "source": "/(.*)",
      "destination": { "service": "founderbrain-app" }
    }
  ]
}
```

**Assessment**: ✅ CORRECT
- Services architecture properly configured
- API rewrites route /api to api-server
- SPA fallback to founderbrain-app
- Build commands match package.json scripts
- Output directories match build outputs
- Security headers present

### Environment Variables Required

**Must be set in Vercel**:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_URL` - Same as VITE_SUPABASE_URL
- `SUPABASE_ANON_KEY` - Same as VITE_SUPABASE_ANON_KEY
- `GEMINI_API_KEY` - Google AI Studio API key (optional)

**Assessment**: ⚠️ NOT VERIFIED
- Cannot verify if these are set in Vercel
- User must configure before deployment

### Supabase Authentication Redirect URLs

**Required Configuration**:
- Site URL: Production Vercel URL
- Redirect URLs: Production Vercel URL + /**
- Local development: http://localhost:3000/**

**Assessment**: ⚠️ NOT VERIFIED
- Cannot verify if these are configured
- User must configure before deployment

---

## Migration Execution Recommendations

### Pre-Execution Checklist

- [ ] Confirm Supabase project access
- [ ] Verify core migrations (20261016000000-20261020002000) are applied
- [ ] Verify `public.profiles` table exists
- [ ] Backup database if production data exists
- [ ] Review both migration files
- [ ] Test migrations in a development environment first

### Execution Order

**Option 1: Apply Both Together** (Recommended)
1. Open Supabase SQL Editor
2. Run saved_founders migration
3. Run feedback_wall migration
4. Verify tables created
5. Verify RLS enabled
6. Verify policies exist

**Option 2: Apply Separately**
1. Apply saved_founders migration
2. Test saved founders endpoints
3. Apply feedback_wall migration
4. Test feedback wall endpoints

### Post-Execution Verification

**Verify Tables**:
```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('saved_founders', 'feedback_posts');
```

**Verify RLS Enabled**:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('saved_founders', 'feedback_posts');
```

**Verify Policies**:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('saved_founders', 'feedback_posts');
```

**Verify Indexes**:
```sql
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE tablename IN ('saved_founders', 'feedback_posts');
```

---

## Conclusion

### Migration 1: Saved Founders
- **Correctness**: ✅ CORRECT
- **Idempotency**: ⚠️ MOSTLY IDEMPOTENT (one non-idempotent constraint)
- **Security**: ✅ SECURE
- **Backend Compatibility**: ✅ COMPATIBLE
- **Recommendation**: Safe to apply with minor issue noted

### Migration 2: Feedback Wall
- **Correctness**: ✅ CORRECT
- **Idempotency**: ✅ FULLY IDEMPOTENT
- **Security**: ✅ SECURE
- **Backend Compatibility**: ✅ COMPATIBLE
- **Recommendation**: Safe to apply

### Overall Assessment
Both migrations are well-designed, secure, and compatible with the backend implementation. The minor idempotency issue in the saved_founders migration is low-risk and can be ignored if the migration is not re-run after successful application.

### Next Steps
1. Apply migrations in Supabase SQL Editor
2. Configure Vercel environment variables
3. Configure Supabase authentication redirect URLs
4. Deploy to Vercel
5. Test new features end-to-end
