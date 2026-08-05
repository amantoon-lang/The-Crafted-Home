# Custom domain setup (Vercel)

## 1. Buy a domain

Recommended registrars: [Namecheap](https://www.namecheap.com/), [Porkbun](https://porkbun.com/), [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/).

Suggested names to check (verify live before buying):
- `shopcraftedhome.com`
- `getcraftedhome.com`
- `craftedhomemkt.com`
- `thecraftedhome.app`
- `thecraftedhome.co`
- `craftedhome.art`

> Note: `thecraftedhome.com` is already registered and not available for normal purchase.

## 2. Deploy the app to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import `amantoon-lang/The-Crafted-Home`.
2. Choose branch `cursor/crafted-home-marketplace-2184` (or `main` after merge).
3. Add environment variables from `.env.example` (use hosted Postgres: Neon / Supabase / Railway).
4. Deploy.

## 3. Attach your domain in Vercel

1. Project → **Settings** → **Domains** → Add `yourdomain.com` and `www.yourdomain.com`.
2. Create the DNS records Vercel shows at your registrar.

Typical records:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

(Always use the exact values Vercel displays for your project.)

## 4. Update app env after DNS is live

```env
NEXTAUTH_URL="https://yourdomain.com"
AUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
AUTH_TRUST_HOST="true"
```

Redeploy so Auth.js cookies and redirects use the new host.

## 5. Finish with the agent

Reply with the domain you purchased. The agent will update env docs and help verify DNS once records propagate.
