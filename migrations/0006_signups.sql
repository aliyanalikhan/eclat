-- Email list. welcome_sent_at NULL means the welcome email is still owed.
CREATE TABLE IF NOT EXISTS signups (
  email TEXT PRIMARY KEY,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  welcome_sent_at TIMESTAMPTZ
);
