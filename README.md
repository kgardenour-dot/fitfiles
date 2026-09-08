# FitLinks

A personal workout-link library by **Bandit Innovations**. Save workout URLs from anywhere — YouTube, Instagram, blogs, PDFs — and organize them with tags and collections.

## Architecture

FitLinks is a React Native (Expo + TypeScript) mobile app backed by Supabase (Postgres + Auth + Storage). The client talks to Supabase with the JS SDK for CRUD, search, and filtering. Authentication is email/password via Supabase Auth. Row-Level Security on every table keeps user data isolated.

The UI is a tab layout (Library, Collections, Profile) with stack screens for detail, edit, save, import, and upgrade. Search uses a Postgres RPC (`search_workout_links`) with a local fallback. Pro subscriptions are sold through the App Store / Google Play and verified with RevenueCat; the app syncs `user_profiles.plan_tier` from the active entitlement.

## Tech Stack

- **Frontend:** React Native 0.81 + Expo SDK 54 + TypeScript + Expo Router 6
- **Backend:** Supabase (Postgres, Auth, RLS, Storage for thumbnails)
- **Purchases:** RevenueCat (`react-native-purchases`) + StoreKit / Play Billing
- **Share into the app:** iOS share extension (App Group) + `expo-share-intent`
- **Link previews:** Client-side Open Graph / oEmbed scraper
- **In-app browser:** `expo-web-browser`
- **Auth token storage:** `expo-secure-store`

## Plans

| Plan | Saved workouts | Collections |
|------|----------------|-------------|
| Free | 25 | 5 |
| Pro  | Unlimited | Unlimited |

Pro is an auto-renewing subscription. Restore and manage-subscription controls live on Profile and the upgrade screen.

## Getting Started

```bash
# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Fill in Supabase URL/anon key and RevenueCat public SDK keys

# Apply SQL in supabase/migrations/ to your Supabase project (in order)

# In the Supabase dashboard, allow this redirect URL for password reset:
#   fitlinks://reset-password
# (Expo Go uses an exp:// URL from Linking.createURL — add that for local testing.)

# Start the dev server
npx expo start
```

Native share and in-app purchases need a dev client or store build (`npx expo run:ios` / `run:android` or EAS), not Expo Go.

## Project Structure

```
app/                    # Expo Router screens
  (auth)/               # Login, sign up, forgot password
  (tabs)/               # Tab bar: Library, Collections, Profile
  legal/                # Privacy Policy and Terms of Use
  workout/[id].tsx      # Workout detail
  edit/[id].tsx         # Edit workout
  collection/[id].tsx   # Collection detail (legacy route)
  save.tsx              # Save new workout
  import.tsx            # Share / import a link
  upgrade.tsx           # FitLinks Pro paywall
  reset-password.tsx    # Set a new password from the email link
src/
  components/           # Shared UI
  constants/            # Theme, limits, default tags, legal copy
  contexts/             # Workouts, collections, RevenueCat
  hooks/                # useAuth, useWorkouts, useTags, useCollections, useEntitlements
  lib/                  # Supabase client, OG scraper, thumbnail storage
  types/                # TypeScript interfaces
ios/ShareExtension/     # iOS share sheet
supabase/migrations/    # SQL schema migrations
```

## Test Plan

### Key flows to validate

1. **Auth flow:** Sign up, email confirmation, sign in, forgot password (email + new password), sign out, session persistence across restarts.
2. **Save workout:** Paste URL, tap Preview (title + thumbnail), select tags, save. Row appears in the library.
3. **Duplicate guard:** Saving the same URL twice updates the existing row instead of inserting a second one.
4. **Search:** Type a keyword — library filters workouts whose title/notes/tags match.
5. **Sort modes:** Toggle Newest, Recently Opened, Faves — order changes correctly.
6. **Favorites:** Tap heart on the card and on the detail screen — `is_favorite` toggles.
7. **Open workout:** Tap "Open Workout" — in-app browser launches, `last_opened_at` updates, `workout_events` row inserted.
8. **Edit workout:** Change title, tags, notes, duration — updates persist.
9. **Delete workout:** Confirm dialog, workout removed, join rows cascade.
10. **Collections CRUD:** Create, rename, delete a collection. Add/remove workouts.
11. **Share import:** Share a URL from Safari/YouTube into FitLinks — Import screen fills and can save.
12. **Entitlement gating:** Free tier: 25 workouts and 5 collections. Further saves/creates go to upgrade. Pro: unlimited.
13. **Purchases:** Offers load, purchase/restore updates Pro, Privacy Policy and Terms of Use open from the paywall.
14. **RLS isolation:** With two users, neither can see the other's data via direct Supabase queries.

## Next Iteration

1. **Supabase Edge Function for OG scraping** — bypass CORS and improve link-preview reliability.
2. **Offline support** — cache workouts locally and sync when back online.
3. **OAuth providers** — Google and Apple sign-in via Supabase Auth.
4. **Custom thumbnail upload** — pick a photo when OG preview fails.
5. **Drag-and-drop reordering** in collections.
6. **Bulk tag management** — apply/remove tags across multiple workouts.
7. **Home-screen widget** — random saved workout.
8. **Dark/light theme toggle** — currently dark-only.
