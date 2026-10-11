# Snow Buddies

Find people to ski and ride with. Snow Buddies matches riders by sport, level and home
mountain, lets them become buddies and chat, plan ride days that others can join, and
shows each resort's trail map with your live location.

Built with **Expo SDK 57** (React Native 0.86, Expo Router), **React Native Paper**, and
**Supabase** (auth, Postgres with row level security, realtime). Trail maps come from
**[OpenSkiMap](https://openskimap.org)** (OpenStreetMap data).

## Features

| Area | What riders can do |
| --- | --- |
| Auth | Sign up / log in with email + password, Google, or Facebook. Password reset by email. |
| Profile | Display name, ski / snowboard / both, skill level, home mountain, short bio. |
| Discover | Browse riders, filter by home mountain, sport and level, search by name. |
| Buddies | Send, accept, decline and cancel buddy requests; remove buddies. |
| Chat | Realtime 1:1 messages between buddies with unread counts, **voice messages**, and pin/meetup cards. |
| Calls | **Voice and video calls** between buddies (LiveKit), with an incoming-call screen, mute, camera on/off and flip, and calls logged in the chat. |
| Pins & meetups | Drop a **pin** (powder stash, lost glove) or set a **meetup point** with a time, pick which buddies get it, and optionally post it to their chats. Long-press the map or tap the pin button. Pins expire automatically. |
| Trips | Plan a ride day at a mountain with a rider cap and optional minimum level; join or leave. |
| Ski map | Embedded map (native maps on iOS and Android, Leaflet on web) with runs coloured by difficulty and lifts for any resort worldwide, your live GPS position, and distance to the resort. |
| Friends on the map | Share your live location for 1, 4 or 8 hours and choose exactly which buddies can see you. Buddies sharing with you appear on the map in real time. Tap one to message them. |

## Project layout

```
src/
  app/                 Expo Router screens (file-based routes)
    (auth)/            login, register, forgot-password
    (tabs)/            Discover, Trips, Ski Map, Buddies, Profile
    chat/[id].tsx      conversation with a buddy
    rider/[id].tsx     rider profile + buddy actions
    trip/              trip detail and "plan a trip"
    resort/[id].tsx    ski map for a mountain
  components/          shared UI (forms, map, cards)
  hooks/               data and location hooks
  lib/                 Supabase client, API calls, OpenSkiMap client, validation
  providers/           AuthProvider (session + profile)
supabase/
  migrations/          database schema + RLS policies
  functions/           edge functions (livekit-token for calls)
  seed.sql             42 North American resorts
  tests/               RLS/behaviour tests runnable on plain Postgres
```

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Create the Supabase backend

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema and seed data, either:
   - **Supabase CLI:** `npx supabase link --project-ref <ref>` then `npx supabase db push`
     and run `supabase/seed.sql` in the SQL editor, **or**
   - **Dashboard:** paste each file in `supabase/migrations/` (in filename order), then
     `supabase/seed.sql`, into the SQL editor.
3. In **Project Settings → API**, copy the project URL and the `anon` public key into
   `.env.local` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. In **Authentication → URL Configuration → Redirect URLs**, add:
   - `sb://**` (installed app / development builds)
   - `exp://**` (Expo Go during development)

### 3. Voice and video calls (LiveKit)

Calls use [LiveKit](https://livekit.io) for audio and video. The free LiveKit Cloud tier is
enough to start, or you can self-host.

1. Create a project at [cloud.livekit.io](https://cloud.livekit.io) and copy its **URL**
   (`wss://…livekit.cloud`), **API key** and **API secret**.
2. Deploy the token function and store the LiveKit keys as Supabase secrets:
   ```bash
   npx supabase functions deploy livekit-token
   npx supabase secrets set LIVEKIT_URL=wss://your-project.livekit.cloud \
     LIVEKIT_API_KEY=your-key LIVEKIT_API_SECRET=your-secret
   ```
   The function only issues a token to the caller or callee of a live call, and the
   LiveKit secret never ships in the app.
3. Calls need the native WebRTC module, so they work in a **development build** or the
   store app, not in Expo Go or on web (those show a friendly "not available in this
   preview" screen):
   ```bash
   npx eas-cli build --profile development --platform ios   # or android
   ```

### 4. Social login (optional)

Enable each provider in **Supabase → Authentication → Providers**. Both use the callback
URL Supabase shows on that page (`https://<ref>.supabase.co/auth/v1/callback`).

- **Google:** create an OAuth client (type *Web application*) in Google Cloud Console →
  APIs & Services → Credentials, add the Supabase callback URL as an authorised redirect
  URI, and paste the client ID and secret into Supabase.
- **Facebook:** create an app at [developers.facebook.com](https://developers.facebook.com)
  with *Facebook Login*, add the Supabase callback URL under *Valid OAuth Redirect URIs*,
  and paste the app ID and secret into Supabase.
- **Instagram:** Supabase has no Instagram provider, and Meta retired the Instagram Basic
  Display API (consumer "Log in with Instagram") in December 2024. Instagram users sign in
  with **Continue with Facebook**, since Instagram accounts are Meta accounts.

### 5. Run

```bash
npm start          # then press i (iOS), a (Android) or w (web)
```

`react-native-maps` and `expo-location` are included in Expo Go, so the full app runs there.
In Expo Go, location sharing works while the app is open. **Keep sharing when the app is
closed** (background location) needs a development or store build
(`npx eas-cli build --profile development`), and the toggle appears automatically there.
For store builds, use EAS (`npx eas-cli build`). Android release builds need a Google Maps
API key in `GOOGLE_MAPS_ANDROID_API_KEY`. iOS uses Apple Maps and needs no key. On web
the map is rendered with Leaflet and OpenStreetMap tiles. Set `EXPO_PUBLIC_WEB_TILE_URL` to a
commercial tile provider (MapTiler, Stadia…) before heavy traffic, since the public OSM tile
servers are for light use only.

## Ski map data

`src/lib/openskimap.ts` calls the OpenSkiMap API:

- `GET /features.geojson?bbox=minLon,minLat,maxLon,maxLat&types=run,lift` returns the runs
  and lifts around a resort (the API allows at most 1000 km² per request).
- `GET /search?query=…` provides worldwide resort search on the Ski Map tab.

Map data © OpenStreetMap contributors (ODbL), shown on the map as required. Set
`EXPO_PUBLIC_OPENSKIMAP_API_URL` to point at a self-hosted instance if needed.

## Security model

Every table has row level security, and the app only ever uses the anon key.

- Profiles, mountains and trips are readable by signed-in users only.
- Users can edit only their own profile and their own trips.
- Buddy requests are visible only to the two people involved. Only the recipient can
  accept, via `accept_buddy_request()`.
- Messages can be sent only between accepted buddies and read only by the sender and the recipient.
- Location sharing is off by default and always time-limited (12 hours max). Each rider
  chooses which buddies can see them. Only the latest position is stored, never a history,
  and it is deleted when sharing stops. Positions can only be written through
  `update_my_location()`, which refuses to store anything while sharing is off. Unfriending
  removes location access in both directions.
- Pins are visible only to their owner and the buddies they picked, and disappear after
  they expire. Pins and their chat cards are created by `drop_pin()`, so clients can't
  forge pin or call messages.
- Voice notes live in a private storage bucket under the sender's folder. Only the sender
  and the message's recipient can play them, via short-lived signed URLs.
- Calls change state only through `start_call` / `answer_call` / `decline_call` /
  `end_call`, and only between buddies. Room tokens come from the `livekit-token`
  edge function, which checks the call in the database first.
- Trip capacity and dates are enforced in the database. The trip row is locked while
  someone joins, so the trip can't be overbooked.

## Checks

```bash
npm run typecheck
npm run lint
npm test                      # unit tests (validation, map parsing, helpers)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
```

`test:db` applies the migrations to a temporary Postgres database, using a small
Supabase auth stub, and runs every `supabase/tests/*_test.sql` (RLS, location privacy, pins, voice notes and calls). CI (`.github/workflows/ci.yml`)
runs all of these checks on every pull request.
