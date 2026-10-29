# FounderBrain Database Migration Guide

## Overview
This document provides safe execution steps for applying pending database migrations to your Supabase project.

## Required Migrations

### 1. Saved Founders Table
**File**: `artifacts/founderbrain-app/supabase/migrations/20261020003000_founderbrain_saved_founders.sql`

**Purpose**: Allows users to save/bookmark founder profiles for later reference.

**Schema**:
- `saved_founders` table with user_id, founder_id, created_at
- Foreign key to auth.users (both user_id and founder_id)
- Foreign key to public.profiles (founder_id)
- Unique constraint on (user_id, founder_id)
- Check constraint: user_id <> founder_id (cannot save yourself)

**RLS Policies**:
- Authenticated users can SELECT their own saved founders
- Authenticated users can INSERT their own saved founders
- Authenticated users can DELETE their own saved founders
- Anon role has no access

**Backend Implementation**: ✅ Complete
- GET /api/founders/saved - List saved founders
- POST /api/founders/saved - Save a founder
- DELETE /api/founders/saved/:founderId - Unsave a founder

---

### 2. Feedback Wall Table
**File**: `artifacts/founderbrain-app/supabase/migrations/20261025000000_founderbrain_feedback_wall.sql`

**Purpose**: Public feedback wall for feature requests, bug reports, and general feedback.

**Schema**:
- `feedback_posts` table with id, author_id, message, category, status, created_at, updated_at
- Message length validation: 1-2000 characters
- Category constraint: 'idea', 'bug_report', 'feature_request', 'general_feedback'
- Status constraint: 'pending', 'published', 'rejected'
- Foreign key to auth.users (author_id)

**RLS Policies**:
- **Public** (anon role) can SELECT feedback where status = 'published'
- Authenticated users can SELECT their own feedback (any status)
- Authenticated users can INSERT their own feedback (status defaults to 'pending')
- Authenticated users can UPDATE their own feedback
- Authenticated users can DELETE their own feedback

**Backend Implementation**: ✅ Complete
- GET /api/feedback (public) - List published feedback with optional category filter
- POST /api/feedback (authenticated) - Submit feedback
- DELETE /api/feedback/:feedbackId (authenticated) - Delete own feedback

**Frontend Implementation**: ✅ Complete
- /feedback page with public read access
- Authenticated users can submit feedback
- Category filtering
- Users can delete their own feedback

---

## Pre-Migration Checklist

Before applying migrations, verify:

1. **Supabase Project Access**
   - You have access to the Supabase dashboard
   - Project URL: tkuptsquekazyqonrzrn.supabase.co (or your configured project)
   - You have SQL Editor permissions

2. **Backup Consideration**
   - Supabase automatically backs up data
   - If you have production data, consider creating a manual backup before migrations

3. **Migration Dependencies**
   - Core migrations (20261016000000 through 20261020002000) should already be applied
   - These two new migrations have no dependencies on each other
   - Can be applied in any order

---

## Safe Execution Steps

### Step 1: Access Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project (tkuptsquekazyqonrzrn or your configured project)
3. Navigate to SQL Editor from the left sidebar

### Step 2: Apply Saved Founders Migration
1. Click "New Query"
2. Copy the entire contents of `20261020003000_founderbrain_saved_founders.sql`
3. Paste into the SQL Editor
4. Review the SQL for any project-specific modifications needed
5. Click "Run" to execute
6. Verify success: You should see "Success. No rows returned" or similar confirmation

### Step 3: Apply Feedback Wall Migration
1. Click "New Query" (new tab)
2. Copy the entire contents of `20261025000000_founderbrain_feedback_wall.sql`
3. Paste into the SQL Editor
4. Review the SQL for any project-specific modifications needed
5. Click "Run" to execute
6. Verify success: You should see "Success. No rows returned" or similar confirmation

### Step 4: Verify Tables Created
1. Go to Table Editor in Supabase
2. Verify `public.saved_founders` table exists
3. Verify `public.feedback_posts` table exists
4. Check that RLS is enabled on both tables
5. Verify policies are visible in the RLS tab for each table

---

## Post-Migration Verification

### Test Saved Founders Feature
1. Sign in to the application
2. Navigate to Founders page (/founders)
3. Click to save a founder profile
4. Verify the founder appears in your saved list
5. Try to unsave the founder
6. Verify it's removed from your list

### Test Feedback Wall Feature
1. Navigate to /feedback (public page)
2. Verify the page loads without authentication
3. Sign in to the application
4. Submit feedback with a message and category
5. Verify success message appears
6. Check that the feedback is submitted (status: pending)
7. Navigate back to /feedback while signed out
8. Note: Pending feedback won't appear publicly (needs moderation)
9. Sign back in and verify you can delete your own feedback

---

## Potential Issues and Solutions

### Issue: "relation public.profiles does not exist"
**Cause**: Core migrations not applied
**Solution**: Apply core migrations first (20261016000000_founderbrain_core.sql and subsequent)

### Issue: "relation auth.users does not exist"
**Cause**: Supabase Auth not enabled
**Solution**: Enable Supabase Authentication in your project settings

### Issue: "policy already exists"
**Cause**: Migration run previously
**Solution**: Safe to ignore - migration uses "drop policy if exists" to handle this

### Issue: "constraint already exists"
**Cause**: Migration run previously
**Solution**: Safe to ignore - migration uses "create ... if not exists" to handle this

---

## Security Notes

### RLS Policies Verification
- Saved founders: Users can only access their own saved founders
- Feedback wall: Public can only read published feedback; users can only modify their own
- No policy allows cross-user data access
- Service role key required for moderation (not exposed in app)

### What to Monitor After Deployment
- Monitor for unauthorized access attempts in Supabase logs
- Check that feedback submissions default to 'pending' status
- Verify that published feedback is publicly accessible
- Ensure saved founders are user-scoped

---

## Environment Variables Required

The application needs these environment variables configured in Vercel (or locally in .env):

**Supabase**:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_URL` - Same as VITE_SUPABASE_URL (for backend)
- `SUPABASE_ANON_KEY` - Same as VITE_SUPABASE_ANON_KEY (for backend)

**Gemini AI** (optional - for AI assistant feature):
- `GEMINI_API_KEY` - Valid Google AI Studio API key (starts with AIza)

**Required for Production Deployment**:
- All Supabase variables must be set in Vercel Environment Variables
- Do NOT use service role keys in frontend (VITE_*) variables
- Gemini key is server-side only (no VITE_ prefix)

---

## Supabase Authentication Redirect URLs

After deployment, you'll need to configure Supabase Authentication redirect URLs:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your production Vercel URL to:
   - Site URL: https://your-vercel-domain.vercel.app
   - Redirect URLs: https://your-vercel-domain.vercel.app/**
   - Also add localhost for local development: http://localhost:3000/**

---

## Approval Required

Before proceeding with deployment:

- [ ] Review both migration files above
- [ ] Confirm you have Supabase SQL Editor access
- [ ] Confirm environment variables are ready for Vercel
- [ ] Confirm you understand the RLS security model
- [ ] Backup your database if it contains production data

---

## Next Steps After Migration Approval

1. Apply migrations in Supabase SQL Editor
2. Configure environment variables in Vercel
3. Update Supabase authentication redirect URLs
4. Deploy to Vercel
5. Test saved founders feature
6. Test feedback wall feature
7. Verify authentication flow
8. Monitor for any errors in Vercel logs
