-- Waitlist for users when beta is full
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  language TEXT,
  level TEXT,
  goals TEXT[],
  interests TEXT[],
  ui_language TEXT DEFAULT 'pl',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ
);

CREATE INDEX idx_waitlist_created ON waitlist(created_at);

-- Magic link event tracking
CREATE TABLE IF NOT EXISTS magic_link_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL,
  name TEXT,
  ui_language TEXT DEFAULT 'pl',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  resend_email_id TEXT,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  follow_up_sent_at TIMESTAMPTZ,
  follow_up_resend_email_id TEXT
);

CREATE INDEX idx_mle_sent ON magic_link_events(sent_at) WHERE clicked_at IS NULL;
CREATE INDEX idx_mle_user ON magic_link_events(user_id);
CREATE INDEX idx_mle_email ON magic_link_events(email);
