# Update catalog via Telegram

Yes — you can manage The Crafted Home catalog from Telegram. Prices are in **Indian Rupees (₹)**.

## 1. Create a bot

1. Open Telegram and chat with [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow prompts
3. Copy the **bot token**

## 2. Get your Telegram user id

Chat with [@userinfobot](https://t.me/userinfobot) and copy your numeric **Id**.

## 3. Create a GitHub token (for saving catalog)

1. GitHub → Settings → Developer settings → Personal access tokens
2. Create a token with `repo` (contents) access to `amantoon-lang/The-Crafted-Home`
3. Copy the token

## 4. Add Vercel environment variables

In your Vercel project → Settings → Environment Variables:

```env
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_ADMIN_IDS=your_numeric_telegram_id
GITHUB_TOKEN=ghp_...
GITHUB_REPO=amantoon-lang/The-Crafted-Home
GITHUB_CATALOG_BRANCH=main
TELEGRAM_WEBHOOK_SECRET=any-random-string
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://www.jiacraft.com
AUTH_URL=https://www.jiacraft.com
NEXT_PUBLIC_APP_URL=https://www.jiacraft.com
```

Redeploy after saving env vars.

## 5. Set the webhook

Replace placeholders and run:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://www.jiacraft.com/api/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## 6. Use the bot

Message your bot:

| Command | Example |
|---------|---------|
| `/list` | list all products |
| `/get hand-carved-oak-serving-board` | details |
| `/price hand-carved-oak-serving-board 7999` | set price to ₹7,999 |
| `/stock hand-carved-oak-serving-board 20` | set stock |
| `/discount hand-carved-oak-serving-board 10` | 10% off |
| `/image slug https://...` | change image |
| `/delete slug` | remove product |
| `/categories` | category slugs |
| `/add` | multi-line add (see below) |

### Add a product

Categories: `ceramics` · `textiles` · `wood` · `light-scent`

```
/add
title: Brass Diya Set
price: 1299
category: light-scent
artisan: Local Atelier
stock: 25
description: Handcrafted brass diyas for home rituals
whymade: Made for evenings when light becomes a ritual
howmade: Cast and finished by hand in small Bhopal batches
image: https://images.unsplash.com/photo-1603006905004-abd84d2429d2?w=1200&q=80
```

Optional story fields: `story`, `whymade` (why it was made), `howmade` (how it was made).

Or send a **photo** with the same caption fields (include at least `title` and `price`).

Updates are written to `src/data/catalog.json` on GitHub and appear on the site within seconds (no manual redeploy needed for catalog content).
