# Supabase Setup & Motion 05 Migration Guide

This voting system uses **Supabase** (PostgreSQL + Realtime + Presence + Auth) to provide real-time audience voting with strict database guarantees:
- **One account = One vote** (enforced by `UNIQUE(motion_id, user_id)` database constraint).
- Changing votes performs an in-place `UPDATE` (previous choice is erased, never double-counted).
- Row-Level Security (RLS) prevents unauthorized writes or client-side tampering.
- Live Realtime Presence tracks active viewers on `/m5` (and `/m4`).
- M4 historical votes and results are permanently preserved and isolated from M5.

---

## ⚡ Quick M5 Database Migration (Run in Supabase SQL Editor)

If your Supabase project is already set up from M4, open your **SQL Editor** in Supabase and run this quick migration:

```sql
-- 1. Mark M4 as closed
update public.motions set status = 'closed' where id = 'm4';

-- 2. Seed Motion 05
insert into public.motions (id, title, option_yes, option_no, status)
values (
    'm5',
    'WHAT MATTERS MORE, A GREAT MOVIE OR A GREAT EXPERIENCE?',
    'A brilliant movie, terrible viewing experience',
    'An incredible viewing experience, average movie',
    'open'
)
on conflict (id) do update set
    title = excluded.title,
    option_yes = excluded.option_yes,
    option_no = excluded.option_no,
    status = excluded.status;

-- 3. Ensure votes table allows flexible options (MOVIE, EXPERIENCE)
alter table public.votes drop constraint if exists votes_choice_check;
```

---

## Fresh Setup Instructions

### 1. Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a project (e.g. `hear-me-out`).

### 2. Run the Full Schema Script
1. In your Supabase Dashboard, open **SQL Editor**.
2. Copy the entire contents of [`supabase/schema.sql`](file:///Users/tanmaykashyap/Documents/hear-me-out/supabase/schema.sql) and paste it into the editor.
3. Click **Run**. This sets up `motions`, `votes`, RLS policies, unique constraints, and Realtime publication.

### 3. Google Authentication
1. In Supabase Dashboard, go to **Authentication** -> **Providers** -> **Google** (toggle **Enabled**).
2. Add your Google OAuth Client ID and Secret.
3. In **Authentication** -> **URL Configuration**:
   - **Site URL**: `https://heremeout.space` (or your Vercel URL)
   - **Redirect URLs**: Add `https://heremeout.space/**`, `https://*.vercel.app/**`, and `http://localhost:3000/**`

### 4. Environment Variables
Add your keys to `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```
