# THE Q MMA — App

React + TypeScript + Vite + Tailwind CSS v4, scaffolded from the original
single-file HTML prototype. This build implements the **Athletes** tab in
full; the other tabs (The Q, Shop, Cart, You) are stubbed with a "coming
soon" placeholder -- see NEXT-STEPS.md.

## Run it locally

Requires Node.js 18+ (https://nodejs.org).

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). The app works
immediately with mock data -- no backend setup required to explore the UI.

## Connect a real Supabase backend (optional)

The app runs on mock data (`src/data/athletes.ts`) until you connect a real
project. To go live:

1. Create a free project at https://supabase.com.
2. Open **SQL Editor** in your project dashboard, paste in the contents of
   `supabase/schema.sql`, and run it. This creates the `athletes` and
   `fights` tables, sets up read-only public access, and seeds the same
   two fighters the mock data uses.
3. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. In your Supabase dashboard, go to **Settings -> API** and copy your
   **Project URL** and **anon public key** into `.env.local`.
5. Restart `npm run dev`. The app will automatically detect the env vars
   and switch from mock data to live Supabase queries -- no code changes
   needed (see `src/hooks/useAthletes.ts`).

**Never paste real Supabase keys into chat, tickets, or commit them to
git** -- `.env.local` is already listed in `.gitignore`.

## Project structure

```
src/
  types/athlete.ts        Shared TypeScript types (mirrors schema.sql)
  data/athletes.ts        Mock data (Dione Barbosa, Ozzy Diaz)
  lib/supabase.ts         Supabase client, reads from env vars
  hooks/useAthletes.ts    Single source of truth: mock data OR Supabase
  components/
    layout/               AppShell (phone frame), TabBar
    athletes/              AthleteHeader, AthleteSelector, AthleteHero,
                           AthleteStatCard, FightHubSection, LastFightCard,
                           NextFightCard, AthleteQuickLinks, AthleteAbout
  pages/AthletesPage.tsx  Composes all athlete components
supabase/schema.sql        Full SQL schema + seed data
```

## Build for production

```bash
npm run build
```

Outputs static files to `dist/`, deployable to Vercel, Netlify, Cloudflare
Pages, or any static host.
