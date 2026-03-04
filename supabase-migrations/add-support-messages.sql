-- Support chat messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  sender text NOT NULL CHECK (sender IN ('user', 'admin')),
  message text NOT NULL,
  telegram_message_id integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_session_idx ON support_messages(session_id);
CREATE INDEX IF NOT EXISTS support_messages_created_idx ON support_messages(created_at);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read messages" ON support_messages
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert messages" ON support_messages
  FOR INSERT WITH CHECK (true);
