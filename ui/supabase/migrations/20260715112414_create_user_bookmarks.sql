/*
# Create user_bookmarks table for cloud bookmark sync

1. New Tables
- `user_bookmarks`: stores each signed-in user's full bookmark library as a JSON blob,
  one row per user. The entire collection (bookmarks, categories, collections, tags)
  is stored as a single JSON `data` column so the client can sync the whole library
  in one round-trip without a complex relational schema for this prototype.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users with cascade delete)
  - `data` (jsonb, not null) — the full library payload
  - `updated_at` (timestamptz, defaults to now, auto-updated on change)
2. Security
- Enable RLS on `user_bookmarks`.
- Owner-scoped CRUD: each authenticated user can only read/write their own row.
- Four separate policies (SELECT/INSERT/UPDATE/DELETE), all scoped TO authenticated
  with auth.uid() = user_id ownership checks.
3. Notes
- This is a single-row-per-user design. The client upserts its entire library on save.
- The `DEFAULT auth.uid()` on user_id lets an insert that omits user_id still satisfy
  the INSERT policy's WITH CHECK.
*/

CREATE TABLE IF NOT EXISTS user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookmarks" ON user_bookmarks;
CREATE POLICY "select_own_bookmarks"
  ON user_bookmarks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bookmarks" ON user_bookmarks;
CREATE POLICY "insert_own_bookmarks"
  ON user_bookmarks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_bookmarks" ON user_bookmarks;
CREATE POLICY "update_own_bookmarks"
  ON user_bookmarks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bookmarks" ON user_bookmarks;
CREATE POLICY "delete_own_bookmarks"
  ON user_bookmarks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_bookmarks_updated ON user_bookmarks;
CREATE TRIGGER trg_user_bookmarks_updated
  BEFORE UPDATE ON user_bookmarks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
