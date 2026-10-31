# Supabase Setup & Motion 06 Migration Guide

This voting system uses **Supabase** (PostgreSQL + Realtime + Presence + Auth) to provide real-time audience voting with strict database guarantees:
- **One account = One vote** (enforced by `UNIQUE(motion_id, user_id)` database constraint).
- Changing votes performs an in-place `UPDATE` (previous choice is erased, never double-counted).
- Row-Level Security (RLS) prevents unauthorized writes or client-side tampering.
- Live Realtime Presence tracks active viewers on `/m6` (as well as `/m5` and `/m4`).
- M4 and M5 historical votes and results are permanently preserved and isolated from M6.

---

## ⚡ Quick M6 Database Migration (Run in Supabase SQL Editor)

If your Supabase project is already set up from M5, open your **SQL Editor** in Supabase and run this quick migration:

```sql
-- 1. Mark M5 as closed
update public.motions set status = 'closed' where id = 'm5';

-- 2. Seed Motion 06 (Halloween Special)
insert into public.motions (id, title, option_yes, option_no, status)
values (
    'm6',
    'WE ARE ALL EVIL: ARE WE MORAL BY NATURE OR BY SOCIAL FEAR?',
    'GOOD BY NATURE — Morality and empathy are who we truly are',
    'WE ARE ALL EVIL — Society & fear of consequences are all that keep us in check',
    'open'
)
on conflict (id) do update set
    title = excluded.title,
    option_yes = excluded.option_yes,
    option_no = excluded.option_no,
    status = excluded.status;

-- 3. Ensure votes table allows flexible options (MORAL, EVIL, MOVIE, EXPERIENCE)
alter table public.votes drop constraint if exists votes_choice_check;

-- 4. Create SVO Experiment Table (Dr. Harshil's Study)
create table if not exists public.svo_responses (
    id uuid primary key default gen_random_uuid(),
    motion_id text not null default 'm6',
    user_id text not null,
    display_name text not null,
    email text,
    phase text not null check (phase in ('pre', 'post')),
    orientation text not null check (orientation in ('prosocial', 'individualistic', 'competitive', 'unclassified')),
    choices jsonb not null,
    prosocial_count int not null default 0,
    individualistic_count int not null default 0,
    competitive_count int not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_svo_user_phase unique (motion_id, user_id, phase)
);

alter table public.svo_responses enable row level security;
create policy "Allow public read access to svo_responses" on public.svo_responses for select using (true);
create policy "Allow all users to submit svo_responses" on public.svo_responses for all using (true) with check (true);
alter publication supabase_realtime add table public.svo_responses;
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
