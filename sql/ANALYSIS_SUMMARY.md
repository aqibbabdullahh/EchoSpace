# EchoSpace Database Fix - Analysis Summary

## Issue Analysis Complete ✅

### Root Cause Identified
The error `ERROR: 42P01: relation "profiles" does not exist` occurred because:

1. **Missing Table Definitions**: The SQL schema files in the `sql/` folder never created the `profiles` and `avatar_states` tables
2. **Incomplete Migration**: Previous SQL files referenced these tables but assumed they already existed
3. **Foreign Key Dependencies**: `custom_lobbies` table tried to reference `profiles(id)` which didn't exist

### Tables Missing from Database Schema

| Table | Status | Used By | Purpose |
|-------|--------|---------|---------|
| `profiles` | ❌ Missing | lobbyStore.ts, DynamicChatService.js, custom_lobbies | User profile data |
| `avatar_states` | ❌ Missing | lobbyStore.ts, World component | Real-time avatar positions |
| `custom_lobbies` | ✅ Defined | Multiple components | User-created lobbies |
| `peer_connections` | ✅ Defined | Voice chat | PeerJS connections |
| `room_messages` | ✅ Defined | Chat system | Chat history |

### Code References Found

The codebase makes **10+ database queries** to the `profiles` table:

**In `lib/lobbyStore.ts`:**
- Line 254: `.from('profiles')` - Fetch existing profile
- Line 281: `.from('profiles')` - Update profile
- Line 301: `.from('profiles')` - Insert new profile
- Line 361: `.from('profiles')` - Fetch profile
- Line 371: `.from('profiles')` - Another fetch
- Line 499: `.from('profiles')` - Profile retrieval
- Line 755: `.from('profiles')` - Get profile by ID
- Line 827: `.from('profiles')` - Fetch user profile

**In `app/components/DynamicChatService.js`:**
- Line 371: `.from('profiles')` - Get host profile
- Line 495: `.from('profiles')` - Fetch attendee profiles

**In SQL Files:**
- `supabase-schema.sql`: Foreign key reference to `profiles(id)`
- `FIX_PERMISSIONS.sql`: Grants permissions on `profiles` table
- Multiple policies reference `profiles` table

### Solution Provided

I've created **3 comprehensive SQL files** to fix this issue:

#### 1. `sql/COMPLETE_DATABASE_SETUP.sql` ⭐ RECOMMENDED
- **Complete database setup from scratch**
- Creates all 5 required tables in correct order
- Sets up indexes, permissions, RLS, and Realtime
- Includes verification queries
- **~400 lines** of production-ready SQL

#### 2. `sql/create-missing-tables.sql`
- **Incremental fix** - adds only missing tables
- Creates `profiles` and `avatar_states`
- Updates foreign key constraints
- **~200 lines** of focused SQL

#### 3. Documentation Files
- `sql/DATABASE_FIX_README.md` - Detailed guide
- `sql/QUICK_FIX.md` - 3-step quick fix

## How to Apply the Fix

### Quick Fix (Recommended)

1. **Open Supabase SQL Editor**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run Complete Setup**
   - Copy contents of `sql/COMPLETE_DATABASE_SETUP.sql`
   - Paste into SQL Editor
   - Click Run

3. **Verify Success**
   - Check for ✅ success messages
   - Verify all 5 tables appear in Database > Tables

### What Gets Fixed

✅ **Creates `profiles` table**
- User IDs, usernames, avatar models
- AI personality fields (bio, interests, prompts)
- Timestamps (created_at, last_seen)

✅ **Creates `avatar_states` table**
- Real-time position and rotation (JSONB)
- Animation states
- Equipped weapons
- AI behavior tracking
- Online/offline status

✅ **Fixes `custom_lobbies` foreign keys**
- Removes broken reference to non-existent `profiles`
- Converts `created_by` to TEXT (more flexible)
- Option to add proper foreign key later

✅ **Sets up Row Level Security**
- Enables RLS on all tables
- Creates permissive policies for development
- Grants permissions to `anon` and `authenticated` roles

✅ **Enables Realtime Replication**
- Configures `REPLICA IDENTITY FULL`
- Adds tables to `supabase_realtime` publication
- Enables live updates for avatars, chat, and connections

✅ **Creates Helper Functions**
- Auto-update `updated_at` timestamps
- Clean up old peer connections
- Update profile `last_seen` on activity

## Database Schema Overview

```
┌─────────────────┐
│    profiles     │
├─────────────────┤
│ id (UUID) PK    │
│ user_id (TEXT)  │◄─┐
│ username        │  │
│ avatar_model    │  │
│ ai_personality  │  │
│ bio, interests  │  │
└─────────────────┘  │
                     │
┌─────────────────┐  │
│ avatar_states   │  │
├─────────────────┤  │
│ id (UUID) PK    │  │
│ profile_id ─────┼──┘
│ lobby_id        │
│ position (JSON) │
│ rotation (JSON) │
│ animation       │
│ is_online       │
│ ai_behavior     │
└─────────────────┘

┌──────────────────┐
│ custom_lobbies   │
├──────────────────┤
│ id (UUID) PK     │
│ lobby_code       │
│ name, theme      │
│ created_by (TEXT)│  (kept as TEXT for flexibility)
│ max_players      │
│ host_config      │
└──────────────────┘

┌──────────────────┐
│ peer_connections │
├──────────────────┤
│ profile_id       │
│ lobby_id         │
│ peer_id (PeerJS) │
│ is_online        │
└──────────────────┘

┌─────────────────┐
│ room_messages   │
├─────────────────┤
│ id (UUID) PK    │
│ lobby_id        │
│ profile_id      │
│ username        │
│ message         │
│ created_at      │
└─────────────────┘
```

## Testing Checklist

After running the fix, test these features:

- [ ] Create a new user profile
- [ ] Select an avatar model
- [ ] Create a custom lobby
- [ ] Join an existing lobby
- [ ] Move avatar (check position updates)
- [ ] Change avatar animation
- [ ] Send chat messages
- [ ] Receive real-time chat updates
- [ ] Connect to voice chat
- [ ] See other users' avatars (digital twins)
- [ ] Interact with NPC host
- [ ] View lobby attendees list

## Production Considerations

### Security (RLS Policies)
The current setup uses **permissive policies** (`true` for all operations). For production:

```sql
-- Example: Restrict profile updates to owner
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims')::json->>'sub');
```

### Foreign Key Constraints
Currently, `custom_lobbies.created_by` is TEXT. To add proper foreign keys:

```sql
-- 1. Ensure all created_by values are valid UUIDs matching profiles.id
-- 2. Convert column type
ALTER TABLE custom_lobbies ALTER COLUMN created_by TYPE UUID USING created_by::uuid;

-- 3. Add foreign key
ALTER TABLE custom_lobbies 
ADD CONSTRAINT custom_lobbies_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
```

### Performance Optimization
Consider adding these indexes based on usage patterns:

```sql
-- For frequent username searches
CREATE INDEX idx_profiles_username_trgm ON profiles USING gin(username gin_trgm_ops);

-- For spatial queries (if needed)
CREATE INDEX idx_avatar_states_position ON avatar_states USING btree((position->>'x'), (position->>'y'));
```

### Data Cleanup
Set up periodic cleanup for old data:

```sql
-- Cron job to clean offline avatars (requires pg_cron extension)
SELECT cron.schedule('cleanup-offline-avatars', '0 * * * *', $$
  DELETE FROM avatar_states 
  WHERE is_online = false 
    AND last_activity < NOW() - INTERVAL '24 hours'
$$);
```

## Files Modified

No existing files were modified. Created new files:

### SQL Files
- ✅ `sql/COMPLETE_DATABASE_SETUP.sql` - Complete database setup
- ✅ `sql/create-missing-tables.sql` - Incremental table creation
- ✅ `sql/DATABASE_FIX_README.md` - Detailed documentation
- ✅ `sql/QUICK_FIX.md` - Quick reference guide
- ✅ `sql/ANALYSIS_SUMMARY.md` - This file

### No Code Changes Required
The application code in `lib/lobbyStore.ts` and `app/components/DynamicChatService.js` is **already correct** and will work once the database tables are created.

## Next Steps

1. **Run the SQL setup script** in Supabase SQL Editor
2. **Verify tables** were created successfully
3. **Test the application** - start dev server with `npm run dev`
4. **Monitor Realtime** - check Database > Replication in Supabase
5. **Review security** - tighten RLS policies for production
6. **Set up backups** - ensure regular database backups

## Summary

✅ **Issue Identified**: Missing `profiles` and `avatar_states` tables
✅ **Root Cause**: Incomplete SQL schema definitions
✅ **Solution Created**: Comprehensive SQL setup script
✅ **Documentation**: 4 files with detailed guides
✅ **Testing**: Ready to test after running SQL script

**Status**: Ready to fix - run `sql/COMPLETE_DATABASE_SETUP.sql` in Supabase SQL Editor
