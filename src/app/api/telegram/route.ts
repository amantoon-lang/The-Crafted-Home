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

/** Parse TELEGRAM_ADMIN_IDS into user IDs and group/chat IDs. */
function parseAccessLists() {
  const all = [...adminIds()];
  const userIds = new Set<string>();
  const chatIds = new Set<string>();
  for (const id of all) {
    // Telegram group/supergroup/channel ids are negative (often -100...)
    if (id.startsWith("-")) chatIds.add(id);
    else userIds.add(id);
  }
  // Optional dedicated env for group chats
  for (const id of (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "").split(",")) {
    const t = id.trim();
    if (t) chatIds.add(t);
  }
  return { userIds, chatIds };
}

function isAuthorized(fromId: string, chatId: number): boolean {
  const { userIds, chatIds } = parseAccessLists();
  if (!userIds.size && !chatIds.size) return true; // open if nothing configured

  // Personal admin — can use bot in DM or any group
  if (fromId && userIds.has(fromId)) return true;

  // Whole-group access — any member in an allowed group chat
  if (chatIds.has(String(chatId))) return true;

  return false;
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
/list — list products
/get &lt;slug&gt; — product details
/price &lt;slug&gt; &lt;amount&gt; — set price in ₹
/stock &lt;slug&gt; &lt;qty&gt; — set stock
/discount &lt;slug&gt; &lt;percent&gt; — set discount %
/image &lt;slug&gt; &lt;url&gt; — set main image URL
/delete &lt;slug&gt; — remove product
/categories — list category slugs
/add — add product (send as multi-line message):

<code>/add
title: Blue Ceramic Vase
price: 2499
category: ceramics
artisan: Priya
stock: 12
description: Handmade vase
image: https://...</code>

Or send a <b>photo</b> with caption using the same key:value lines (include title + price).`;
}

function listProducts(data: CatalogData) {
  if (!data.products.length) return "Catalog is empty.";
  return data.products
    .map(
      (p, i) =>
        `${i + 1}. <b>${p.title}</b>\n   ${formatCurrency(p.price)} · stock ${p.stock}\n   <code>${p.slug}</code>`
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

  if (!isAuthorized(fromId, chatId)) {
    await sendMessage(
      chatId,
      `Sorry, only catalog admins can use this bot.\n\n` +
        `<b>Your user id:</b> <code>${fromId || "unknown"}</code>\n` +
        `<b>This chat id:</b> <code>${chatId}</code>\n\n` +
        `In Vercel, set <code>TELEGRAM_ADMIN_IDS</code> to your <b>user id</b> (from @userinfobot), ` +
        `or include this chat id to allow the whole group.\n` +
        `Example: <code>900108032,-1001234567890</code>\n` +
        `Then Redeploy.`
    );
    return NextResponse.json({ ok: true });
  }

  const text = (message.text || message.caption || "").trim();
  // In groups Telegram may send "/list@MyBot" — strip the @bot suffix
  const [rawCommand, ...rest] = text.split(/\s+/);
  const cmd = (rawCommand || "").toLowerCase().replace(/@\w+$/i, "");

  try {
    if (cmd === "/start" || cmd === "/help" || cmd === "/whoami" || cmd === "/id") {
      if (cmd === "/whoami" || cmd === "/id") {
        await sendMessage(
          chatId,
          `<b>Your user id:</b> <code>${fromId}</code>\n` +
            `<b>This chat id:</b> <code>${chatId}</code>\n` +
            `Put your user id in TELEGRAM_ADMIN_IDS (recommended).`
        );
        return NextResponse.json({ ok: true });
      }
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
      const slug = rest[0];
      const product = catalog.products.find((p) => p.slug === slug);
      if (!product) {
        await sendMessage(chatId, `Product not found: <code>${slug || "?"}</code>`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(
        chatId,
        `<b>${product.title}</b>\nPrice: ${formatCurrency(product.price)}\nDiscount: ${product.discount}%\nStock: ${product.stock}\nCategory: ${product.category?.slug}\nArtisan: ${product.artisan}\nSlug: <code>${product.slug}</code>\nImage: ${product.images[0]}`
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

    if (cmd === "/delete") {
      const slug = rest[0];
      const before = catalog.products.length;
      catalog.products = catalog.products.filter((p) => p.slug !== slug);
      if (catalog.products.length === before) {
        await sendMessage(chatId, `Product not found: <code>${slug || "?"}</code>`);
        return NextResponse.json({ ok: true });
      }
      const saved = await saveCatalog(
        catalog,
        `telegram: delete ${slug} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(chatId, `Deleted <code>${slug}</code>`);
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
