# Vital AI Alerts Testing and Launch Guide

This guide is specific to the current codebase in `/Users/kunalsuthar/Documents/web-development/Vital AI`.

## What alerts currently exist

### 1. Manual family alert
- Route: `POST /api/contacts/alert`
- Triggered from: the emergency-contact flow
- Delivery path: OneSignal push first, then Twilio SMS fallback
- Log table: `family_alert_log`

### 2. Automatic family alert for high-risk or red-flag sessions
- Route that triggers it indirectly: `POST /api/sessions`
- Trigger conditions:
  - `triageLevel === "high"`
  - `triageLevel === "emergency"`
  - `redFlagsDetected.length > 0`
- Delivery path: OneSignal push first, then Twilio SMS fallback
- Log table: `family_alert_log`

### 3. In-app escalation alerts for inactivity
- Worker: `runEscalationChecker()`
- Dev route: `POST /dev/run-escalation`
- Alert types:
  - `escalation_day7`
  - `escalation_day10`
  - `escalation_day14`
- Log table: `alert_log`

### 4. In-app trend alerts
- Worker: `runAnalyticsWorker()`
- Dev route: `POST /dev/run-analytics`
- Alert types:
  - `trend_spike`
  - `new_peak` is defined in the service, but the current analytics worker only sends `trend_spike`
- Log table: `alert_log`

### 5. Alert inbox response flow
- Read alerts: `GET /api/alerts`
- Respond to an alert: `POST /api/alerts/:id/respond`
- Response types:
  - `logged_symptoms`
  - `confirmed_ok`
  - `requested_help`
  - `dismissed`

## Best way to test every alert

## Step 1: run the app locally

Server:

```bash
cd /Users/kunalsuthar/Documents/web-development/Vital\ AI/server
npm install
npm run dev
```

Client:

```bash
cd /Users/kunalsuthar/Documents/web-development/Vital\ AI/client
npm install
npm run dev
```

## Step 2: configure the minimum env vars

Server:

```env
DATABASE_URL=...
CLERK_SECRET_KEY=...
CLERK_PUBLISHABLE_KEY=...
DEV_ROUTES_ENABLED=true
DEV_ROUTES_SECRET=choose-a-secret
ONESIGNAL_APP_ID=...
ONESIGNAL_REST_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
CLIENT_URL=http://localhost:3000
```

Client:

```env
NEXT_PUBLIC_API_URL=http://localhost:3005
NEXT_PUBLIC_ONESIGNAL_APP_ID=...
```

Notes:
- If OneSignal is not configured outside production, push alerts are printed to the server console.
- If Twilio is not configured outside production, SMS alerts are printed to the server console.
- That means you can still validate the alert flow before paying for messaging.

## Step 3: create one real test user first

Use the UI and sign up normally so the app creates a real user row in the database.

This matters because most alert routes expect a valid Clerk user that also exists in the `users` table.

## Step 4: save an emergency contact and enable push

In onboarding:
- enter emergency contact name and phone
- click `Enable push alerts`
- accept browser notification permission

Verify:
- the contact row has a `push_subscription_id`
- OneSignal site URL matches the exact frontend URL you are using
- the browser allows notifications for the site

## Step 5: test each alert path

### A. Manual family alert

Use the route:

```bash
curl -X POST http://localhost:3005/api/contacts/alert \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

What to verify:
- you get `{ "success": true }`
- OneSignal push fires, or Twilio/console fallback runs
- a row is inserted into `family_alert_log`

### B. Automatic family alert from a dangerous session

Create a session that should be scored as `high` or `emergency`, or include a red-flag symptom.

Use:

```bash
curl -X POST http://localhost:3005/api/sessions \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symptomIds": ["arm_jaw_pain"],
    "severity": 9,
    "durationMinutes": 30,
    "stressScore": 4,
    "sleepHours": 6
  }'
```

What to verify:
- response includes `familyAlertTriggered: true`
- `triage.level` is `high` or `emergency`
- a row is inserted into `family_alert_log`
- the contact receives push or SMS fallback

### C. Inactivity escalation alerts

Enable dev routes, then run:

```bash
curl -X POST http://localhost:3005/dev/run-escalation \
  -H "x-dev-secret: choose-a-secret"
```

What to verify:
- response contains `{ "alerted": N }`
- rows are inserted into `alert_log`
- `GET /api/alerts` returns the new alerts for that user

Important:
- this only alerts users whose last session is older than 7 days
- it only targets users whose last risk level was `moderate`, `high`, or `emergency`

### D. Trend spike alerts

Enable dev routes, then run:

```bash
curl -X POST http://localhost:3005/dev/run-analytics \
  -H "x-dev-secret: choose-a-secret"
```

What to verify:
- response contains `{ "processed": N }`
- `trend_spike` entries appear in `alert_log`

Important:
- the user needs enough recent history for the worker to compare the last 7 days against the previous 7 days
- the current worker requires at least 4 recent scored sessions

### E. Alert inbox and response actions

Read alerts:

```bash
curl "http://localhost:3005/api/alerts?limit=20" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

Respond:

```bash
curl -X POST http://localhost:3005/api/alerts/ALERT_ID/respond \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "responseType": "confirmed_ok" }'
```

What to verify:
- the alert status changes to `responded:confirmed_ok`
- `GET /api/alerts?unreadOnly=true` no longer shows that alert

## Use the built-in server test suite too

There is already a dev verification route:

```bash
curl "http://localhost:3005/dev/test-suite?userId=YOUR_DB_USER_ID" \
  -H "x-dev-secret: choose-a-secret"
```

This checks NLP, panic detection, some integrity rules, and whether recent alerts exist.

## What still blocks a true production launch

### 1. Server tests are failing

Current failures:
- one triage test expects `moderate`, but the service returns `high`
- one triage test expects `high`, but the service returns `emergency`
- one panic test expects `panicScore >= 3`, but the service returns `2`

Do not call the alert engine production-ready until those expectations are reconciled with the current scoring logic.

### 2. Frontend build depends on Google font fetching

`client/app/layout.tsx` uses `next/font/google` with `Geist` and `Geist_Mono`.

If your deployment environment cannot fetch Google Fonts during build, the frontend build can fail. If that happens in hosting, switch to local fonts or a guaranteed-access deployment environment.

### 3. Public log APIs are still placeholders

These routes are wired but not implemented yet:
- `GET /api/alert-log`
- `GET /api/family-alert-log`
- `GET /api/panic-events`
- `GET /api/emergency-contacts`

For launch, it would help to expose real read endpoints for admins or testers so you can inspect what happened without opening the database directly.

## Recommended production setup

## Deployment split

Use:
- frontend: Vercel
- backend: Render, Railway, or Fly.io
- database: Neon Postgres

## Required production env vars

Server:
- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`
- `CLIENT_URL`
- `FRONTEND_URL`
- `CORS_ALLOWLIST` if you use more than one frontend domain

Client:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`

## Production checklist

- database migrations applied
- Clerk production keys installed
- OneSignal app configured for the final frontend URL
- OneSignal service worker files deployed from `/client/public`
- Twilio credentials installed
- backend CORS allowlist updated to the final frontend domain
- background jobs running in production
- one full manual alert test completed on the real domain
- one full high-risk session alert test completed on the real domain
- one escalation worker run validated on staging before enabling broadly

## How Vloxo fits in

Vloxo is best used after the app is already live on a public URL.

Suggested order:
1. Deploy frontend and backend.
2. Verify auth, session logging, and all alert flows on the real domain.
3. Create a simple landing page message for testers:
   - what Vital AI does
   - who it is for
   - how to test alerts safely
   - that it is not a replacement for emergency care
4. Add the live product to Vloxo with:
   - app name
   - short description
   - target audience
   - live URL
   - screenshots
   - launch angle such as "AI symptom tracking with emergency-contact alerts"
5. Use Vloxo to distribute the launch, but send people to the public app URL, not to localhost or a staging link.

## Safest rollout path

### Phase 1
- local testing
- fix failing triage tests
- confirm push and SMS fallbacks

### Phase 2
- private staging with a few trusted testers
- verify alert noise is acceptable
- verify OneSignal permissions on desktop and mobile browsers

### Phase 3
- public production deploy
- add to Vloxo
- invite wider testing

## Strong recommendation before sharing publicly

Because this app can generate emergency-style messaging, add these before broad launch:
- a visible medical disclaimer
- rate limits for alert-triggering routes
- basic admin monitoring for alert failures
- stronger audit views for `alert_log` and `family_alert_log`
