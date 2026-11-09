# Gym Logger

A workout logger built with Svelte 5, SvelteKit, TypeScript, Tailwind, and hosted
Supabase (Postgres and email/password authentication).

```sh
npm ci
# Copy .env.example to .env, or set its two PUBLIC_ variables in your environment.
npm run dev
```

The included example points to the connected hosted project. Its publishable key
is intentionally public; no service-role/secret key is used by the application.
Set both public variables on your frontend hosting platform too.

## Authentication

Visit `/sign-in` to sign in or create an account. The page also supports requesting
a password reset. New accounts require email confirmation on the hosted project.
Protected routes validate the user on the server; the client stores Auth cookies,
not workout history. Sign out from Profile.

In the hosted Supabase dashboard, configure **Authentication → URL Configuration**:

- Set **Site URL** to your deployed frontend's origin.
- Allow `https://YOUR_APP_DOMAIN/auth/callback` and
  `https://YOUR_APP_DOMAIN/auth/callback?next=/reset-password` as redirect URLs.
- If developing the frontend on port 5173, also allow the corresponding callback
  URLs for `http://localhost:5173` (or your chosen frontend origin).
- Configure custom SMTP before offering email-confirmed registration to portfolio
  visitors. The default Supabase mail service has delivery restrictions/rate limits.

No local Supabase or Docker is required. Database migrations are already deployed
through Supabase MCP. A server-capable SvelteKit host is required for route guards
and the email callback; this is not a static-only build.

## Data

Workouts, routines, and exercises now persist in the hosted database. Saves and
deletions use the revision-checked RPCs; conflicts retain the unsaved draft and
ask you to reload. History shows saved name snapshots, including archived exercises.
Auth revalidation preserves loaded data for the same account. Workout reads have a
20-second deadline and a retry action rather than an indefinite loading screen.

Existing browser workout data is **not** migrated or deleted. Profile can download
that previous data separately, and can export the signed-in user's cloud data.
The text importer writes only when explicitly submitted; a multi-session import
is not a single transaction, and reports saved counts if it stops partway through.
JSON backup restore/migration is intentionally left for a later step.

## Checks

```sh
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:ui
```

Unit tests mock Supabase and check mappings, revisions, redirects, and account
switching. Browser tests start **only the frontend**, exercise sign-in and form
validation, and mock login/reset responses so they create no hosted accounts or
emails. Homepage regressions also cover empty data, delayed Auth notifications,
read errors/timeouts, retry, and clearing account data on sign-out. They do not
replace a real email-confirmation/login smoke test.
An optional browser smoke test signs into hosted Supabase, reads the account's
workouts, and signs out when `TEST_AUTH_EMAIL` and `TEST_AUTH_PASSWORD` are supplied
for a dedicated, confirmed test account. It is skipped otherwise and creates no
workout data. Do not commit those credentials.

See [database setup, security, and tests](supabase/README.md).
