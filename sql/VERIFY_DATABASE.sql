-- =====================================================================
-- VERIFICATION SCRIPT - Run this AFTER COMPLETE_DATABASE_SETUP.sql
-- =====================================================================
-- This script checks that all tables, indexes, permissions, and 
-- realtime replication are correctly configured
-- =====================================================================

\echo '================================'
\echo 'DATABASE VERIFICATION STARTED'
\echo '================================'
\echo ''

-- =====================================================================
-- 1. CHECK TABLE EXISTENCE
-- =====================================================================
\echo '=== 1. Checking Table Existence ==='

SELECT 
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ All 5 tables exist'
        ELSE '❌ Missing tables (expected 5, found ' || COUNT(*) || ')'
    END as table_check
FROM information_schema.tables 
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages');

-- List all tables
SELECT 
    '  ' || table_name as "Tables Found"
FROM information_schema.tables 
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
ORDER BY table_name;

\echo ''

-- =====================================================================
-- 2. CHECK TABLE STRUCTURES
-- =====================================================================
\echo '=== 2. Checking Table Structures ==='

-- Check profiles columns
SELECT 
    CASE 
        WHEN COUNT(*) >= 10 THEN '✅ profiles has all required columns'
        ELSE '❌ profiles missing columns'
    END as profiles_check
FROM information_schema.columns 
WHERE table_name = 'profiles'
    AND column_name IN ('id', 'user_id', 'username', 'selected_avatar_model', 'created_at', 'last_seen');

-- Check avatar_states columns
SELECT 
    CASE 
        WHEN COUNT(*) >= 8 THEN '✅ avatar_states has all required columns'
        ELSE '❌ avatar_states missing columns'
    END as avatar_states_check
FROM information_schema.columns 
WHERE table_name = 'avatar_states'
    AND column_name IN ('id', 'profile_id', 'lobby_id', 'position', 'rotation', 'animation', 'is_online');

-- Check custom_lobbies columns
SELECT 
    CASE 
        WHEN COUNT(*) >= 12 THEN '✅ custom_lobbies has all required columns'
        ELSE '❌ custom_lobbies missing columns'
    END as custom_lobbies_check
FROM information_schema.columns 
WHERE table_name = 'custom_lobbies'
    AND column_name IN ('id', 'lobby_code', 'name', 'description', 'created_by', 'max_players');

\echo ''

-- =====================================================================
-- 3. CHECK INDEXES
-- =====================================================================
\echo '=== 3. Checking Indexes ==='

SELECT 
    tablename as "Table",
    indexname as "Index Name",
    '✅' as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
ORDER BY tablename, indexname;

-- Count indexes per table
SELECT 
    tablename as "Table",
    COUNT(*) as "Index Count"
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- =====================================================================
-- 4. CHECK ROW LEVEL SECURITY (RLS)
-- =====================================================================
\echo '=== 4. Checking Row Level Security ==='

SELECT 
    schemaname,
    tablename as "Table",
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
ORDER BY tablename;

\echo ''

-- =====================================================================
-- 5. CHECK RLS POLICIES
-- =====================================================================
\echo '=== 5. Checking RLS Policies ==='

SELECT 
    tablename as "Table",
    policyname as "Policy Name",
    cmd as "Command",
    '✅' as status
FROM pg_policies
WHERE tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
ORDER BY tablename, policyname;

-- Count policies per table
SELECT 
    tablename as "Table",
    COUNT(*) as "Policy Count"
FROM pg_policies
WHERE tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- =====================================================================
-- 6. CHECK PERMISSIONS
-- =====================================================================
\echo '=== 6. Checking Table Permissions ==='

SELECT 
    table_name as "Table",
    grantee as "Role",
    string_agg(privilege_type, ', ') as "Privileges",
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅'
        ELSE '⚠️'
    END as status
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
    AND grantee IN ('anon', 'authenticated')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

\echo ''

-- =====================================================================
-- 7. CHECK REALTIME REPLICATION
-- =====================================================================
\echo '=== 7. Checking Realtime Replication ==='

SELECT 
    tablename as "Table",
    '✅ Realtime Enabled' as "Status"
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
ORDER BY tablename;

-- Count realtime tables
SELECT 
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ Realtime enabled on required tables (profiles, avatar_states, peer_connections, room_messages)'
        ELSE '❌ Some tables missing realtime replication (found ' || COUNT(*) || ' of 4 required)'
    END as realtime_check
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('profiles', 'avatar_states', 'peer_connections', 'room_messages');

\echo ''

-- =====================================================================
-- 8. CHECK REPLICA IDENTITY
-- =====================================================================
\echo '=== 8. Checking Replica Identity ==='

SELECT 
    c.relname as "Table",
    CASE c.relreplident
        WHEN 'd' THEN '⚠️ Default (not ideal for realtime)'
        WHEN 'n' THEN '❌ Nothing (realtime will fail)'
        WHEN 'f' THEN '✅ Full (optimal for realtime)'
        WHEN 'i' THEN '⚠️ Index'
    END as "Replica Identity"
FROM pg_class c
WHERE c.relname IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
    AND c.relnamespace = 'public'::regnamespace
ORDER BY c.relname;

\echo ''

-- =====================================================================
-- 9. CHECK TRIGGERS AND FUNCTIONS
-- =====================================================================
\echo '=== 9. Checking Triggers and Functions ==='

-- Check functions
SELECT 
    routine_name as "Function",
    '✅' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
    AND routine_name IN ('update_updated_at_column', 'cleanup_old_peer_connections', 'update_profile_last_seen')
ORDER BY routine_name;

-- Check triggers
SELECT 
    trigger_name as "Trigger",
    event_object_table as "On Table",
    '✅' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table IN ('avatar_states', 'custom_lobbies')
ORDER BY event_object_table, trigger_name;

\echo ''

-- =====================================================================
-- 10. CHECK CONSTRAINTS
-- =====================================================================
\echo '=== 10. Checking Constraints ==='

SELECT 
    tc.table_name as "Table",
    tc.constraint_name as "Constraint",
    tc.constraint_type as "Type",
    '✅' as status
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages')
    AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'CHECK', 'FOREIGN KEY')
ORDER BY tc.table_name, tc.constraint_type;

\echo ''

-- =====================================================================
-- 11. SUMMARY
-- =====================================================================
\echo '=== 11. Summary ==='

DO $$
DECLARE
    tables_count INTEGER;
    indexes_count INTEGER;
    policies_count INTEGER;
    realtime_count INTEGER;
    functions_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public'
        AND table_name IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages');
    
    -- Count indexes
    SELECT COUNT(*) INTO indexes_count
    FROM pg_indexes
    WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages');
    
    -- Count policies
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies
    WHERE tablename IN ('profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages');
    
    -- Count realtime tables
    SELECT COUNT(*) INTO realtime_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename IN ('profiles', 'avatar_states', 'peer_connections', 'room_messages');
    
    -- Count functions
    SELECT COUNT(*) INTO functions_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        AND routine_name IN ('update_updated_at_column', 'cleanup_old_peer_connections', 'update_profile_last_seen');
    
    RAISE NOTICE '';
    RAISE NOTICE '================================';
    RAISE NOTICE 'VERIFICATION SUMMARY';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Tables created:        %/5', tables_count;
    RAISE NOTICE 'Indexes created:       %', indexes_count;
    RAISE NOTICE 'RLS policies:          %/5', policies_count;
    RAISE NOTICE 'Realtime tables:       %/4', realtime_count;
    RAISE NOTICE 'Helper functions:      %/3', functions_count;
    RAISE NOTICE '';
    
    IF tables_count = 5 AND policies_count >= 5 AND realtime_count >= 4 AND functions_count >= 3 THEN
        RAISE NOTICE '✅ ALL CHECKS PASSED - Database is ready!';
    ELSIF tables_count = 5 THEN
        RAISE NOTICE '⚠️  Tables exist but some configuration may be incomplete';
        RAISE NOTICE '   Check RLS policies and realtime settings above';
    ELSE
        RAISE NOTICE '❌ SETUP INCOMPLETE - Please run COMPLETE_DATABASE_SETUP.sql';
    END IF;
    RAISE NOTICE '';
END $$;

-- =====================================================================
-- 12. QUICK TEST
-- =====================================================================
\echo '=== 12. Testing Insert Permissions ==='

-- Test if we can insert (will rollback immediately)
DO $$
BEGIN
    -- Try to insert a test profile (will be rolled back)
    BEGIN
        INSERT INTO profiles (user_id, username, selected_avatar_model)
        VALUES ('test-user-verification', 'TestUser', 'test-avatar.vrm');
        
        RAISE NOTICE '✅ Insert test successful (rolling back)';
        
        ROLLBACK;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert test failed: %', SQLERRM;
        ROLLBACK;
    END;
END $$;

\echo ''
\echo '================================'
\echo 'VERIFICATION COMPLETE'
\echo '================================'
\echo ''
\echo 'If all checks passed, your database is ready to use!'
\echo 'Start your Next.js app with: npm run dev'
\echo ''
