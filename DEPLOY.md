# Get in — How to put this website on Vercel

This guide is for Nikki, the owner. Go one tiny step at a time. You do
not need to read or change any code. Nothing here charges anyone, and
nothing goes live on getinbeauty.com yet — this only puts the site on a
private Vercel preview link first.

## What you need open

- This project folder (`get-in-website-code`)
- Your Supabase project, **Get in** — for two connection details
- Your Vercel account, signed in

## Step 1 — Find the two connection details in Supabase

1. Open your Supabase project, **Get in**.
2. Open **Settings** (the little gear icon), then tap **API** (it may be
   called **Data API**).
3. Find **Project URL** at the top.
4. Find the key called **anon public** below it.

Do not copy them yet. Just know where they are.

> **Keep yourself safe:** only ever use the key called **anon public**.
> Never use a key called **service_role** or **secret** for the website,
> and never send any key in chat or in a screenshot.

## Step 2 — Get this code into Vercel (pick ONE way)

### Way A — With GitHub (easiest to repeat later)

1. On your computer, go to github.com and sign in (or make a free account).
2. Create a new repository called `get-in-website`. Leave it empty.
3. Upload this whole `get-in-website-code` folder into that repository.
   The simplest way: on the repository page, tap **Add file → Upload
   files**, drag the folder's contents in, and commit.
4. Go to vercel.com and sign in.
5. Tap **Add New → Project**.
6. Pick **Import Git Repository** and choose `get-in-website`.
7. Vercel will detect the settings on its own. Leave them exactly as
   shown (Framework: Next.js). Do **not** tap Deploy yet — go to Step 3
   first.

### Way B — With the Vercel app on your computer

1. On your computer, open a terminal in this `get-in-website-code`
   folder.
2. Run: `npm install -g vercel`
3. Run: `vercel` — sign in when it asks, and accept the suggested
   answers. This creates the project and gives you a preview link.
4. Do **not** run the final deploy yet — go to Step 3 first, then run
   `vercel --prod` after the two settings below are saved.

## Step 3 — Put the two connection details into Vercel

This is the step that connects the website to your Supabase filing
cabinet. In Vercel these saved details are called environment variables
— that just means "settings the website reads when it starts."

1. In the Vercel project, open **Settings**.
2. Open **Environment Variables**.
3. Add the first one:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: paste your **Project URL** from Supabase
4. Save it.
5. Add the second one:
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: paste your **anon public** key from Supabase
6. Save it.

Type those names exactly as written, capitals and underscores included.
Paste the values straight from Supabase — do not type them by hand,
and do not paste them into chat to check them.

## Step 4 — Deploy and open the preview link

1. In Vercel, go to **Deployments**.
2. Tap **Redeploy** on the latest deployment (or, with Way B, run
   `vercel --prod`). The settings from Step 3 only take effect on a
   fresh deployment.
3. Wait until Vercel says the deployment is **Ready**. This can take a
   few minutes.
4. Tap the preview web address Vercel gives you. It will look like a
   Vercel address, not getinbeauty.com. That is correct for now.

## Step 5 — Check the preview works

1. The site should open and show "Hello Gorgeous" and the search box.
2. If instead you see a message saying the website is not connected,
   the two settings in Step 3 are missing or mistyped — check the names
   and values, save, and redeploy.
3. Try signing up with an email you control, then sign in.
4. As a provider, set up your business profile and post one test
   opening. As a client, search for it and claim it.
5. Check in Supabase under **Table Editor** that new rows appear in
   profiles, providers, openings, and claims.

## If something goes wrong

- **Vercel asks you to pay:** stop. You stay on the free plan until
  launch. Tell Boone what the screen says before tapping anything.
- **A key does not paste, or a name was typed wrong:** delete that one
  setting in Vercel and add it again, pasting carefully. Do not share
  the key to get help with it.
- **The build fails (red error):** send Boone a screenshot of the
  exact error words. Do not keep retrying.
- **Sign-in email never arrives:** check spam first, wait a few
  minutes, then tell Boone.

## What this does NOT do

- It does not put the site on getinbeauty.com yet. That is a later step.
- It does not charge anyone. There is no $9/month subscription in this
  version.
- It does not upgrade Vercel or Supabase to a paid plan.
