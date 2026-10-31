-- ==============================================================================
-- HEAR. ME. OUT. — MOTIONS DATABASE SCHEMA
-- Database: Supabase (PostgreSQL)
-- ==============================================================================

-- 1. Create Motions Table
create table if not exists public.motions (
    id text primary key,
    title text not null,
    option_yes text not null,
    option_no text not null,
    status text not null default 'open' check (status in ('upcoming', 'open', 'closed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed Motion 04 (Completed / Closed)
insert into public.motions (id, title, option_yes, option_no, status)
values (
    'm4',
    'DOES CELEBRITY WORSHIP HAVE GONE TOO FAR?',
    'YES. WE''VE TAKEN IT TOO FAR 😮💨',
    'NO. LET PEOPLE ENJOY WHAT THEY ENJOY!',
    'closed'
)
on conflict (id) do update set
    status = 'closed';

-- Seed Motion 05 (Completed / Closed)
insert into public.motions (id, title, option_yes, option_no, status)
values (
    'm5',
    'WHAT MATTERS MORE, A GREAT MOVIE OR A GREAT EXPERIENCE?',
    'A brilliant movie, terrible viewing experience',
    'An incredible viewing experience, average movie',
    'closed'
)
on conflict (id) do update set
    status = 'closed';

-- Seed Motion 06 (Halloween Special - Active / Open)
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

-- 2. Create Votes Table
create table if not exists public.votes (
    id uuid primary key default gen_random_uuid(),
    motion_id text not null references public.motions(id) on delete cascade,
    user_id uuid not null,
    display_name text not null, -- Anonymized format: "Firstname L."
    choice text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- CRITICAL ANTI-SPAM CONSTRAINT: One account = Exactly one active vote per motion
    constraint unique_motion_user unique (motion_id, user_id)
);

-- Ensure choice column allows flexible options beyond binary YES/NO (e.g. MOVIE, EXPERIENCE)
alter table public.votes drop constraint if exists votes_choice_check;

-- Index for speedy queries by motion and choice
create index if not exists idx_votes_motion_id on public.votes(motion_id);
create index if not exists idx_votes_motion_updated on public.votes(motion_id, updated_at desc);

-- 3. Enable Row Level Security (RLS)
alter table public.motions enable row level security;
alter table public.votes enable row level security;

-- Policies for public.motions
create policy "Allow public read access to motions"
    on public.motions for select
    using (true);

-- Policies for public.votes
-- A. Any visitor can read votes (only anonymized display_name and choice are exposed)
create policy "Allow public read access to votes"
    on public.votes for select
    using (true);

-- B. Authenticated users can insert their own vote
create policy "Allow authenticated users to insert own vote"
    on public.votes for insert
    to authenticated
    with check (auth.uid() = user_id);

-- C. Authenticated users can update ONLY their existing vote (enables vote changing)
create policy "Allow authenticated users to update own vote"
    on public.votes for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- D. Authenticated users can delete their own vote
create policy "Allow authenticated users to delete own vote"
    on public.votes for delete
    to authenticated
    using (auth.uid() = user_id);

-- 4. Enable Supabase Realtime for Votes table
alter publication supabase_realtime add table public.votes;

-- 5. Auto-update updated_at timestamp trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create or replace trigger set_votes_updated_at
    before update on public.votes
    for each row
    execute function public.handle_updated_at();

-- ==============================================================================
-- 6. Dr. Harshil's SVO (Social Value Orientation) Experiment Table
-- ==============================================================================
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

create policy "Allow public read access to svo_responses"
    on public.svo_responses for select
    using (true);

create policy "Allow all users to submit svo_responses"
    on public.svo_responses for all
    using (true)
    with check (true);

alter publication supabase_realtime add table public.svo_responses;

create or replace trigger set_svo_updated_at
    before update on public.svo_responses
    for each row
    execute function public.handle_updated_at();

