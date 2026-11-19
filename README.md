# STRAP — AI-Powered Fitness SaaS Application

> **Train Smart. Recover Better. Progress Faster.**  
> **S**tart • **T**rain • **R**ecover • **A**dapt • **P**rogress

STRAP is a production-grade full-stack AI fitness SaaS application engineered with Next.js 14, TypeScript, Tailwind CSS, Supabase PostgreSQL, Google Gemini AI, and an idempotent UPI payment verification engine.

---

## ⚡ Quick Start

### 1. Project Location
The application is situated in your local scratch directory:
```
C:\Users\ANCHAL\.gemini\antigravity\scratch\strap
```
*(Recommended: Open this directory as your active workspace in Antigravity or VS Code).*

### 2. Run the Development Server
```bash
cd C:\Users\ANCHAL\.gemini\antigravity\scratch\strap
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. Build for Production
```bash
npm run build
npm run start
```

---

## 🔑 1-Click Demo Accounts

For zero-config testing right out of the box, visit `/login` and use the 1-click test buttons:

| Role | Name | Email | Permissions / Features |
|---|---|---|---|
| **Athlete** | Alex Mercer | `alex@strapfitness.com` | Full Premium athlete dashboard, AI splits, nutrition plans, recovery telemetry, workout tracker |
| **Admin** | Ashutosh (Lead Admin) | `ashutosh@strapfitness.com` | Protected Admin console (`/admin`), revenue KPI dashboard, UTR approval/rejection, pricing control |

---

## 💎 Features & Architecture

### 1. S-T-R-A-P 5-Pillar System
- **Start**: Multi-step biometric onboarding collecting weight, height, body fat %, training age, equipment, injuries, and goal.
- **Train**: AI-generated workout splits (Push/Pull/Legs, Upper/Lower, Bro Split, Full Body) with sets, reps, load, rest intervals, and substitutions.
- **Recover**: Sleep duration, fatigue level, muscle soreness, and real-time Readiness Score (0–100%).
- **Adapt**: Weekly AI re-calibration based on completed volume, RPE ratings, and recovery feedback.
- **Progress**: Personal record (PR) tracking, estimated 1-Rep Max calculations, and Recharts analytics.

### 2. Gemini AI Fitness Engine (`src/lib/gemini.ts`)
- Utilizes the official `@google/generative-ai` SDK on secure server-side API routes.
- Fully resilient: includes zero-latency sports-science fallback engines if an API key is not configured.
- Structured JSON output parsing with markdown fence stripping and validation.

### 3. Payment Architecture (UPI Manual + Gateway Ready)
- **Currency**: INR (₹)
- **Default Subscription Price**: ₹100 / month (Configurable in Admin Settings)
- **Designated UPI ID**: `ashutosh-k82@ptyes`
- **Security Rule**: Transactions are strictly saved as `PENDING`. Premium access is **never** granted merely on UTR entry or receipt submission. Premium activates only after manual admin bank verification and explicit approval in the `/admin` portal.

### 4. Dual Persistence Layer
- **Local In-Memory / File Store (`src/lib/store.ts`)**: Works instantly with zero setup, 25+ seed exercises, demo records, and local JSON persistence.
- **Supabase Cloud PostgreSQL (`schema.sql`)**: Ready for cloud deployment with Row Level Security (RLS) policies, triggers, and foreign keys.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx                # Root layout with dark theme & navbar/footer
│   ├── page.tsx                  # High-converting landing page
│   ├── login/                    # Email, Google OAuth & 1-click demo login
│   ├── signup/                   # Registration portal
│   ├── forgot-password/          # Supabase password reset
│   ├── onboarding/               # 4-step biometric onboarding wizard
│   ├── dashboard/                # Main athlete dashboard with telemetry
│   ├── profile/                  # Biometrics & measurements editor
│   ├── goals/                    # Goal & schedule configuration
│   ├── workout-planner/          # AI workout split viewer & generator
│   ├── workout-tracker/          # Live session logger with rest timers
│   ├── exercise-library/         # 25+ exercise database across 12 muscle categories
│   ├── nutrition/                # Metabolic nutrition blueprint & macro calculator
│   ├── recovery/                 # Sleep & fatigue tracking + readiness score
│   ├── analytics/                # Recharts volume, weight & 1RM progress charts
│   ├── ai-assistant/             # Gemini-powered fitness coach chat
│   ├── checkout/                 # UPI QR code, deep links & UTR submission
│   ├── payment-history/          # User transaction ledger
│   ├── pricing/                  # Free vs Premium plan comparison
│   ├── admin/                    # Admin portal (review payments, stats, settings)
│   ├── privacy/                  # Privacy policy
│   ├── terms/                    # Terms & Conditions + medical disclaimer
│   ├── contact/                  # Support form
│   └── api/                      # 20+ secure backend API endpoints
├── components/
│   ├── Navbar.tsx                # Sticky navbar with auth state & mobile drawer
│   ├── Footer.tsx                # Brand footer with quick links
│   └── PremiumModal.tsx          # Reusable paywall modal
├── lib/
│   ├── gemini.ts                 # Gemini API integration & fallbacks
│   ├── store.ts                  # Persistent local data store & seed exercises
│   ├── auth-helpers.ts           # Supabase + session cookie authentication
│   ├── utils.ts                  # BMR, TDEE, 1RM, currency & date utilities
│   └── supabase/                 # Client, Server & Admin Supabase SDK instances
└── types/
    └── index.ts                  # Complete TypeScript definitions
```

---

## 🛠️ Environment Configuration (`.env.local`)

```env
# Google Gemini AI
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-1.5-flash"

# Supabase PostgreSQL (Optional for local test, required for cloud DB)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Admin Access
ADMIN_EMAIL="ashutosh@strapfitness.com"

# Payment Destination
DEFAULT_UPI_ID="ashutosh-k82@ptyes"
SUBSCRIPTION_PRICE_INR="100"
```

---

## 🧪 Automated E2E Verification
You can run the end-to-end verification script anytime with:
```bash
node test-e2e.mjs
```
This tests all 22 page routes, authentication, UPI submission, admin approval, and all AI features.
