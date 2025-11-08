-- =====================================================================
-- QUICK DATABASE VERIFICATION
-- =====================================================================
-- Run this in Supabase SQL Editor to check if database is set up correctly
-- =====================================================================

-- 1. Check if all required tables exist
SELECT 
    'Tables Check' as test,
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ PASS - All 5 tables exist'
        ELSE '❌ FAIL - Missing tables (found ' || COUNT(*) || ' of 5)'
    END as result
FROM information_schema.tables 
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')

UNION ALL

-- 2. Check if RLS is enabled on all tables
SELECT 
    'RLS Check' as test,
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ PASS - RLS enabled on all tables'
        ELSE '⚠️  WARNING - RLS not enabled on all tables'
    END as result
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
    AND rowsecurity = true

UNION ALL

-- 3. Check if RLS policies exist
SELECT 
    'RLS Policies' as test,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ PASS - RLS policies configured'
        ELSE '⚠️  WARNING - Missing RLS policies'
    END as result
FROM pg_policies
WHERE tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')

UNION ALL

-- 4. Check if Realtime is enabled
SELECT 
    'Realtime Check' as test,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ PASS - Realtime enabled on key tables'
        ELSE '❌ FAIL - Realtime not enabled (found ' || COUNT(*) || ' of 4)'
    END as result
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('profiles', 'avatar_states', 'peer_connections', 'room_messages')

UNION ALL

-- 5. Check permissions
SELECT 
    'Permissions' as test,
    CASE 
        WHEN COUNT(*) >= 10 THEN '✅ PASS - Permissions granted'
        ELSE '⚠️  WARNING - Some permissions may be missing'
    END as result
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
    AND grantee IN ('anon', 'authenticated');

-- =====================================================================
-- DETAILED TABLE LIST
-- =====================================================================
SELECT 
    '---' as "═════════════════════",
    'TABLES FOUND' as "═════════════════════";

SELECT 
    table_name as "Table Name",
    '✅' as "Status"
FROM information_schema.tables 
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
ORDER BY table_name;

-- =====================================================================
-- REALTIME STATUS
-- =====================================================================
SELECT 
    '---' as "═════════════════════",
    'REALTIME STATUS' as "═════════════════════";

SELECT 
    tablename as "Table",
    'Realtime enabled ✅' as "Status"
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('profiles', 'avatar_states', 'peer_connections', 'room_messages', 'custom_lobbies')
ORDER BY tablename;

-- =====================================================================
-- FINAL STATUS
-- =====================================================================
DO $$
DECLARE
    tables_count INTEGER;
    realtime_count INTEGER;
    policies_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public'
        AND table_name IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages');
    
    SELECT COUNT(*) INTO realtime_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename IN ('profiles', 'avatar_states', 'peer_connections', 'room_messages');
    
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies
    WHERE tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages');
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════';
    RAISE NOTICE '         DATABASE STATUS';
    RAISE NOTICE '════════════════════════════════════';
    RAISE NOTICE 'Tables:          %/5  %', tables_count, 
        CASE WHEN tables_count = 5 THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'RLS Policies:    %/5  %', policies_count,
        CASE WHEN policies_count >= 5 THEN '✅' ELSE '⚠️' END;
    RAISE NOTICE 'Realtime:        %/4  %', realtime_count,
        CASE WHEN realtime_count >= 4 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '════════════════════════════════════';
    
    IF tables_count = 5 AND realtime_count >= 4 AND policies_count >= 5 THEN
        RAISE NOTICE '✅ DATABASE IS READY TO USE!';
        RAISE NOTICE '';
        RAISE NOTICE 'You can now start your app with:';
        RAISE NOTICE '  npm run dev';
    ELSIF tables_count < 5 THEN
        RAISE NOTICE '❌ SETUP INCOMPLETE';
        RAISE NOTICE '';
        RAISE NOTICE 'Please run: COMPLETE_DATABASE_SETUP.sql';
    ELSE
        RAISE NOTICE '⚠️  CONFIGURATION INCOMPLETE';
        RAISE NOTICE '';
        RAISE NOTICE 'Tables exist but configuration needs attention.';
        RAISE NOTICE 'Check Realtime and RLS settings above.';
    END IF;
    RAISE NOTICE '';
END $$;
