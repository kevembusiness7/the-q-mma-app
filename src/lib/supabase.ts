import { createClient } from '@supabase/supabase-js'

/**
 * Reads the Supabase project URL + anon key from environment variables.
 *
 * To connect a real Supabase project:
 *   1. Create a free project at https://supabase.com
 *   2. Run the SQL in `supabase/schema.sql` against it (SQL Editor tab)
 *   3. Copy `.env.example` to `.env.local` and fill in your project's
 *      URL + anon key (Settings → API in the Supabase dashboard)
 *   4. Never commit `.env.local` or paste real keys into chat/tickets —
 *      `.env.local` is already listed in `.gitignore`.
 *
 * Until those env vars are set, `isSupabaseConfigured` is `false` and the
 * app falls back to the mock data in `src/data/athletes.ts` — see
 * `src/hooks/useAthletes.ts`.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null
