-- =====================================================================
-- CREATE MISSING TABLES: profiles and avatar_states
-- =====================================================================
-- This script creates the missing tables that are referenced throughout
-- the application but were not defined in the schema files.
-- =====================================================================

-- =====================================================================
-- 1. CREATE PROFILES TABLE
-- =====================================================================
-- This table stores user profile information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,  -- User identifier (can be session-based or auth-based)
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);

-- =====================================================================
-- 2. CREATE AVATAR_STATES TABLE
-- =====================================================================
-- This table stores real-time avatar state (position, rotation, etc.)
CREATE TABLE IF NOT EXISTS avatar_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id TEXT NOT NULL,  -- Changed from UUID to TEXT to match usage
    lobby_id TEXT NOT NULL,
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
    rotation JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
    animation TEXT DEFAULT 'idle',
    equipped_weapon JSONB,  -- { id, name, model, type }
    is_online BOOLEAN DEFAULT true,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    ai_behavior TEXT DEFAULT 'idle' CHECK (ai_behavior IN ('idle', 'wander', 'patrol', 'talking')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, lobby_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_avatar_states_profile_id ON avatar_states(profile_id);
CREATE INDEX IF NOT EXISTS idx_avatar_states_lobby_id ON avatar_states(lobby_id);
CREATE INDEX IF NOT EXISTS idx_avatar_states_lobby_online ON avatar_states(lobby_id, is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_avatar_states_last_activity ON avatar_states(last_activity DESC);

-- =====================================================================
-- 3. UPDATE CUSTOM_LOBBIES FOREIGN KEY
-- =====================================================================
-- Now that profiles table exists, we can safely create the foreign key
-- But first drop it if it exists (might be TEXT type currently)
DO $$ 
BEGIN
    -- Drop foreign key if it exists
    ALTER TABLE custom_lobbies DROP CONSTRAINT IF EXISTS custom_lobbies_created_by_fkey;
    
    -- Ensure created_by column is UUID type
    -- Note: This will fail if there's existing non-UUID data
    -- In that case, you'll need to migrate the data first
    BEGIN
        ALTER TABLE custom_lobbies ALTER COLUMN created_by TYPE UUID USING created_by::uuid;
    EXCEPTION WHEN OTHERS THEN
        -- If conversion fails, it means data is not UUID compatible
        -- Keep as TEXT for now
        RAISE NOTICE 'created_by column kept as TEXT - contains non-UUID data';
    END;
    
    -- Only add foreign key if created_by is UUID type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'custom_lobbies' 
        AND column_name = 'created_by' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE custom_lobbies 
        ADD CONSTRAINT custom_lobbies_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================================
-- Enable RLS but with permissive policies for development
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public access to profiles" ON profiles;
DROP POLICY IF EXISTS "Public access to avatar_states" ON avatar_states;

-- Create permissive policies (allow all operations)
CREATE POLICY "Public access to profiles" ON profiles
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to avatar_states" ON avatar_states
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 5. GRANT PERMISSIONS
-- =====================================================================
-- Grant permissions to anon and authenticated roles
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON avatar_states TO anon, authenticated;

-- =====================================================================
-- 6. ENABLE REALTIME REPLICATION
-- =====================================================================
-- Enable realtime for live updates
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE profiles;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if table not in publication
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE avatar_states;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if table not in publication
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE avatar_states;

-- Set replica identity to FULL for realtime tracking
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE avatar_states REPLICA IDENTITY FULL;

-- =====================================================================
-- 7. CREATE HELPER FUNCTIONS
-- =====================================================================
-- Function to update last_seen timestamp on profiles
CREATE OR REPLACE FUNCTION update_profile_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles 
    SET last_seen = NOW() 
    WHERE id = NEW.profile_id::uuid;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If profile_id is not a valid UUID, skip update
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen when avatar_state changes
DROP TRIGGER IF EXISTS trigger_update_profile_last_seen ON avatar_states;
CREATE TRIGGER trigger_update_profile_last_seen
    AFTER INSERT OR UPDATE ON avatar_states
    FOR EACH ROW
    WHEN (NEW.is_online = true)
    EXECUTE FUNCTION update_profile_last_seen();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for avatar_states updated_at
DROP TRIGGER IF EXISTS update_avatar_states_updated_at ON avatar_states;
CREATE TRIGGER update_avatar_states_updated_at
    BEFORE UPDATE ON avatar_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 8. VERIFICATION
-- =====================================================================
-- Run this to verify tables were created successfully
DO $$
DECLARE
    profiles_exists BOOLEAN;
    avatar_states_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles'
    ) INTO profiles_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'avatar_states'
    ) INTO avatar_states_exists;
    
    IF profiles_exists THEN
        RAISE NOTICE '✅ profiles table created successfully';
    ELSE
        RAISE WARNING '❌ profiles table creation failed';
    END IF;
    
    IF avatar_states_exists THEN
        RAISE NOTICE '✅ avatar_states table created successfully';
    ELSE
        RAISE WARNING '❌ avatar_states table creation failed';
    END IF;
END $$;

-- Query to check realtime status
SELECT 
    tablename,
    schemaname,
    'Realtime enabled ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
    AND tablename IN ('profiles', 'avatar_states')
ORDER BY tablename;
