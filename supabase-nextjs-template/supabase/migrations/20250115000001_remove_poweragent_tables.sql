-- Remove all PowerAgent tables and related objects
-- Drop in reverse dependency order to avoid foreign key constraint violations

-- Drop tables that reference other PowerAgent tables first
DROP TABLE IF EXISTS poweragent_agent_toolkits CASCADE;
DROP TABLE IF EXISTS poweragent_agent_tools CASCADE;
DROP TABLE IF EXISTS poweragent_toolkit_tools CASCADE;
DROP TABLE IF EXISTS poweragent_memory_messages CASCADE;
DROP TABLE IF EXISTS poweragent_memory_agent_history_steps CASCADE;
DROP TABLE IF EXISTS poweragent_memory_agent_history_timeline_events CASCADE;
DROP TABLE IF EXISTS poweragent_memory_agent_history CASCADE;
DROP TABLE IF EXISTS poweragent_memory CASCADE;
DROP TABLE IF EXISTS poweragent_metrics CASCADE;

-- Drop conversation tables
DROP TABLE IF EXISTS poweragent_memory_conversations_migration_flags CASCADE;
DROP TABLE IF EXISTS poweragent_memory_conversations CASCADE;

-- Drop main entity tables
DROP TABLE IF EXISTS poweragent_agents CASCADE;
DROP TABLE IF EXISTS poweragent_toolkits CASCADE;
DROP TABLE IF EXISTS poweragent_tools CASCADE;

-- Drop any views that might reference PowerAgent tables
DROP VIEW IF EXISTS poweragent_memory_with_agent CASCADE;

-- Drop any functions that might be related to PowerAgent
DROP FUNCTION IF EXISTS update_poweragent_memory_updated_at() CASCADE;

-- Drop any triggers that might be related to PowerAgent
-- (These would be automatically dropped with the tables, but listing for completeness)

-- Drop any indexes that might still exist
-- (These would be automatically dropped with the tables)

-- Drop any sequences that might be related to PowerAgent
-- (These would be automatically dropped with the tables if they used serial/bigserial) 