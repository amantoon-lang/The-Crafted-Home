import { NextResponse } from "next/server";
import {
  loadCatalog,
  saveCatalog,
  createProductFromFields,
  parseKeyValueMessage,
  uploadCatalogImage,
  type CatalogData,
} from "@/data/catalog";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";

type TelegramUpdate = {
  message?: {
    message_id: number;
    text?: string;
    caption?: string;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
    photo?: { file_id: string; file_unique_id: string }[];
  };
};

function adminIds(): Set<string> {
  return new Set(
    (process.env.TELEGRAM_ADMIN_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

async function sendMessage(chatId: number, text: string) {
  const token = botToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
}

/** Download a Telegram photo and re-host it in the repo (never store bot-token URLs). */
async function hostTelegramPhoto(
  fileId: string,
  slugHint = "product"
): Promise<{ url?: string; error?: string }> {
  const token = botToken();
  const meta = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
  );
  const json = await meta.json();
  const path = json?.result?.file_path as string | undefined;
  if (!path) return { error: "Could not fetch Telegram file path" };

  const tgUrl = `https://api.telegram.org/file/bot${token}/${path}`;
  const fileRes = await fetch(tgUrl);
  if (!fileRes.ok) return { error: "Could not download Telegram photo" };
  const bytes = Buffer.from(await fileRes.arrayBuffer());
  const ext = path.includes(".") ? path.split(".").pop() : "jpg";
  const filename = `${slugHint}-${Date.now()}.${ext || "jpg"}`;
  const uploaded = await uploadCatalogImage(
    bytes,
    filename,
    `telegram: host image ${filename}`
  );
  if (!uploaded.ok || !uploaded.url) {
    return { error: uploaded.error || "Image upload failed" };
  }
  return { url: uploaded.url };
}

function helpText() {
  return `<b>The Crafted Home — Catalog Bot</b>

Prices are in <b>INR (₹)</b>.

<b>Commands</b>
/list — list products (shows slug to use in other commands)
/get &lt;slug or title&gt; — product details
/price &lt;slug&gt; &lt;amount&gt; — set price in ₹
/stock &lt;slug&gt; &lt;qty&gt; — set stock
/discount &lt;slug&gt; &lt;percent&gt; — set discount %
/image &lt;slug&gt; — send a photo with this caption, or /image &lt;slug&gt; &lt;url&gt;
/remove &lt;slug or title&gt; — remove a listing (alias: /delete)
/categories — list category slugs
/add — add product (multi-line):

<code>/add
title: Blue Ceramic Vase
price: 2499
category: ceramics
artisan: Priya
stock: 12
description: Handmade vase
image: https://...</code>

Or send a <b>photo</b> with caption using the same key:value lines (include title + price).

<b>Remove example</b>
<code>/remove blue-ceramic-vase</code>
or
<code>/remove Blue Ceramic Vase</code>`;
}

function findProductIndex(data: CatalogData, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return -1;
  const bySlug = data.products.findIndex((p) => p.slug.toLowerCase() === q);
  if (bySlug !== -1) return bySlug;
  const exactTitle = data.products.findIndex(
    (p) => p.title.toLowerCase() === q
  );
  if (exactTitle !== -1) return exactTitle;
  const partial = data.products.findIndex((p) =>
    p.title.toLowerCase().includes(q)
  );
  return partial;
}

function listProducts(data: CatalogData) {
  if (!data.products.length) return "Catalog is empty.";
  return data.products
    .map(
      (p, i) =>
        `${i + 1}. <b>${p.title}</b>\n   ${formatCurrency(p.price)} · stock ${p.stock}\n   slug: <code>${p.slug}</code>\n   remove: <code>/remove ${p.slug}</code>`
    )
    .join("\n\n");
}

export async function POST(req: Request) {
  const token = botToken();
  if (!token) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not configured" },
      { status: 500 }
    );
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const update = (await req.json()) as TelegramUpdate;
  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const fromId = String(message.from?.id || "");
  const admins = adminIds();

  if (admins.size && !admins.has(fromId)) {
    await sendMessage(chatId, "Sorry, only catalog admins can use this bot.");
    return NextResponse.json({ ok: true });
  }

  const text = (message.text || message.caption || "").trim();
  const [command, ...rest] = text.split(/\s+/);
  const cmd = (command || "").toLowerCase();

  try {
    if (cmd === "/start" || cmd === "/help") {
      await sendMessage(chatId, helpText());
      return NextResponse.json({ ok: true });
    }

    const catalog = await loadCatalog();

    if (cmd === "/list") {
      await sendMessage(chatId, listProducts(catalog));
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/categories") {
      const lines = catalog.categories
        .map((c) => `• <b>${c.name}</b> — <code>${c.slug}</code>`)
        .join("\n");
      await sendMessage(chatId, lines || "No categories.");
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/get") {
      const query = rest.join(" ").trim();
      const idx = findProductIndex(catalog, query);
      if (idx === -1) {
        await sendMessage(chatId, `Product not found: <code>${query || "?"}</code>`);
        return NextResponse.json({ ok: true });
      }
      const product = catalog.products[idx];
      await sendMessage(
        chatId,
        `<b>${product.title}</b>\nPrice: ${formatCurrency(product.price)}\nDiscount: ${product.discount}%\nStock: ${product.stock}\nCategory: ${product.category?.slug}\nArtisan: ${product.artisan}\nSlug: <code>${product.slug}</code>\nRemove: <code>/remove ${product.slug}</code>\nImage: ${product.images[0]}`
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/price" || cmd === "/stock" || cmd === "/discount" || cmd === "/image") {
      const slug = rest[0];
      const value = rest.slice(1).join(" ").trim();
      const idx = catalog.products.findIndex((p) => p.slug === slug);
      if (idx === -1) {
        await sendMessage(chatId, `Product not found: <code>${slug || "?"}</code>`);
        return NextResponse.json({ ok: true });
      }

      if (cmd === "/image") {
        let imageUrl = value;
        if (message.photo?.length) {
          const largest = message.photo[message.photo.length - 1];
          const hosted = await hostTelegramPhoto(largest.file_id, slug);
          if (hosted.error || !hosted.url) {
            await sendMessage(chatId, `Could not host photo: ${hosted.error}`);
            return NextResponse.json({ ok: true });
          }
          imageUrl = hosted.url;
        }
        if (!imageUrl) {
          await sendMessage(
            chatId,
            "Usage: /image &lt;slug&gt; &lt;https://...&gt;\nOr send a photo with caption: /image &lt;slug&gt;"
          );
          return NextResponse.json({ ok: true });
        }
        if (imageUrl.includes("api.telegram.org/file/bot")) {
          await sendMessage(
            chatId,
            "Don't use Telegram file links. Send the photo with caption /image &lt;slug&gt; instead."
          );
          return NextResponse.json({ ok: true });
        }
        catalog.products[idx].images = [
          imageUrl,
          ...catalog.products[idx].images.slice(1),
        ];
      } else {
        if (!value) {
          await sendMessage(chatId, `Usage: ${cmd} &lt;slug&gt; &lt;value&gt;`);
          return NextResponse.json({ ok: true });
        }
        if (cmd === "/price") {
          const price = Number(value);
          if (!Number.isFinite(price) || price <= 0) {
            await sendMessage(chatId, "Price must be a positive INR amount.");
            return NextResponse.json({ ok: true });
          }
          catalog.products[idx].price = Math.round(price);
        } else if (cmd === "/stock") {
          const stock = Number(value);
          if (!Number.isFinite(stock) || stock < 0) {
            await sendMessage(chatId, "Stock must be 0 or more.");
            return NextResponse.json({ ok: true });
          }
          catalog.products[idx].stock = Math.round(stock);
        } else if (cmd === "/discount") {
          const discount = Number(value);
          if (!Number.isFinite(discount) || discount < 0 || discount > 90) {
            await sendMessage(chatId, "Discount must be 0–90.");
            return NextResponse.json({ ok: true });
          }
          catalog.products[idx].discount = Math.round(discount);
        }
      }

      const saved = await saveCatalog(
        catalog,
        `telegram: ${cmd} ${slug} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(
        chatId,
        `Updated <b>${catalog.products[idx].title}</b>\n${formatCurrency(catalog.products[idx].price)} · stock ${catalog.products[idx].stock} · discount ${catalog.products[idx].discount}%`
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/delete" || cmd === "/remove") {
      const query = rest.join(" ").trim();
      if (!query) {
        await sendMessage(
          chatId,
          "Usage: <code>/remove &lt;slug or title&gt;</code>\nTip: send /list to copy a slug."
        );
        return NextResponse.json({ ok: true });
      }

      const idx = findProductIndex(catalog, query);
      if (idx === -1) {
        await sendMessage(
          chatId,
          `No listing found for <code>${query}</code>\nSend /list to see products.`
        );
        return NextResponse.json({ ok: true });
      }

      const removed = catalog.products[idx];
      catalog.products.splice(idx, 1);
      const saved = await saveCatalog(
        catalog,
        `telegram: remove ${removed.slug} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(
        chatId,
        `Removed listing <b>${removed.title}</b>\n<code>${removed.slug}</code>\nIt will disappear from the shop shortly.`
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/add" || message.photo?.length) {
      let body = text;
      if (cmd === "/add") {
        body = text.replace(/^\/add\s*/i, "");
      }
      const fields = parseKeyValueMessage(body);

      if (message.photo?.length && !fields.image) {
        const largest = message.photo[message.photo.length - 1];
        const hosted = await hostTelegramPhoto(
          largest.file_id,
          (fields.title || "product").toLowerCase().replace(/\s+/g, "-").slice(0, 40)
        );
        if (hosted.error || !hosted.url) {
          await sendMessage(
            chatId,
            `Photo received but could not host image: ${hosted.error || "unknown error"}`
          );
          return NextResponse.json({ ok: true });
        }
        fields.image = hosted.url;
      }

      const created = createProductFromFields(catalog, fields);
      if (created.error || !created.product) {
        await sendMessage(
          chatId,
          `${created.error || "Could not create product"}\n\nSend /help for the /add format.`
        );
        return NextResponse.json({ ok: true });
      }

      catalog.products.unshift(created.product);
      const saved = await saveCatalog(
        catalog,
        `telegram: add ${created.product.slug} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(
        chatId,
        `Added <b>${created.product.title}</b>\n${formatCurrency(created.product.price)}\n<code>${created.product.slug}</code>`
      );
      return NextResponse.json({ ok: true });
    }

    await sendMessage(chatId, "Unknown command. Send /help");
  } catch (e) {
    console.error(e);
    await sendMessage(
      chatId,
      `Error: ${e instanceof Error ? e.message : "something went wrong"}`
    );
  }

  return NextResponse.json({ ok: true });
}

/** Health / setup check */
export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    adminsConfigured: Boolean(process.env.TELEGRAM_ADMIN_IDS),
    githubConfigured: Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN),
    hint: "POST Telegram updates to this endpoint. See docs/TELEGRAM_CATALOG.md",
  });
}
