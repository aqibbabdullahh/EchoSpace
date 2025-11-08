-- =====================================================================
-- VERIFY LOBBY-SCOPED MESSAGING SETUP
-- =====================================================================
-- Run this to verify your database is configured correctly
-- =====================================================================

-- 1. Check if private_messages table exists with lobby_id column
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'private_messages'
ORDER BY ordinal_position;

-- 2. Check indexes on private_messages
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'private_messages'
ORDER BY indexname;

-- 3. Check if realtime is enabled
SELECT 
    tablename,
    'Realtime enabled ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND tablename = 'private_messages';

-- 4. Check sample data (if any exists)
SELECT 
    lobby_id,
    from_profile_id,
    to_profile_id,
    LEFT(message, 50) as message_preview,
    created_at
FROM private_messages
ORDER BY created_at DESC
LIMIT 10;

-- 5. Count messages per lobby
SELECT 
    lobby_id,
    COUNT(*) as message_count,
    MAX(created_at) as latest_message
FROM private_messages
GROUP BY lobby_id
ORDER BY message_count DESC;

-- 6. Expected output:
-- ✅ private_messages table should have: id, from_profile_id, to_profile_id, message, is_read, created_at, lobby_id
-- ✅ Should have indexes: idx_private_messages_lobby, idx_private_messages_lobby_users
-- ✅ Realtime should be enabled
