# The Crafted Home

Premium handmade home décor marketplace built with Next.js 15, Prisma, PostgreSQL, Auth.js, Stripe (pluggable), and Tailwind CSS.

## Features

- Landing page with hero, collections, featured/trending/bestsellers, artisans, testimonials
- Email/password auth + optional Google OAuth (Auth.js / JWT sessions)
- Product catalog with search autocomplete, category filters, price slider, sorting, pagination
- Product detail gallery with zoom, artisan story, wishlist, related products, reviews
- Cart with quantity controls, coupons, shipping & tax summary
- Checkout → payment (Stripe when configured, demo mode otherwise) → success/failure/retry
- Profile, orders, wishlist, addresses
- Admin dashboard (orders, customers, inventory, categories, coupons, analytics)
- Dark mode, Framer Motion micro-animations, toast notifications, skeletons, error boundaries

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn-style UI |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Auth | Auth.js (NextAuth v5) |
| Database | PostgreSQL + Prisma ORM |
| Payments | Stripe (swap-ready Razorpay stub in `src/lib/payments.ts`) |
| Images | Cloudinary-ready + Unsplash fallbacks |
| Deploy | Vercel |

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Set at minimum:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/crafted_home?schema=public"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

Optional: Google OAuth, Stripe, Cloudinary keys (see `.env.example`).

### 3. Database

```bash
npx prisma db push
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Accounts

Use **Create account** on `/signup` with a username, email, and password. Guest browsing still works without signing in.

For production, set `DATABASE_URL` (Postgres) so accounts persist in the database. If the database is unavailable, accounts can fall back to the file store when `GITHUB_TOKEN` is configured.

### Coupons

- `WELCOME10` — 10% off (min $50)
- `HANDMADE20` — $20 off (min $150)

## Architecture notes

- **API routes** under `src/app/api/*` own server mutations; UI talks to them via TanStack Query.
- **Payment provider interface** in `src/lib/payments.ts` isolates Stripe so Razorpay (or others) can replace it without touching checkout UI.
- **Prisma** models mirror the marketplace domain (users, products, cart, wishlist, orders, reviews, addresses, coupons).
- **Auth** uses JWT sessions for edge-friendly middleware; credentials + optional Google.
- Without `STRIPE_SECRET_KEY`, checkout runs in **demo payment mode** and auto-confirms.

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # start production server
npm run lint         # ESLint
npm run db:seed      # seed categories, products, users
npm run db:studio    # Prisma Studio
```

## Deploy on Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add environment variables (PostgreSQL from Neon/Supabase/Railway works well).
3. Build command: `prisma generate && next build` (already in `npm run build`).
4. Run migrations/seed against the production database once.
