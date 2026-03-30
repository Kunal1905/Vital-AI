# Vital AI

Vital AI is a wellness and mental‑health companion that helps users log symptoms, receive a risk‑aware score, view trends over time, and access calming guidance when support is needed. The goal is to reduce ambiguity in how someone is feeling, offer gentle next steps, and make it easier to notice changes early.

**Why This Project Exists**
- People often struggle to translate how they feel into actionable insights.
- The app provides structured symptom logging, a consistent scoring model, and clear follow‑up guidance.
- It supports proactive self‑care through breathing and calming exercises, while keeping emergency options visible for high‑risk scenarios.

**How This Helps Users**
- Faster symptom capture with a guided flow.
- A clear, single score to summarize current risk.
- Trend visibility to understand changes across time.
- Calm, focused guidance when risk is low/moderate.
- Emergency prompts and contact alerts when risk is high.

## Tech Stack

**Client**
- Next.js (App Router) + React + TypeScript
- Tailwind CSS for styling

**Server**
- Node.js + Express + TypeScript
- Drizzle ORM for database access
- Postgres (works with Neon or any Postgres‑compatible provider)

**Auth & Notifications**
- Clerk for authentication
- OneSignal for push alerts (requires contact opt‑in)

## Why These Technologies

**Next.js**
- Server‑rendering and routing built in for a fast, modern UI.
- App Router structure keeps screens and routing clean and predictable.

**React + TypeScript**
- Strong component model for complex UI flows.
- Type safety reduces runtime mistakes in clinical‑adjacent UX.

**Tailwind CSS**
- Rapid design iteration with consistent spacing/typography.
- Easy to keep a cohesive, calming visual system.

**Express**
- Lightweight and flexible API server.
- Simple to extend with new endpoints and services.

**Drizzle ORM**
- Typed database queries that align with TypeScript models.
- Keeps database logic readable and maintainable.

**Postgres**
- Reliable relational storage for sessions, scores, alerts, and history.

**Clerk**
- Offloads auth complexity and improves security.

**OneSignal**
- Simple web push setup with a single REST API.
- Good fit for notifying emergency contacts who opt in.

## Features

**Core**
- Symptom logging flow with severity, duration, stress, and optional vitals.
- Risk scoring (final score + risk level).
- Results page with a single, prominent score display.
- Timeline view with trend visualization and heatmap.

**Calming & Support**
- Symptom‑based breathing exercise selection.
- Ambient soundscapes for guided breathing.

**Emergency Support**
- India emergency numbers (102 and 108).
- Manual alert trigger to notify emergency contacts.

## Project Structure

```
Vital AI/
  client/   # Next.js frontend
  server/   # Express + Drizzle backend
```

## Environment Variables

**Server (`/Users/kunalsuthar/Documents/web-development/Vital AI/server`)**
- `DATABASE_URL` (required)
- `CLERK_SECRET_KEY` (required for auth)
- `CLERK_PUBLISHABLE_KEY` (required for auth)
- `ONESIGNAL_APP_ID` (required for push)
- `ONESIGNAL_REST_API_KEY` (required for push)
- `ONESIGNAL_API_URL` (optional, defaults to OneSignal notifications endpoint)

**Client (`/Users/kunalsuthar/Documents/web-development/Vital AI/client`)**
- `NEXT_PUBLIC_API_URL` (optional, defaults to `http://localhost:3005`)
- `NEXT_PUBLIC_ONESIGNAL_APP_ID` (required for web push)

## Running Locally

**Server**
```bash
cd /Users/kunalsuthar/Documents/web-development/Vital\ AI/server
npm install
npm run dev
```

**Client**
```bash
cd /Users/kunalsuthar/Documents/web-development/Vital\ AI/client
npm install
npm run dev
```

Client runs on `http://localhost:3000` and server runs on `http://localhost:3005` by default.

## Key API Routes

Server routes are mounted in `/Users/kunalsuthar/Documents/web-development/Vital AI/server/src/server.ts`.

Examples:
- `/api/sessions` — create sessions, fetch history
- `/api/risk-assessments` — risk summaries
- `/api/risk-history` — trend history
- `/api/calming-sessions` — assigned calming exercises
- `/api/emergency-contacts` — emergency contact management
- `/api/family-alert-log` — logged alerts

## Notes

- Push alerts require the emergency contact to opt in and provide a OneSignal subscription id.
- If OneSignal credentials are missing in development, alerts are logged to the console.
- Trend graph is computed on the client using existing session timestamps.

## Next Improvements (Optional)

- Add a dedicated admin tool for symptom weighting and calibration.
- Expand emergency contact preferences (notify on high risk, red flags, inactivity).
- Add more trend metrics and export options.
