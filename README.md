<div align="center">

# STRAP

### Start · Train · Recover · Adapt · Progress

A full-stack fitness, workout, nutrition, and recovery platform built with Next.js 14, TypeScript, Tailwind CSS, Supabase PostgreSQL, and Google Gemini.

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white)

</div>

---

## Overview

**STRAP** brings structured athletic training, nutrition logging, recovery tracking, and coaching intelligence into one unified web application. It is organized around a 5-pillar training cycle:

1. **Start** — Biometric onboarding with dual height units (`cm` and `ft + in`) and personalized fitness goal setup.
2. **Train** — Structured powerlifting and muscle-building workout planning, live session tracking, and an exercise library.
3. **Recover** — Daily sleep, fatigue, and soreness check-ins producing a 0–100% Readiness Score.
4. **Adapt** — Weekly training re-calibration based on logged volume, RPE, and recovery trends.
5. **Progress** — Personal record (PR) tracking, estimated 1RM progression, and interactive Recharts analytics.

---

## Implemented Features

### Authentication & Onboarding
- Server-validated Supabase SSR authentication (`@supabase/ssr`, verified server-side via `auth.getUser()`).
- Email/password sign-up, sign-in, password reset flow (`/forgot-password`, `/reset-password`), and Google OAuth (`/auth/callback`).
- Post-signup biometric onboarding (`/onboarding`) with `cm` / `ft + in` height conversion support.
- Local-development-only auth fallback (`src/lib/dev-auth.ts`) strictly disabled in production.

### Workout Management & Analytics
- Dedicated `/workout-planner`, `/workout-tracker`, `/exercise-library`, and `/analytics` modules.
- Support for powerlifting and hypertrophy modes with sets, reps, load, RPE, RIR, and `%1RM` logging.
- Strength and estimated 1RM progression visualizations built with Recharts.

### Nutrition & Supplement Tracking
- Full nutrition logging module (`/nutrition`, `/api/nutrition/diary`, `/api/nutrition/foods`).
- Curated food and supplement database (including Indian foods and supplements), macro/micronutrient totals, hydration tracking, macro donut charts, barcode lookup, and optional USDA food search.

### Recovery & Readiness
- Daily recovery logging (`/recovery`) capturing sleep quality, soreness, and fatigue to calculate a 0–100% Readiness Score.

### AI Coach & Adaptation Engine
- Interactive `/ai-assistant` UI backed by five server-side API routes (`/api/ai/chat`, `/generate-plan`, `/nutrition-plan`, `/recovery-analysis`, `/weekly-adaptation`).
- Powered by Google Gemini (`@google/generative-ai`) in `src/lib/gemini.ts` with a 3.2-second fast timeout, 3-minute circuit-breaker, DB-backed per-hour/per-day rate limits (`src/lib/ai-service.ts`), and a local sports-science fallback engine when Gemini is unavailable or unconfigured.

### Payments & Admin Controls
- Manual UPI QR generation (`qrcode`) and UTR submission (`/api/payments/submit-manual`) enforcing a strict `pending` status until manually approved in `/admin`.
- Razorpay gateway API route scaffolding (`/api/payments/order`, `/verify`, `/webhook`) for automated payment integration.
- Role-restricted `/admin` dashboard and `/api/admin/*` endpoints validated server-side against `STRAP_ADMIN_EMAIL`.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework & Language** | Next.js `14.2` (App Router), React `18`, TypeScript `5.6` (`strict: true`) |
| **Styling & Visualization** | Tailwind CSS, `tailwindcss-animate`, Lucide React, Recharts, `canvas-confetti` |
| **Backend & Validation** | Next.js Route Handlers (REST APIs), Zod, Node.js |
| **Database & Auth** | Supabase (`@supabase/supabase-js`, `@supabase/ssr`), PostgreSQL (`schema.sql` + SQL migrations) |
| **AI Integration** | Google Gemini API (`@google/generative-ai`) |
| **Payments & Utilities** | `qrcode` (UPI QR generation), Razorpay route handlers |
| **Security Headers** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` in `next.config.mjs` |

---

## Project Structure

```text
strap/
├── scripts/                 # Verification & helper scripts (incl. test-auth-payments.mjs)
├── supabase/
│   └── migrations/          # Incremental PostgreSQL SQL migrations (6 files)
├── src/
│   ├── app/
│   │   ├── api/             # Route handlers: admin, ai, auth, exercises, nutrition, payments, user, workouts
│   │   ├── admin/           # Owner-restricted admin dashboard
│   │   ├── ai-assistant/    # AI Coach chat & plan generation UI
│   │   ├── analytics/       # Progress & strength charts
│   │   ├── auth/callback/   # OAuth callback route
│   │   ├── dashboard/       # Main athlete overview
│   │   ├── exercise-library/# Searchable exercise catalog
│   │   ├── nutrition/       # Food, supplement & hydration tracker
│   │   ├── onboarding/      # Biometric & goal onboarding flow
│   │   ├── recovery/        # Daily readiness & recovery check-ins
│   │   ├── workout-planner/ # Program & split builder
│   │   ├── workout-tracker/ # Live session logger with rest timers
│   │   └── ...              # Auth pages, checkout, pricing, profile, goals, legal pages
│   ├── components/          # Shared UI components (Navbar, Footer, AuthForm, PremiumModal, Providers, ui/)
│   ├── lib/                 # Core services (db.ts, gemini.ts, ai-service.ts, workout-service.ts, nutrition-calc.ts, auth-helpers.ts, supabase/)
│   ├── types/               # Shared TypeScript definitions
│   └── middleware.ts        # Route protection & session refresh middleware
├── schema.sql               # Base PostgreSQL database schema
├── .env.example             # Environment variable template (safe to commit)
├── next.config.mjs          # Next.js configuration & security headers
└── package.json             # Dependencies & npm scripts
```

---

## Getting Started

### Prerequisites

- **Node.js** `18+` and **npm**
- A **Supabase** project (for production/cloud PostgreSQL and Auth)
- A **Google AI Studio** API key (optional — falls back to the built-in sports-science engine if omitted)

### Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/ashu-codex/strap.git
cd strap

# 2. Install dependencies
npm install

# 3. Create your local environment file from the template
cp .env.example .env.local
```

Update `.env.local` with your own credentials (see [Environment Variables](#environment-variables) below).

### Database Setup (Supabase)

1. Open the SQL Editor in your Supabase project dashboard.
2. Run `schema.sql` to create the base tables, indexes, and policies.
3. Apply the SQL migrations in `supabase/migrations/` in chronological order.

*(When Supabase credentials are omitted in local development, `src/lib/db.ts` falls back to a local file store under `data/`, which is gitignored.)*

### Available Scripts

```bash
npm run dev        # Start the development server at http://localhost:3000
npm run build      # Create an optimized production build
npm run start      # Start the production server
npm run lint       # Run ESLint checks
npm run test:auth  # Run auth & payment verification script (scripts/test-auth-payments.mjs)
```

---

## Environment Variables

Copy `.env.example` to `.env.local` for local development or configure these variables in your hosting provider's dashboard (such as Vercel). **Never commit `.env.local` or real secrets to version control.**

| Variable | Scope | Required | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Public | Yes | Base URL without trailing slash (e.g., `http://localhost:3000` or production URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Cloud DB/Auth | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Cloud DB/Auth | Supabase anon / publishable key (safe for browser under RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Cloud DB/Auth | Supabase service-role key (never prefix with `NEXT_PUBLIC_`) |
| `STRAP_ADMIN_EMAIL` | **Server-only** | Admin Access | Email address authorized to access `/admin` and `/api/admin/*` |
| `GEMINI_API_KEY` | **Server-only** | Optional | Google Gemini API key from Google AI Studio |
| `GEMINI_MODEL` | **Server-only** | Optional | Gemini model identifier (default in `.env.example`: `gemini-3.8-flash`) |
| `NEXT_PUBLIC_UPI_ID` | Public | Payments | Merchant UPI ID used for manual QR checkout |
| `NEXT_PUBLIC_UPI_NAME` | Public | Payments | Display name shown on the generated UPI QR code |
| `NEXT_PUBLIC_PREMIUM_PRICE_INR` | Public | Payments | Default monthly subscription price in INR |
| `RAZORPAY_KEY_ID` | **Server-only** | Optional | Razorpay API key ID (optional automated gateway) |
| `RAZORPAY_KEY_SECRET` | **Server-only** | Optional | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | **Server-only** | Optional | Razorpay webhook verification secret |

---

## Deployment

STRAP is configured for deployment on **Vercel** with **Supabase** as the managed PostgreSQL and authentication backend:

1. Import the repository into Vercel.
2. Add all required production environment variables from `.env.example` in **Project Settings -> Environment Variables**.
3. Set `NEXT_PUBLIC_SITE_URL` to your verified production domain and add the same redirect URL in Supabase Auth settings.

---

## Future Improvements

- Finalize and verify live production Vercel deployment and add application screenshots.
- Organize root-level verification/debug scripts into `scripts/` and add GitHub Actions CI for lint and build checks.
- Complete automated Razorpay webhook verification alongside the manual UPI approval flow.
- Expand automated unit and end-to-end test coverage across workout, nutrition, and AI endpoints.
