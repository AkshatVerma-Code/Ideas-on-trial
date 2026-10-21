-- Ideas on Trial Quiz Platform - Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Settings table (key-value store for quiz configuration)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('quiz_open', 'false'),
  ('default_timer_seconds', '30'),
  ('quiz_title', 'Ideas on Trial - Round 0'),
  ('quiz_subtitle', 'The Startup Courtroom Quiz')
ON CONFLICT (key) DO NOTHING;

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  timer_seconds INTEGER NOT NULL DEFAULT 30,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Options table
CREATE TABLE IF NOT EXISTS options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  text TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1 AND weight <= 10),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registered teams (only these teams can participate)
CREATE TABLE IF NOT EXISTS registered_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_name TEXT NOT NULL UNIQUE,
  team_name_normalized TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert allowed teams
INSERT INTO registered_teams (team_name, team_name_normalized) VALUES
  ('TFS', 'tfs'),
  ('Chaotic Coders', 'chaotic coders'),
  ('smogOps', 'smogops'),
  ('innovelle', 'innovelle'),
  ('Sagestack', 'sagestack'),
  ('Raj Gupta', 'raj gupta'),
  ('JMD', 'jmd'),
  ('Seedhe Maut', 'seedhe maut'),
  ('Mario Bros', 'mario bros'),
  ('Razers', 'razers'),
  ('Mind over model', 'mind over model'),
  ('Chole Bhature', 'chole bhature'),
  ('Code Blood', 'code blood'),
  ('Voltbridge', 'voltbridge')
ON CONFLICT (team_name) DO NOTHING;
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_name TEXT NOT NULL UNIQUE,
  team_name_normalized TEXT NOT NULL UNIQUE, -- lowercase, trimmed for dedup
  fingerprint TEXT, -- browser fingerprint for extra security
  ip_address TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_score INTEGER DEFAULT 0,
  session_token TEXT UNIQUE NOT NULL
);

-- Answers table
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  option_id UUID REFERENCES options(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER, -- how long they took to answer
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, question_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_participant_id ON answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_participants_session_token ON participants(session_token);
CREATE INDEX IF NOT EXISTS idx_participants_team_name_normalized ON participants(team_name_normalized);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE registered_teams ENABLE ROW LEVEL SECURITY;

-- Public can read questions, options, settings (for quiz display)
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Public read options" ON options FOR SELECT USING (true);

-- Public can read registered teams (for registration validation)
CREATE POLICY "Public read registered teams" ON registered_teams FOR SELECT USING (true);

-- Participants can insert themselves
CREATE POLICY "Public insert participants" ON participants FOR INSERT WITH CHECK (true);

-- Participants can read their own record (by session_token)
CREATE POLICY "Participants read own" ON participants FOR SELECT
  USING (session_token = current_setting('request.jwt.claims', true)::jsonb->>'session_token');

-- Participants can update their own record
CREATE POLICY "Participants update own" ON participants FOR UPDATE
  USING (session_token = current_setting('request.jwt.claims', true)::jsonb->>'session_token');

-- Participants can insert answers
CREATE POLICY "Public insert answers" ON answers FOR INSERT WITH CHECK (true);

-- Participants can read their own answers
CREATE POLICY "Participants read own answers" ON answers FOR SELECT
  USING (participant_id = (
    SELECT id FROM participants
    WHERE session_token = current_setting('request.jwt.claims', true)::jsonb->>'session_token'
    LIMIT 1
  ));

-- Service role (admin) can do everything - handled by service role key in API routes
