# Get in — Website

Beauty care providers post openings when they are slow. Clients nearby
find them and claim them in one tap.

- **Hosting:** Vercel (free tier for now)
- **Database, accounts, sign-in:** Supabase project "Get in"
- **Stack:** Next.js (App Router) + React + @supabase/supabase-js

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in your real values
npm run dev
```

## Deploy

See **DEPLOY.md** — plain-language steps for the owner, including
where to paste the two environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Only the public `anon` key belongs in the website. Never use the
`service_role` key, the database password, or any Stripe key here.

## What is in this version

- Email sign up / sign in, with provider or client chosen at sign-up
- Provider business profile (address is geocoded in the browser so
  distance search works) and posting openings
- Provider dashboard with openings and claims
- Client search by address (or current location), radius 5–50 miles,
  service, and date window — soonest-first, with distance, discount
  badges, and directions
- One-tap claiming (needs a free client account; the database only
  allows one claim per opening)
- My bookings, with cancellation that frees the opening
- Privacy policy and account-deletion pages

## Not in this version

- No Stripe, no $9/month provider subscription, no charging
- No getinbeauty.com connection (preview link only for now)
- No photos — the look is colour and type only, in the dark warm luxe
  palette (black, warm browns, caramel/tan, taupe, cream)
