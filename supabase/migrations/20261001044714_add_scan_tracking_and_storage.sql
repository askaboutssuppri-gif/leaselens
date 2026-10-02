/*
# LeaseLens — Add scan tracking, lease summary, and storage bucket

## Changes

### profiles table
- Added `paid_scans_date` (date): tracks which day the paid daily counter applies to.
  When the date changes, the counter resets.
- Added `paid_scans_used_today` (int, default 0): number of paid scans used today
  (max 10/day for Pro users).

### leases table
- Added `summary` (text): AI-generated 2-3 sentence overview of the lease.
- Added `state_notes` (text[]): array of state-specific tenant protection notes.

### Storage
- Created `lease-pages` bucket (private) for uploading lease page images and PDFs.
- Added storage policies: authenticated users can CRUD files under their own
  user_id prefix only.

## Security
- RLS already enabled on profiles and leases; new columns inherit existing policies.
- Storage policies scope access by matching the first path segment to auth.uid().
*/

-- Add paid scan tracking columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paid_scans_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paid_scans_used_today int NOT NULL DEFAULT 0;

-- Add summary and state_notes columns to leases
ALTER TABLE leases ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS state_notes text[];

-- Create storage bucket for lease page images and PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('lease-pages', 'lease-pages', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only access their own folder
-- Path format: <user_id>/<lease_id>/<filename>
DROP POLICY IF EXISTS "select_own_lease_files" ON storage.objects;
CREATE POLICY "select_own_lease_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lease-pages' AND strpos(name, auth.uid()::text || '/') = 1);

DROP POLICY IF EXISTS "insert_own_lease_files" ON storage.objects;
CREATE POLICY "insert_own_lease_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lease-pages' AND strpos(name, auth.uid()::text || '/') = 1);

DROP POLICY IF EXISTS "update_own_lease_files" ON storage.objects;
CREATE POLICY "update_own_lease_files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lease-pages' AND strpos(name, auth.uid()::text || '/') = 1)
  WITH CHECK (bucket_id = 'lease-pages' AND strpos(name, auth.uid()::text || '/') = 1);

DROP POLICY IF EXISTS "delete_own_lease_files" ON storage.objects;
CREATE POLICY "delete_own_lease_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lease-pages' AND strpos(name, auth.uid()::text || '/') = 1);