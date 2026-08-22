# Connect jiacraft.com → The Crafted Home

Domain: **jiacraft.com** (GoDaddy, registered Aug 22, 2026)

## Do this now (required)

### Step 1 — Claim the Vercel deployment

Open this link and sign in / create a Vercel account:

**https://vercel.com/claim-deployment?code=2e736723-c0fb-44b9-8e92-b68e0fe08778**

Temporary preview (expires ~1 hour until claimed):

**https://temporary-express-oasis-ul7efrd.vercel.app**

### Step 2 — Add a Postgres database

In Vercel project → **Storage** → create **Neon** Postgres (or use Supabase).

Copy the connection string into Project → **Settings** → **Environment Variables**:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="paste-a-long-random-secret"
AUTH_TRUST_HOST="true"
NEXTAUTH_URL="https://jiacraft.com"
AUTH_URL="https://jiacraft.com"
NEXT_PUBLIC_APP_URL="https://jiacraft.com"
NEXT_PUBLIC_APP_NAME="The Crafted Home"
```

Redeploy, then from your machine (with that DATABASE_URL):

```bash
npx prisma db push
npm run db:seed
```

### Step 3 — Attach jiacraft.com in Vercel

Project → **Settings** → **Domains** → Add:

- `jiacraft.com`
- `www.jiacraft.com`

### Step 4 — GoDaddy DNS

GoDaddy → My Products → **jiacraft.com** → DNS → Manage DNS

Set these records (delete parking/A records that conflict):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `76.76.21.21` | 600 |
| CNAME | `www` | `cname.vercel-dns.com` | 600 |

If Vercel shows different values, use **those** instead.

### Step 5 — Wait & open

After DNS verifies (often 5–30 min), visit:

**https://jiacraft.com**

---

## Demo logins (after seed)

- Customer: `customer@craftedhome.com` / `password123`
- Admin: `admin@craftedhome.com` / `password123`
