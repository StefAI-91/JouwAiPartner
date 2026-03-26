# Sprint 18: Access Control & Security

**Phase:** 2 — Expand Sources & Agents
**Requirements:** REQ-606, REQ-1300–REQ-1305
**Depends on:** Sprint 05 (Gatekeeper tags sensitivity), Sprint 02 (all tables)
**Produces:** Supabase Auth + Row Level Security enforcing sensitivity-based access

---

## Task 1: Add sensitivity field and update Gatekeeper

**What:** Ensure all content tables have the `sensitivity` column (added in Sprint 02) and the Gatekeeper tags it.

The Gatekeeper already outputs `sensitivity: "open" | "restricted"` from Sprint 05. Verify it's being written to the DB in `processContent()`.

**Add sensitivity column if missing from any table:**
```sql
-- Should already exist from Sprint 02, but verify:
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'open';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'open';
ALTER TABLE slack_messages ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'open';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'open';
```

---

## Task 2: Set up Supabase Auth

**What:** Configure authentication so users can log in and be identified for RLS.

**Supabase Dashboard:**
1. Authentication → Providers → Enable Email/Password
2. Optionally enable Google OAuth for SSO (if using Google Workspace)

**Create user profiles table:**
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    team TEXT,
    role TEXT DEFAULT 'member',  -- 'admin', 'member'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Task 3: Implement Row Level Security

**What:** RLS policies that enforce: open content visible to all, restricted content visible only to originating team or admins.

```sql
-- Enable RLS on all content tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Policy: open content visible to all authenticated users
CREATE POLICY "Open content visible to all" ON documents
    FOR SELECT USING (
        sensitivity = 'open'
        AND auth.uid() IS NOT NULL
    );

-- Policy: restricted content visible to admins or same team
CREATE POLICY "Restricted content for team/admins" ON documents
    FOR SELECT USING (
        sensitivity = 'restricted'
        AND (
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
            -- Add team-based logic when team tagging is implemented
        )
    );

-- Repeat for meetings, slack_messages, emails (same pattern)
-- Use a function to reduce duplication:
CREATE OR REPLACE FUNCTION can_read_content(content_sensitivity TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF content_sensitivity = 'open' THEN
        RETURN auth.uid() IS NOT NULL;
    END IF;
    -- Restricted: admin only for now
    RETURN EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified policies using the function
CREATE POLICY "Content access" ON meetings
    FOR SELECT USING (can_read_content(sensitivity));
CREATE POLICY "Content access" ON slack_messages
    FOR SELECT USING (can_read_content(sensitivity));
CREATE POLICY "Content access" ON emails
    FOR SELECT USING (can_read_content(sensitivity));
```

**Important:** Service role key bypasses RLS (used by agents and ingestion). The anon key respects RLS (used by frontend and MCP when user-authenticated).

---

## Verification

- [ ] Users can sign up/sign in via Supabase Auth
- [ ] User profile is auto-created on signup
- [ ] Open content is visible to all authenticated users
- [ ] Restricted content is only visible to admins
- [ ] Unauthenticated requests return no data (RLS blocks)
- [ ] Agent functions (using service role key) still have full access
