/*
# LeaseLens — Initial Database Schema

Creates the core tables for the LeaseLens app: a lease-scanning tool that helps
renters understand and negotiate their lease agreements.

## Tables Created

1. **profiles** — One row per authenticated user, keyed to auth.users(id).
   - state_code: US state where the user rents (2-letter code, e.g. "CA")
   - free_scans_used: counter for the free-tier scan limit (default 0)
   - lease_end_date: optional date used for renewal reminders
   - renewal_reminder_sent: flag to avoid duplicate reminders (default false)

2. **leases** — A lease document uploaded/scanned by a user.
   - user_id: owner (defaults to auth.uid())
   - title: user-facing label for the lease
   - page_count: number of pages in the document
   - raw_pdf_path: storage path to the uploaded PDF
   - health_score: 0–100 computed score (nullable until analysis completes)

3. **findings** — Individual flagged clauses within a lease.
   - lease_id: FK to leases(id) with cascade delete
   - severity: 'high' | 'medium' | 'low'
   - category: e.g. "Rent", "Pets", "Termination"
   - clause_text: the verbatim lease text
   - plain_english: simplified explanation
   - why_it_matters: why the renter should care
   - negotiation_tip: actionable advice

4. **key_terms** — Extracted structured terms, one row per lease.
   - lease_id: FK to leases(id), unique (one set of terms per lease)
   - monthly_rent, deposit: numeric values (nullable)
   - lease_start, lease_end: dates (nullable)
   - late_fee: text (varies in format across leases)
   - notice_period_days: integer days for move-out notice
   - pet_policy, utilities_included: text descriptions

5. **subscriptions** — In-app subscription / purchase state.
   - user_id: owner (defaults to auth.uid())
   - status: 'active' | 'expired' | 'canceled'
   - plan: 'free' | 'pro'
   - expires_at: timestamp when the current period ends

## Security (RLS)

All tables have RLS enabled. Policies are owner-scoped (auth.uid() = user_id) for
all CRUD operations, scoped to `authenticated` since this app requires sign-in.
The `profiles` table uses `auth.uid() = id` since its primary key IS the user id.
Child tables (findings, key_terms) verify ownership through their parent lease.
*/

-- === profiles ===
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state_code text,
  free_scans_used int NOT NULL DEFAULT 0,
  lease_end_date date,
  renewal_reminder_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- === leases ===
CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  page_count int,
  raw_pdf_path text,
  health_score int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_leases" ON leases;
CREATE POLICY "select_own_leases" ON leases FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_leases" ON leases;
CREATE POLICY "insert_own_leases" ON leases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_leases" ON leases;
CREATE POLICY "update_own_leases" ON leases FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_leases" ON leases;
CREATE POLICY "delete_own_leases" ON leases FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === findings ===
CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  category text NOT NULL,
  clause_text text NOT NULL,
  plain_english text NOT NULL,
  why_it_matters text NOT NULL,
  negotiation_tip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_findings" ON findings;
CREATE POLICY "select_own_findings" ON findings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM leases WHERE leases.id = findings.lease_id AND leases.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_findings" ON findings;
CREATE POLICY "insert_own_findings" ON findings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM leases WHERE leases.id = findings.lease_id AND leases.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_findings" ON findings;
CREATE POLICY "update_own_findings" ON findings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM leases WHERE leases.id = findings.lease_id AND leases.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM leases WHERE leases.id = findings.lease_id AND leases.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_findings" ON findings;
CREATE POLICY "delete_own_findings" ON findings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM leases WHERE leases.id = findings.lease_id AND leases.user_id = auth.uid())
  );

-- === key_terms ===
CREATE TABLE IF NOT EXISTS key_terms (
  lease_id uuid PRIMARY KEY REFERENCES leases(id) ON DELETE CASCADE,
  monthly_rent numeric,
  deposit numeric,
  lease_start date,
  lease_end date,
  late_fee text,
  notice_period_days int,
  pet_policy text,
  utilities_included text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE key_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_key_terms" ON key_terms;
CREATE POLICY "select_own_key_terms" ON key_terms FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM leases WHERE leases.id = key_terms.lease_id AND leases.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_key_terms" ON key_terms;
CREATE POLICY "insert_own_key_terms" ON key_terms FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM leases WHERE leases.id = key_terms.lease_id AND leases.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_key_terms" ON key_terms;
CREATE POLICY "update_own_key_terms" ON key_terms FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM leases WHERE leases.id = key_terms.lease_id AND leases.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM leases WHERE leases.id = key_terms.lease_id AND leases.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_key_terms" ON key_terms;
CREATE POLICY "delete_own_key_terms" ON key_terms FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM leases WHERE leases.id = key_terms.lease_id AND leases.user_id = auth.uid())
  );

-- === subscriptions ===
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'canceled')),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscription" ON subscriptions;
CREATE POLICY "select_own_subscription" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscription" ON subscriptions;
CREATE POLICY "insert_own_subscription" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscription" ON subscriptions;
CREATE POLICY "update_own_subscription" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_subscription" ON subscriptions;
CREATE POLICY "delete_own_subscription" ON subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === Indexes ===
CREATE INDEX IF NOT EXISTS idx_leases_user_id ON leases(user_id);
CREATE INDEX IF NOT EXISTS idx_findings_lease_id ON findings(lease_id);