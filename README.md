# FitLinks

A personal workout-link library by **Bandit Innovations**. Save workout URLs from anywhere on the internet — YouTube, Instagram, blogs, PDFs — and organize them with tags and collections for quick retrieval.

## Architecture

FitLinks is a React Native (Expo + TypeScript) mobile app backed by Supabase (Postgres + Auth + Storage). The client communicates directly with Supabase via its JS client SDK for all CRUD, search, and filtering. Authentication uses Supabase Auth (email/password). Row-Level Security on every table ensures strict user isolation.

The frontend uses a tab-based layout (Library, Collections, Profile) with stack navigators for detail/edit screens. Search and tag-based filtering use server-side Postgres queries (full-text search on title/notes, tag joins for filters). Subscription readiness is achieved through a `user_profiles` table with `plan_tier` and client-side gating logic — no billing integration in v1.

## Tech Stack

- **Frontend:** React Native + Expo (SDK 52) + TypeScript + Expo Router
- **Backend:** Supabase (Postgres, Auth, RLS)
- **Link previews:** Client-side Open Graph scraper
- **In-app browser:** expo-web-browser for opening saved workouts
- **Auth token storage:** expo-secure-store

## Getting Started

```bash
# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Fill in your Supabase project URL and anon key

# Run the Supabase migration
# (apply supabase/migrations/00001_initial_schema.sql to your project)

# Start the dev server
npx expo start
```

## Project Structure

```
app/                    # Expo Router screens
  (auth)/               # Login / Sign Up
  (tabs)/               # Tab bar: Library, Collections, Profile
  workout/[id].tsx      # Workout detail
  edit/[id].tsx         # Edit workout
  collection/[id].tsx   # Collection detail
  save.tsx              # Save new workout
  upgrade.tsx           # Upgrade placeholder
src/
  components/           # Shared UI components
  constants/            # Theme, limits, default tags
  hooks/                # useAuth, useWorkouts, useTags, useCollections, useEntitlements
  lib/                  # Supabase client, OG scraper
  types/                # TypeScript interfaces
supabase/
  migrations/           # SQL schema migrations
```

## Test Plan

### Key flows to validate

1. **Auth flow:** Sign up, email confirmation, sign in, sign out, session persistence across restarts.
2. **Save workout:** Paste URL, tap Preview (OG metadata populates title + thumbnail), select tags, save. Verify row appears in library.
3. **Duplicate guard:** Saving the same URL twice for the same user shows a constraint error.
4. **Search:** Type a keyword — library filters workouts whose title/notes match.
5. **Tag filter:** Select a tag chip — only matching workouts display.
6. **Sort modes:** Toggle between Recently Added, Recently Opened, Favorites — order changes correctly.
7. **Favorites:** Tap heart on card and on detail screen — `is_favorite` toggles.
8. **Open workout:** Tap "Open Workout" — in-app browser launches, `last_opened_at` updates, `workout_events` row inserted.
9. **Edit workout:** Change title, tags, notes, duration — verify updates persist.
10. **Delete workout:** Confirm dialog, workout removed, cascade deletes join rows.
11. **Collections CRUD:** Create, rename, delete collection. Add/remove workouts.
12. **Entitlement gating:** With a free-tier profile, hit 10 workouts — save is blocked, upgrade screen shows. Same for 3 collections. Plus tier: 50 workouts, 10 collections.
13. **RLS isolation:** With two users, verify neither can see the other's data via direct Supabase queries.

## Next Iteration

1. **Share extension / deep link ingestion** — save workouts directly from the share sheet in iOS/Safari and Android.
2. **Supabase Edge Function for OG scraping** — bypass CORS and improve reliability of link previews.
3. **Offline support** — cache workouts locally and sync when back online.
4. **RevenueCat / Stripe integration** — enable actual subscription billing for Pro tier.
5. **OAuth providers** — Google and Apple sign-in via Supabase Auth.
6. **Image upload** — let users upload a custom thumbnail to Supabase Storage when OG fails.
7. **Drag-and-drop reordering** in collections.
8. **Bulk tag management** — apply/remove tags across multiple workouts at once.
9. **Widget support** — iOS/Android home screen widget showing a random saved workout.
10. **Dark/light theme toggle** — currently dark-only; add light mode option.
