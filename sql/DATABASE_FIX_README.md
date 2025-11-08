# Database Setup Fix - "profiles" Relation Does Not Exist

## Problem Summary

The error `ERROR: 42P01: relation "profiles" does not exist` occurs because the database is missing essential tables:
- `profiles` - User profile information
- `avatar_states` - Real-time avatar positions and states

These tables are referenced throughout the codebase but were never created in the database.

## Root Cause

The SQL files in the `sql/` folder were incomplete:
1. `supabase-schema.sql` only created `custom_lobbies` table and referenced `profiles` with a foreign key
2. `peer_connections.sql` created `peer_connections` table
3. `FIX_PERMISSIONS.sql` and other files assumed these tables existed
4. **No file actually created the `profiles` and `avatar_states` tables**

## Solution

I've created two comprehensive SQL migration files to fix this issue:

### Option 1: Quick Fix (Recommended)
Run the complete setup script that creates all tables in the correct order:

**File: `sql/COMPLETE_DATABASE_SETUP.sql`**

This script:
- ✅ Creates all 5 required tables (profiles, avatar_states, custom_lobbies, peer_connections, room_messages)
- ✅ Sets up all indexes for performance
- ✅ Configures Row Level Security (RLS) with permissive policies
- ✅ Grants proper permissions to anon and authenticated roles
- ✅ Enables Realtime replication for live updates
- ✅ Creates helper functions and triggers
- ✅ Includes verification queries

### Option 2: Incremental Fix
If you want to add just the missing tables:

**File: `sql/create-missing-tables.sql`**

This script:
- Creates only `profiles` and `avatar_states` tables
- Updates the `custom_lobbies` foreign key constraint
- Sets up RLS and permissions for these tables
- Enables Realtime replication

## How to Apply the Fix

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**

### Step 2: Run the Setup Script
1. Copy the contents of `sql/COMPLETE_DATABASE_SETUP.sql`
2. Paste into the SQL Editor
3. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Step 3: Verify Success
After running the script, you should see:
- ✅ Success message
- ✅ Verification output showing all tables created
- ✅ Realtime status showing enabled tables

Check the output for messages like:
```
=== TABLE CREATION STATUS ===
✅ profiles
✅ avatar_states
✅ custom_lobbies
✅ peer_connections
✅ room_messages
```

### Step 4: Verify Tables in Dashboard (Optional)
1. Go to **Database > Tables** in Supabase
2. You should see all 5 tables:
   - `profiles`
   - `avatar_states`
   - `custom_lobbies`
   - `peer_connections`
   - `room_messages`

### Step 5: Enable Realtime in Dashboard (If Script Failed)
If the script couldn't enable Realtime automatically:
1. Go to **Database > Replication** in Supabase
2. Find each table and toggle Realtime **ON**:
   - `profiles`
   - `avatar_states`
   - `peer_connections`
   - `room_messages`

## Table Schemas Overview

### 1. profiles
Stores user profile information:
- `id` (UUID) - Primary key
- `user_id` (TEXT) - Unique user identifier
- `username` (TEXT) - Display name
- `selected_avatar_model` (TEXT) - VRM model path
- AI personality fields (bio, interests, etc.)
- Timestamps (created_at, last_seen)

### 2. avatar_states
Stores real-time avatar state in lobbies:
- `id` (UUID) - Primary key
- `profile_id` (TEXT) - References user
- `lobby_id` (TEXT) - Current lobby
- `position` (JSONB) - 3D coordinates
- `rotation` (JSONB) - 3D rotation
- `animation` (TEXT) - Current animation
- `equipped_weapon` (JSONB) - Weapon info
- `is_online` (BOOLEAN) - Online status
- `ai_behavior` (TEXT) - AI state (idle, wander, patrol, talking)

### 3. custom_lobbies
User-created virtual rooms:
- Lobby configuration (name, description, theme)
- Host settings (creator profile or custom host)
- Player limits and access control

### 4. peer_connections
PeerJS voice chat connections:
- Maps profiles to PeerJS IDs
- Tracks online status for voice chat

### 5. room_messages
Chat messages in lobbies:
- Real-time chat history
- Links to profiles and lobbies

## Important Notes

### Foreign Key Handling
The `custom_lobbies.created_by` field is kept as `TEXT` instead of `UUID` to avoid migration issues. If you need strict foreign key constraints:
1. Ensure all existing `created_by` values are valid UUIDs
2. Run migration to convert TEXT to UUID
3. Add foreign key constraint

### Row Level Security (RLS)
All tables have RLS enabled with **permissive policies** (`true` for all operations). This is suitable for development. For production, you should:
1. Implement proper authentication
2. Restrict policies based on `auth.uid()`
3. Limit anonymous access

### Realtime Replication
All tables use `REPLICA IDENTITY FULL` which means Realtime subscriptions receive complete row data for INSERT, UPDATE, and DELETE operations.

## Testing the Fix

After applying the fix, test that the application works:

```bash
# Start the development server
npm run dev
```

Then:
1. ✅ Create a user profile
2. ✅ Create or join a lobby
3. ✅ Move your avatar (check avatar_states updates)
4. ✅ Send chat messages (check room_messages)
5. ✅ Join voice chat (check peer_connections)

## Troubleshooting

### If you still see "relation does not exist" errors:

1. **Check table creation:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

2. **Check permissions:**
   ```sql
   SELECT grantee, privilege_type 
   FROM information_schema.role_table_grants 
   WHERE table_name IN ('profiles', 'avatar_states')
   AND grantee IN ('anon', 'authenticated');
   ```

3. **Check RLS policies:**
   ```sql
   SELECT tablename, policyname, cmd 
   FROM pg_policies 
   WHERE tablename IN ('profiles', 'avatar_states');
   ```

### If Realtime isn't working:

1. **Check publication:**
   ```sql
   SELECT tablename 
   FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```

2. **Manually enable in dashboard:**
   Database > Replication > Toggle each table ON

### If foreign key errors persist:

Run this to temporarily remove foreign keys:
```sql
ALTER TABLE custom_lobbies DROP CONSTRAINT IF EXISTS custom_lobbies_created_by_fkey;
ALTER TABLE custom_lobbies ALTER COLUMN created_by TYPE TEXT;
```

## Next Steps

After fixing the database:
1. ✅ Test all features (profiles, lobbies, chat, avatars)
2. ✅ Monitor Realtime subscriptions in Supabase dashboard
3. ✅ Review and tighten RLS policies for production
4. ✅ Set up proper authentication (if not using anonymous access)
5. ✅ Consider adding data validation triggers
6. ✅ Set up automated cleanup (e.g., old peer_connections)

## Files Created

1. **`sql/create-missing-tables.sql`** - Creates just the missing profiles and avatar_states tables
2. **`sql/COMPLETE_DATABASE_SETUP.sql`** - Complete database setup from scratch
3. **`sql/DATABASE_FIX_README.md`** - This documentation file

## Summary

The "profiles does not exist" error is now resolved. The complete database schema is defined in `COMPLETE_DATABASE_SETUP.sql`, which creates all necessary tables, indexes, permissions, and Realtime subscriptions. Run this script in your Supabase SQL Editor to fix the issue.
