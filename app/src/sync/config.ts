/**
 * The Supabase project the app talks to. Both values are meant to be public:
 * they identify the project, and what protects people's data is the row-level
 * security in supabase/migrations. Set the VITE_ variables to point a build at
 * another project, for example a local one.
 */
export const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://dbhfompibgaphwiuqvgi.supabase.co'

export const SUPABASE_KEY: string =
  (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ?? 'sb_publishable_dSnkpqcasi_hL_I9HczT2A_tCzRbrTW'
