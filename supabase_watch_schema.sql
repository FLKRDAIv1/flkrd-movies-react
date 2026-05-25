-- ============================================================
-- Supabase Schema: Synchronized Co-Watching & Ticketing System
-- ============================================================
-- Run this SQL script in your Supabase Dashboard SQL Editor.
-- This sets up the tables and enables real-time broadcasts.

-- 1. Create Watch Tickets Table
CREATE TABLE IF NOT EXISTS watch_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id TEXT NOT NULL,
    host_id UUID NOT NULL,
    guest_id UUID,
    pin_code VARCHAR(4) NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Room Messages Table
CREATE TABLE IF NOT EXISTS room_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES watch_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Disable Row Level Security (RLS) for Anonymous Access
-- Since there is no authentication in the app, disabling RLS allows anonymous
-- guest and host clients to perform queries, inserts, and updates directly.
ALTER TABLE watch_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages DISABLE ROW LEVEL SECURITY;

-- Note: If you prefer to keep RLS active but grant open anonymous permissions, 
-- you can uncomment the following block:
/*
ALTER TABLE watch_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read/write access to watch_tickets" 
ON watch_tickets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read/write access to room_messages" 
ON room_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
*/

-- 4. Enable Supabase Realtime for both tables
-- Adds the tables to the default Supabase Realtime publication.
BEGIN;
  -- Remove tables if already registered, to avoid duplicates
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS watch_tickets, room_messages;
  
  -- Add tables to realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE watch_tickets;
  ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
COMMIT;
