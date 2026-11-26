-- Eclat's email list. Its own table: ladidier-db already holds a "signups"
-- table with a different shape (used by another site), which stays untouched.
-- welcome_sent_at NULL means the welcome email is still owed.
CREATE TABLE IF NOT EXISTS eclat_signups (
  email TEXT PRIMARY KEY,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  welcome_sent_at TIMESTAMPTZ
);
