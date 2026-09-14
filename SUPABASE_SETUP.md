# Supabase Setup Guide for M04 Live Voting

This voting system uses **Supabase** (PostgreSQL + Realtime + Presence + Auth) to provide real-time audience voting with strict database guarantees:
- **One account = One vote** (enforced by `UNIQUE(motion_id, user_id)` database constraint).
- Changing votes performs an in-place `UPDATE` (previous choice is erased, never double-counted).
- Row-Level Security (RLS) prevents unauthorized writes or client-side tampering.
- Live Realtime Presence tracks active viewers on `/m4`.

---

## 1. Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free project (e.g. `hear-me-out-live`).
2. Wait ~1-2 minutes for the database to provision.

---

## 2. Run the Schema Migration
1. In your Supabase Dashboard, open **SQL Editor** (from the left menu).
2. Click **New Query**.
3. Copy the entire contents of [`supabase/schema.sql`](file:///Users/tanmaykashyap/Documents/hear-me-out/supabase/schema.sql) and paste it into the editor.
4. Click **Run**.
5. Ensure the query succeeds. This creates:
   - `public.motions` with seed data for Motion 04.
   - `public.votes` with unique constraint `(motion_id, user_id)`.
   - RLS security policies allowing users to only insert/update their own vote.
   - Realtime publication on the `votes` table.

---

## 3. Enable Google Authentication
1. In Supabase Dashboard, go to **Authentication** -> **Providers**.
2. Select **Google** and toggle it **Enabled**.
3. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create an **OAuth 2.0 Client ID** (Web application).
   - Add the Authorized Redirect URI shown in Supabase (e.g., `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`).
   - Copy your **Client ID** and **Client Secret** into Supabase.
4. In Supabase **Authentication** -> **URL Configuration**:
   - **Site URL**: `https://heremeout.space` (or `http://localhost:3000` for local testing)
   - **Redirect URLs**: Add `https://heremeout.space/**` and `http://localhost:3000/**`

---

## 4. Set Environment Variables
Create or edit `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Both values are in your Supabase project under:
**Project Settings** -> **API** -> **Project URL** & **Project API Keys (anon/public)**.

---

## 5. You're Ready!
Run the app:
```bash
pnpm dev
```
Navigate to `http://localhost:3000/m4`.
The page will connect to Supabase Realtime, track live viewers with Presence, and allow Google-authenticated audience members to cast and switch their votes in real time!
