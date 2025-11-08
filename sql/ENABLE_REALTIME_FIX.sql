-- =====================================================================
-- ENABLE REALTIME FOR EXISTING TABLES
-- =====================================================================
-- Run this in Supabase SQL Editor to fix real-time sync issues
-- =====================================================================

-- 1. Set replica identity to FULL (required for realtime)
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE avatar_states REPLICA IDENTITY FULL;
ALTER TABLE peer_connections REPLICA IDENTITY FULL;
ALTER TABLE room_messages REPLICA IDENTITY FULL;
ALTER TABLE custom_lobbies REPLICA IDENTITY FULL;

-- 2. Add tables to realtime publication
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

-- 3. Verify realtime is enabled
SELECT 
    tablename,
    '✅ Realtime enabled' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('profiles', 'avatar_states', 'peer_connections', 'room_messages')
ORDER BY tablename;

-- Expected result: You should see all 4 tables listed
