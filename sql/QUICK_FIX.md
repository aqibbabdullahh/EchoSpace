# Quick Fix Guide - "profiles does not exist" Error

## The Problem
```
Error: Failed to run sql query: ERROR: 42P01: relation "profiles" does not exist
```

## The Solution (3 Steps)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Click **SQL Editor** in the sidebar
3. Click **New Query**

### Step 2: Copy & Run the Complete Setup
Copy the entire contents of the file:
```
sql/COMPLETE_DATABASE_SETUP.sql
```

Paste it into the SQL Editor and click **Run**.

### Step 3: Verify Success
Look for this in the output:
```
✅ profiles
✅ avatar_states
✅ custom_lobbies
✅ peer_connections
✅ room_messages
```

## Done! 🎉

Your database now has all required tables:
- ✅ `profiles` - User information
- ✅ `avatar_states` - Avatar positions & states
- ✅ `custom_lobbies` - User-created rooms
- ✅ `peer_connections` - Voice chat connections
- ✅ `room_messages` - Chat history

All tables are configured with:
- ✅ Proper indexes for performance
- ✅ Row Level Security (RLS) enabled
- ✅ Realtime replication for live updates
- ✅ Permissions for anonymous and authenticated users

## Test Your App

```bash
npm run dev
```

Try:
1. Creating a profile
2. Joining a lobby
3. Moving your avatar
4. Sending chat messages
5. Using voice chat

Everything should work now!

## Need Help?

See `sql/DATABASE_FIX_README.md` for:
- Detailed explanation
- Table schemas
- Troubleshooting steps
- Production security tips

## Alternative: Incremental Fix

If you only want to add the missing tables:
1. Run `sql/create-missing-tables.sql` instead
2. This adds only `profiles` and `avatar_states`
3. Other tables may already exist in your database
