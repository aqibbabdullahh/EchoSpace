-- =====================================================================
-- PRIVATE MESSAGING SYSTEM
-- =====================================================================
-- Creates infrastructure for real-time player-to-player direct messaging
-- Run this in Supabase SQL Editor
-- =====================================================================

-- 1. Create private_messages table
CREATE TABLE IF NOT EXISTS private_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_profile_id TEXT NOT NULL,
    to_profile_id TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    lobby_id TEXT NOT NULL  -- Track which lobby the conversation started in
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_private_messages_from ON private_messages(from_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_to ON private_messages(to_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(from_profile_id, to_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_unread ON private_messages(to_profile_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_private_messages_lobby ON private_messages(lobby_id, created_at DESC);  -- Filter by lobby
CREATE INDEX IF NOT EXISTS idx_private_messages_lobby_users ON private_messages(lobby_id, from_profile_id, to_profile_id, created_at DESC);  -- Lobby-scoped conversations

-- 3. Create active_chats table to track ongoing conversations
CREATE TABLE IF NOT EXISTS active_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id_1 TEXT NOT NULL,
    profile_id_2 TEXT NOT NULL,
    lobby_id TEXT NOT NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure unique chat between two users
    UNIQUE(profile_id_1, profile_id_2)
);

CREATE INDEX IF NOT EXISTS idx_active_chats_profile1 ON active_chats(profile_id_1, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_chats_profile2 ON active_chats(profile_id_2, last_message_at DESC);

-- 4. Function to get or create chat between two users
CREATE OR REPLACE FUNCTION get_or_create_chat(
    p_profile_id_1 TEXT,
    p_profile_id_2 TEXT,
    p_lobby_id TEXT
) RETURNS UUID AS $$
DECLARE
    v_chat_id UUID;
BEGIN
    -- Try to find existing chat (order-independent)
    SELECT id INTO v_chat_id
    FROM active_chats
    WHERE (profile_id_1 = p_profile_id_1 AND profile_id_2 = p_profile_id_2)
       OR (profile_id_1 = p_profile_id_2 AND profile_id_2 = p_profile_id_1);
    
    -- If not found, create new chat
    IF v_chat_id IS NULL THEN
        INSERT INTO active_chats (profile_id_1, profile_id_2, lobby_id)
        VALUES (p_profile_id_1, p_profile_id_2, p_lobby_id)
        RETURNING id INTO v_chat_id;
    ELSE
        -- Update last message time
        UPDATE active_chats
        SET last_message_at = NOW()
        WHERE id = v_chat_id;
    END IF;
    
    RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Enable RLS
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_chats ENABLE ROW LEVEL SECURITY;

-- 6. Create permissive policies for development
DROP POLICY IF EXISTS "Public access to private_messages" ON private_messages;
DROP POLICY IF EXISTS "Public access to active_chats" ON active_chats;

CREATE POLICY "Public access to private_messages" ON private_messages
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to active_chats" ON active_chats
    FOR ALL USING (true) WITH CHECK (true);

-- 7. Grant permissions
GRANT ALL ON private_messages TO anon, authenticated;
GRANT ALL ON active_chats TO anon, authenticated;

-- 8. Enable Realtime
ALTER TABLE private_messages REPLICA IDENTITY FULL;
ALTER TABLE active_chats REPLICA IDENTITY FULL;

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE private_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE active_chats;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE active_chats;

-- 9. Verification
SELECT 
    '✅ private_messages table created' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'private_messages'
);

SELECT 
    tablename,
    'Realtime enabled ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('private_messages', 'active_chats')
ORDER BY tablename;
