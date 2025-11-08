-- =====================================================================
-- ADD LOBBY-BASED INDEXES TO PRIVATE_MESSAGES
-- =====================================================================
-- Run this in Supabase SQL Editor to optimize lobby-scoped queries
-- =====================================================================

-- Add index for filtering messages by lobby
CREATE INDEX IF NOT EXISTS idx_private_messages_lobby 
ON private_messages(lobby_id, created_at DESC);

-- Add composite index for lobby-scoped conversations between two users
CREATE INDEX IF NOT EXISTS idx_private_messages_lobby_users 
ON private_messages(lobby_id, from_profile_id, to_profile_id, created_at DESC);

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'private_messages'
    AND indexname LIKE '%lobby%'
ORDER BY indexname;

-- Show sample query performance (optional - for testing)
EXPLAIN ANALYZE
SELECT * 
FROM private_messages
WHERE lobby_id = 'test-lobby'
  AND ((from_profile_id = 'user1' AND to_profile_id = 'user2')
    OR (from_profile_id = 'user2' AND to_profile_id = 'user1'))
ORDER BY created_at DESC
LIMIT 50;
