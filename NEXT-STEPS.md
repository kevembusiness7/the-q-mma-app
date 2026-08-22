# Next steps

This build covers **Phase A**: a real React/TypeScript project scaffold
with the **Athletes** tab fully rebuilt to match the black/gold/silver
design brief, on top of data types that are Supabase-ready.

## What's built

- Full component architecture for the Athletes tab (header, selector,
  hero, stat cards, Fight Hub with last/next fight, quick links, about)
- Black + metallic gold + silver design system as Tailwind tokens
- TypeScript types mirroring a proposed Supabase schema
- `supabase/schema.sql` -- ready to run against a real project
- Mock data layer that is a drop-in swap for live Supabase queries

## What's not built yet

The other four tabs (**The Q**, **Shop**, **Cart**, **You**) and the
**Admin** panel still only exist in the original HTML prototype. Porting
them to this same React architecture is the natural next phase -- happy
to keep going tab by tab whenever you're ready.

## Before you go live

1. Create your Supabase project and run `supabase/schema.sql` (see the
   main README).
2. Replace the `imageUrl: null` placeholders in `src/data/athletes.ts` --
   or, once Supabase is connected, upload real photos to Supabase Storage
   and set `image_url` on each athlete row.
3. Decide on real routing if you want shareable URLs per athlete
   (e.g. `/athletes/dione-barbosa`) -- this build uses in-memory tab state
   only, matching the original prototype's behavior.
4. When you're ready to add real admin write access (adding athletes,
   editing records), that needs its own authenticated flow -- the public
   anon key this app uses is read-only by design (see the RLS policies in
   `schema.sql`).
