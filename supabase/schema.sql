-- ==============================================================================
-- HEAR. ME. OUT. — MOTION 04 LIVE AUDIENCE VOTING SCHEMA
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

-- Seed Motion 04
insert into public.motions (id, title, option_yes, option_no, status)
values (
    'm4',
    'DOES CELEBRITY WORSHIP HAVE GONE TOO FAR?',
    'YES. WE''VE TAKEN IT TOO FAR 😮💨',
    'NO. LET PEOPLE ENJOY WHAT THEY ENJOY!',
    'open'
)
on conflict (id) do update set
    title = excluded.title,
    option_yes = excluded.option_yes,
    option_no = excluded.option_no;

-- 2. Create Votes Table
create table if not exists public.votes (
    id uuid primary key default gen_random_uuid(),
    motion_id text not null references public.motions(id) on delete cascade,
    user_id uuid not null,
    display_name text not null, -- Anonymized format: "Firstname L."
    choice text not null check (choice in ('YES', 'NO')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- CRITICAL ANTI-SPAM CONSTRAINT: One account = Exactly one active vote per motion
    constraint unique_motion_user unique (motion_id, user_id)
);

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
