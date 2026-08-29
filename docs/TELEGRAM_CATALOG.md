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
# Your personal Telegram user id from @userinfobot (required for DMs).
# You can also add a group chat id (negative, like -100...) to allow that whole group.
TELEGRAM_ADMIN_IDS=900108032,-1001234567890
# Optional: extra group chat ids (comma-separated)
TELEGRAM_ALLOWED_CHAT_IDS=
# Optional: extra chats that only receive checkout order alerts
TELEGRAM_ORDER_CHAT_IDS=
GITHUB_TOKEN=ghp_...
GITHUB_REPO=amantoon-lang/The-Crafted-Home
GITHUB_CATALOG_BRANCH=main
TELEGRAM_WEBHOOK_SECRET=any-random-string
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://www.jiacraft.com
AUTH_URL=https://www.jiacraft.com
NEXT_PUBLIC_APP_URL=https://www.jiacraft.com
```

**Important:** `TELEGRAM_ADMIN_IDS` must include your **personal user id** (positive number from [@userinfobot](https://t.me/userinfobot)), not only the group id.  
You can add the group id too (starts with `-`) if you want anyone in that group to run catalog commands.

Checkout orders are also sent to every id in `TELEGRAM_ADMIN_IDS` (and optional `TELEGRAM_ORDER_CHAT_IDS`). Open a DM with the bot once so it can message you.

In a group, send `/id` to the bot to see both ids. Then Redeploy after updating Vercel.

## 5. Set the webhook

Replace placeholders and run:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://www.jiacraft.com/api/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## 6. Use the bot

Send **`/start`** or **`/menu`**. You get **5 global options** (reply keyboard + buttons):

| # | Menu | Actions |
|---|------|---------|
| 1 | **Products** | Add / Edit / Delete — each asks for **name → price → photo** |
| 2 | **Categories** | Add / Remove / Set image / Tag product — then pick which product belongs in the category |
| 3 | **Top Nav** | Add·Edit a slot / Remove a slot — attach Shop, Bestsellers, or a category |
| 4 | **Homepage** | Add (show) / Remove (hide) / Edit section items — attach products to each section |
| 5 | **Site Images** | Landing hero or section thumbnail — send **text** then **photo** (live on homepage) |

Send `/cancel` to abort a guided step.

### Site Images (menu 5️⃣)

1. Open **Site Images**
2. Tap **Landing / Hero** or a section (Collections, Featured, …)
3. Send the **text** (headline / section title), or `-` to keep
4. Send a **photo**, or `-` to keep the current image

Landing updates the homepage hero. Section slots update that section’s title and optional banner thumbnail.

### Advanced / legacy commands

Still work if you prefer typing them:

| Command | Example |
|---------|---------|
| `/list` | list all products |
| `/get hand-carved-oak-serving-board` | details |
| `/price hand-carved-oak-serving-board 7999` | set price to ₹7,999 |
| `/stock hand-carved-oak-serving-board 20` | set stock |
| `/discount hand-carved-oak-serving-board 10` | 10% off |
| `/image slug` | set cover photo (first image) |
| `/photos slug` | list photos + video |
| `/photo slug` | add a photo (up to 8; send photo with this caption) |
| `/delphoto slug n` | remove photo #n |
| `/video slug` | set product video (send video with this caption, under 18MB) |
| `/delvideo slug` | remove video |
| `/remove` or `/delete` | tappable list of products to delete |
| `/remove &lt;slug or title&gt;` | confirm delete for that listing |
| `/categories` | open Categories menu |
| `/nav` | open Top Nav menu |
| `/home` | open Homepage menu |
| `/add` | multi-line add (see below) |

### Homepage sections (`/home` or Homepage menu)

1. Tap **Add section** (show) / **Remove section** (hide) / **Edit section items**
2. Or tap a section name → Show / Hide / Pick items
3. Empty product picks = automatic defaults on the site

**Why Buy Handmade** and **Stories from Home** are show/hide only (fixed copy).

### Top header links (`/nav` or Top Nav menu)

1. Tap **Add / Edit slot** → pick one of the 4 links
2. Tap **Shop**, **Bestsellers**, or a collection
3. Or tap **Remove slot** to reset a link back to Shop

Categories are also managed from the **Categories** menu.

### Product photos & video

Each listing can have **up to 8 photos** (use at least 5 for a rich gallery) and **1 video**.

After `/add`, send more photos one by one:

```text
# caption on each photo
/photo wooden-mirror-artwork-pooja-thali
```

Set or replace the cover (first) photo:

```text
/image wooden-mirror-artwork-pooja-thali
```

List media:

```text
/photos wooden-mirror-artwork-pooja-thali
```

Remove photo #2:

```text
/delphoto wooden-mirror-artwork-pooja-thali 2
```

Add a video (Telegram video or file under 18MB):

```text
/video wooden-mirror-artwork-pooja-thali
```

Or in `/add` fields:

```text
images: https://.../1.jpg, https://.../2.jpg, https://.../3.jpg
video: https://.../clip.mp4
```

### Categories

List:

```text
/categories
```

Add (or send a **photo** with the same caption):

```text
/addcategory
name: Textiles
slug: textiles
image: https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80
```

Edit name or image:

```text
/setcategory textiles
name: Soft Textiles
```

Or send a photo with caption `/setcategory textiles`.

Remove (only if no products use it) — `/rmcategory` for a tappable list, or:

```text
/rmcategory textiles
```

### Delete a listing

Send `/remove` or `/delete` with **no arguments** — the bot lists every product as tappable buttons. Tap one, then confirm **Yes, delete** or **Cancel**.

You can also delete by slug or title:

```text
/remove wooden-mirror
/delete Blue Ceramic Vase
```

### Add a product

```
/add
title: Brass Diya Set
price: 1299
category: candles
artisan: Local Atelier
stock: 25
description: Handcrafted brass diyas for home rituals
image: https://images.unsplash.com/photo-1603006905004-abd84d2429d2?w=1200&q=80
```

Or send a **photo** with the same caption fields (include at least `title` and `price`).

Updates are written to `src/data/catalog.json` on GitHub and appear on the site within seconds (no manual redeploy needed for catalog content).

## Checkout → Telegram

On the website checkout page:

1. Customer can tap **Use my location** to fill address fields (and pin lat/lng).
2. On **Place order**, the shop receives a Telegram message with customer details, cart lines, and a Google Maps link when location was shared.

Messages go to ids in `TELEGRAM_ADMIN_IDS` and optional `TELEGRAM_ORDER_CHAT_IDS`.
