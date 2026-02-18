# Swoop Partner Portal — MVP

A full-stack partner portal for Swoop Funding where partners can track referred businesses, deal statuses, and commissions. Includes an admin area for partner management.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Auth:** NextAuth.js (Credentials + Google OAuth)
- **Database:** SQLite (via Prisma ORM) — swap to PostgreSQL by changing `DATABASE_URL`
- **UI:** Tailwind CSS with custom component library
- **Email:** Nodemailer (Ethereal for local dev)

## Quick Start

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Copy environment file
cp .env.example .env
# Edit .env with your values (defaults work for local dev)

# 3. Set up database and generate Prisma client
npx prisma db push

# 4. Seed demo data from CSV
npm run db:seed

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Accounts

After seeding, these accounts are available:

### Admin
| Email | Password |
|-------|----------|
| `admin@swoopfunding.com` | `Admin!234` |

### Partner Users
| Email | Password | Partner |
|-------|----------|---------|
| `demo+acme-financial-advisors@example.com` | `Demo!234` | Acme Financial Advisors |
| `demo+sterling-partners@example.com` | `Demo!234` | Sterling Partners |
| `demo+globalreach-consulting@example.com` | `Demo!234` | GlobalReach Consulting |
| `demo+financehub-uk@example.com` | `Demo!234` | FinanceHub UK |
| `demo+pinnacle-advisory@example.com` | `Demo!234` | Pinnacle Advisory |

## Features

### Partner Dashboard (`/dashboard`)
- **Summary cards:** Total businesses, live deals, funded deals, commission due, weighted pipeline
- **Tabs:** Businesses | Deals | Commissions | Account Manager | UTM Links
- **Filters:** Date range, deal stage, application type
- **Commission logic:**
  - *Due:* `introducerFee` for funded deals
  - *Pipeline:* Weighted forecast — `introducerFee × stage_weight` (new: 0.1, submitted: 0.25, in_review: 0.5, approved: 0.8, funded: 1.0)
- Multi-tenancy: partners only see their own data

### Admin Dashboard (`/admin`)
- **Partners:** CRUD — add, edit, disable
- **Claims:** Approve/reject partner claim requests
- **Users:** View all registered partner users
- **UTM Links:** Generate and copy partner referral tracking links

### Auth
- Email/password registration with email verification
- Google OAuth SSO (configure `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`)
- Partner claim flow: register → pick partner → admin approves → dashboard access

## Project Structure

```
├── data/seed.csv              # Sample CSV data for seeding
├── prisma/schema.prisma       # Database schema
├── scripts/seed.ts            # CSV seed script
├── src/
│   ├── app/
│   │   ├── admin/             # Admin pages (partners, claims, users, UTM links)
│   │   ├── api/               # API routes
│   │   ├── auth/              # Auth pages (login, register, verify)
│   │   ├── dashboard/         # Partner dashboard
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── navbar.tsx         # Navigation bar
│   │   ├── providers.tsx      # Session provider
│   │   └── ui.tsx             # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── constants.ts       # Stage weights, labels, colors
│   │   ├── email.ts           # Email sending (Nodemailer)
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── types.ts           # TypeScript types + NextAuth augmentation
│   │   └── utils.ts           # Utility functions
│   └── middleware.ts          # Route protection
└── .env.example               # Environment variables template
```

## Data Model

- **Partner** — organisation with slug, status, referral tag
- **PartnerUser** — user account linked to a partner
- **AccountManager** — Swoop staff assigned to partners
- **Business** — referred companies scoped to a partner
- **Deal** — financing applications with stage/status tracking
- **Commission** — fee tracking per deal (pipeline/due/paid)
- **PartnerClaim** — user requests to join a partner
- **UTMLink** — generated referral tracking URLs

## CSV Seeding

The seed script reads `data/seed.csv` with these columns:

| Column | Description |
|--------|-------------|
| `partner_name` | Partner organisation name |
| `company_name` | Referred business name |
| `deal_count` | Number of deals to create (exploded to individual rows) |
| `application_type` | e.g., Business Loan, Invoice Finance |
| `application_amount` | Deal value in GBP |
| `introducer_fee` | Commission amount |
| `application_stage` | new, submitted, in_review, approved, funded, declined |

### Custom Seed Data

Replace `data/seed.csv` with your own data, keeping the same column headers, then run:

```bash
npx prisma db push --force-reset  # Reset database
npm run db:seed                    # Re-seed
```

## Switching to PostgreSQL

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `.env`:
   ```
   DATABASE_URL="postgresql://user:pass@localhost:5432/swoop_partners"
   ```

3. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```

## Connecting Live Swoop Data

To swap the seed source for live data:

1. **API Integration:** Replace the seed script with an API client that fetches from Swoop's internal APIs
2. **Webhook Sync:** Add webhook endpoints for deal status changes to keep data current
3. **Direct DB Read:** If sharing a database, update `DATABASE_URL` and adjust the Prisma schema to match the live schema
4. **CSV Import:** For batch updates, keep the CSV format and update `data/seed.csv` with production exports

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./dev.db` (SQLite) |
| `NEXTAUTH_URL` | App URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | JWT signing secret | — |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | — (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | — (optional) |
| `SMTP_HOST` | SMTP server host | — (Ethereal auto) |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | — (Ethereal auto) |
| `SMTP_PASS` | SMTP password | — (Ethereal auto) |
| `EMAIL_FROM` | Sender email address | `noreply@swoopfunding.com` |
| `ADMIN_PASSWORD` | Admin account password for seed | `Admin!234` |
