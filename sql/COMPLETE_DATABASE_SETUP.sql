-- =====================================================================
-- COMPLETE DATABASE SETUP FOR ECHOSPACE
-- =====================================================================
-- This script sets up the entire database schema in the correct order
-- Run this in your Supabase SQL Editor to fix all missing table errors
-- =====================================================================
-- Order of operations:
-- 1. Create profiles table (must be first - referenced by other tables)
-- 2. Create avatar_states table   

-- 3. Create custom_lobbies table (references profiles)
-- 4. Create peer_connections table
-- 5. Create room_messages table
-- 6. Set up permissions and RLS policies
-- 7. Enable realtime replication
-- =====================================================================

-- =====================================================================
-- STEP 1: CREATE PROFILES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    selected_avatar_model TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    -- AI personality fields
    ai_personality_prompt TEXT,
    bio TEXT,
    interests TEXT[],
    preferred_greeting TEXT,
    personality_type TEXT,
    total_time_online INTEGER DEFAULT 0,
    favorite_lobby TEXT
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);

-- =====================================================================
-- STEP 2: CREATE AVATAR_STATES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS avatar_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id TEXT NOT NULL,
    lobby_id TEXT NOT NULL,
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
    rotation JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
    animation TEXT DEFAULT 'idle',
    equipped_weapon JSONB,
    is_online BOOLEAN DEFAULT true,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    ai_behavior TEXT DEFAULT 'idle' CHECK (ai_behavior IN ('idle', 'wander', 'patrol', 'talking')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, lobby_id)
);

CREATE INDEX IF NOT EXISTS idx_avatar_states_profile_id ON avatar_states(profile_id);
CREATE INDEX IF NOT EXISTS idx_avatar_states_lobby_id ON avatar_states(lobby_id);
CREATE INDEX IF NOT EXISTS idx_avatar_states_lobby_online ON avatar_states(lobby_id, is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_avatar_states_last_activity ON avatar_states(last_activity DESC);

-- =====================================================================
-- STEP 3: CREATE CUSTOM_LOBBIES TABLE
-- =====================================================================
-- Note: created_by kept as TEXT to avoid foreign key issues
-- You can convert to UUID later if needed
CREATE TABLE IF NOT EXISTS custom_lobbies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lobby_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    theme TEXT DEFAULT 'general',
    background_color TEXT,
    environment_image TEXT,
    max_players INTEGER DEFAULT 50 CHECK (max_players >= 2 AND max_players <= 1000),
    created_by TEXT NOT NULL,  -- TEXT instead of UUID to avoid foreign key issues
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_public BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    -- Host configuration fields
    host_uses_creator_profile BOOLEAN DEFAULT true NOT NULL,
    custom_host_name TEXT,
    custom_host_avatar TEXT,
    additional_host_knowledge TEXT
);

CREATE INDEX IF NOT EXISTS idx_custom_lobbies_lobby_code ON custom_lobbies(lobby_code);
CREATE INDEX IF NOT EXISTS idx_custom_lobbies_created_by ON custom_lobbies(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_lobbies_public ON custom_lobbies(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_custom_lobbies_created_at ON custom_lobbies(created_at DESC);

-- =====================================================================
-- STEP 4: CREATE PEER_CONNECTIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS peer_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id TEXT NOT NULL,
    lobby_id TEXT NOT NULL,
    peer_id TEXT NOT NULL,
    is_online BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, lobby_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_connections_lobby ON peer_connections(lobby_id, is_online, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_peer_connections_profile ON peer_connections(profile_id, is_online);

-- =====================================================================
-- STEP 5: CREATE ROOM_MESSAGES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS room_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lobby_id TEXT NOT NULL,
    profile_id TEXT,  -- TEXT to match profiles.user_id or can be null
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_messages_lobby_id ON room_messages(lobby_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON room_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_messages_lobby_time ON room_messages(lobby_id, created_at DESC);

-- =====================================================================
-- STEP 6: HELPER FUNCTIONS
-- =====================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for custom_lobbies
DROP TRIGGER IF EXISTS update_custom_lobbies_updated_at ON custom_lobbies;
CREATE TRIGGER update_custom_lobbies_updated_at
    BEFORE UPDATE ON custom_lobbies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for avatar_states
DROP TRIGGER IF EXISTS update_avatar_states_updated_at ON avatar_states;
CREATE TRIGGER update_avatar_states_updated_at
    BEFORE UPDATE ON avatar_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old peer connections
CREATE OR REPLACE FUNCTION cleanup_old_peer_connections()
RETURNS void AS $$
BEGIN
    DELETE FROM peer_connections
    WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- STEP 8: DROP EXISTING POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "Public access to profiles" ON profiles;
DROP POLICY IF EXISTS "Public access to avatar_states" ON avatar_states;
DROP POLICY IF EXISTS "Public access to custom_lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Public access to peer_connections" ON peer_connections;
DROP POLICY IF EXISTS "Public access to room_messages" ON room_messages;
DROP POLICY IF EXISTS "Anyone can view public lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Users can create lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Users can update own lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Users can delete own lobbies" ON custom_lobbies;

-- =====================================================================
-- STEP 9: CREATE PERMISSIVE POLICIES
-- =====================================================================
-- For development, we use permissive policies that allow all operations
-- You can make these more restrictive in production

CREATE POLICY "Public access to profiles" ON profiles
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to avatar_states" ON avatar_states
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to custom_lobbies" ON custom_lobbies
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to peer_connections" ON peer_connections
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to room_messages" ON room_messages
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- STEP 10: GRANT PERMISSIONS
-- =====================================================================
-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;

-- Explicitly grant on our tables
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON avatar_states TO anon, authenticated;
GRANT ALL ON custom_lobbies TO anon, authenticated;
GRANT ALL ON peer_connections TO anon, authenticated;
GRANT ALL ON room_messages TO anon, authenticated;

-- =====================================================================
-- STEP 11: ENABLE REALTIME REPLICATION
-- =====================================================================
-- Set replica identity to FULL for all realtime tables
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE avatar_states REPLICA IDENTITY FULL;
ALTER TABLE peer_connections REPLICA IDENTITY FULL;
ALTER TABLE room_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE avatar_states;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE avatar_states;

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE peer_connections;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE peer_connections;

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE room_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;

-- =====================================================================
-- STEP 12: VERIFICATION
-- =====================================================================
-- Check that all tables exist
DO $$
DECLARE
    tables_status TEXT := '';
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        tables_status := tables_status || '✅ profiles' || E'\n';
    ELSE
        tables_status := tables_status || '❌ profiles' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avatar_states') THEN
        tables_status := tables_status || '✅ avatar_states' || E'\n';
    ELSE
        tables_status := tables_status || '❌ avatar_states' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_lobbies') THEN
        tables_status := tables_status || '✅ custom_lobbies' || E'\n';
    ELSE
        tables_status := tables_status || '❌ custom_lobbies' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'peer_connections') THEN
        tables_status := tables_status || '✅ peer_connections' || E'\n';
    ELSE
        tables_status := tables_status || '❌ peer_connections' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_messages') THEN
        tables_status := tables_status || '✅ room_messages' || E'\n';
    ELSE
        tables_status := tables_status || '❌ room_messages' || E'\n';
    END IF;
    
    RAISE NOTICE E'\n=== TABLE CREATION STATUS ===\n%', tables_status;
END $$;

-- Check realtime status
SELECT 
    tablename,
    'Realtime enabled ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
    AND tablename IN ('profiles', 'avatar_states', 'peer_connections', 'room_messages', 'custom_lobbies')
ORDER BY tablename;

-- Summary query
SELECT 
    'Tables created' as info,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_name IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
    AND table_schema = 'public';
