-- =====================================================================
-- DEBUG REAL-TIME SYNC ISSUES
-- =====================================================================
-- Run this in Supabase SQL Editor to check configuration
-- =====================================================================

-- 1. Check if Realtime is enabled
SELECT 
    '=== REALTIME STATUS ===' as info;
    
SELECT 
    tablename,
    'Realtime enabled ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('profiles', 'avatar_states', 'peer_connections', 'room_messages')
ORDER BY tablename;

-- 2. Check replica identity
SELECT 
    '=== REPLICA IDENTITY ===' as info;

SELECT 
    c.relname as table_name,
    CASE c.relreplident
        WHEN 'd' THEN '⚠️ Default (may not work for realtime)'
        WHEN 'n' THEN '❌ Nothing (realtime will fail)'
        WHEN 'f' THEN '✅ Full (optimal for realtime)'
        WHEN 'i' THEN '⚠️ Index'
    END as replica_identity
FROM pg_class c
WHERE c.relname IN ('profiles', 'avatar_states', 'room_messages')
    AND c.relnamespace = 'public'::regnamespace
ORDER BY c.relname;

-- 3. Check RLS policies
SELECT 
    '=== RLS POLICIES ===' as info;

SELECT 
    tablename,
    policyname,
    cmd as command,
    CASE 
        WHEN qual = 'true'::text::pg_node_tree THEN '✅ Permissive (true)'
        ELSE '⚠️ Restrictive'
    END as policy_type
FROM pg_policies
WHERE tablename IN ('profiles', 'avatar_states', 'room_messages')
ORDER BY tablename, policyname;

-- 4. Check table structure
SELECT 
    '=== AVATAR_STATES COLUMNS ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'avatar_states'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check if there's any data
SELECT 
    '=== DATA CHECK ===' as info;

SELECT 
    'profiles' as table_name,
    COUNT(*) as row_count
FROM profiles
UNION ALL
SELECT 
    'avatar_states',
    COUNT(*)
FROM avatar_states
UNION ALL
SELECT 
    'room_messages',
    COUNT(*)
FROM room_messages;

-- 6. Check for UNIQUE constraint on avatar_states
SELECT 
    '=== CONSTRAINTS ===' as info;

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('avatar_states', 'profiles')
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;
