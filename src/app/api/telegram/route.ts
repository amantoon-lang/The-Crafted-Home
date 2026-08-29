import { NextResponse } from "next/server";
import {
  loadCatalog,
  saveCatalog,
  createProductFromFields,
  createCategoryFromFields,
  applyCategoryUpdate,
  findCategoryIndex,
  parseKeyValueMessage,
  uploadCatalogImage,
  uploadCatalogVideo,
  MAX_PRODUCT_IMAGES,
  ensureTopNav,
  setTopNavSlot,
  clearTopNavCategory,
  type CatalogData,
  type TopNavSlot,
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
    video?: {
      file_id: string;
      file_unique_id: string;
      mime_type?: string;
      file_size?: number;
      file_name?: string;
    };
    document?: {
      file_id: string;
      file_unique_id: string;
      mime_type?: string;
      file_size?: number;
      file_name?: string;
    };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id: number; username?: string; first_name?: string };
    message?: {
      message_id: number;
      chat: { id: number; type: string };
      text?: string;
    };
  };
};

type InlineButton = { text: string; callback_data: string };

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

async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: { inline_keyboard: InlineButton[][] }
) {
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
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

async function answerCallback(callbackQueryId: string, text?: string) {
  const token = botToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  });
}

async function editMessage(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: { inline_keyboard: InlineButton[][] }
) {
  const token = botToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

function truncateLabel(text: string, max = 56) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function buildRemovePicker(catalog: CatalogData) {
  const products = catalog.products.slice(0, 40);
  const inline_keyboard: InlineButton[][] = products.map((p) => [
    {
      text: truncateLabel(`🗑 ${p.title} · ${formatCurrency(p.price)}`),
      callback_data: `rmpick:${p.id}`,
    },
  ]);
  inline_keyboard.push([{ text: "Cancel", callback_data: "rmno" }]);
  return { inline_keyboard };
}

/** Download a Telegram file and re-host it in the repo (never store bot-token URLs). */
async function hostTelegramFile(
  fileId: string,
  slugHint = "product",
  kind: "image" | "video" = "image"
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
  if (!fileRes.ok) {
    return { error: `Could not download Telegram ${kind}` };
  }
  const bytes = Buffer.from(await fileRes.arrayBuffer());
  const ext = path.includes(".") ? path.split(".").pop() : kind === "video" ? "mp4" : "jpg";
  const filename = `${slugHint}-${Date.now()}.${ext || (kind === "video" ? "mp4" : "jpg")}`;

  if (kind === "video") {
    const uploaded = await uploadCatalogVideo(
      bytes,
      filename,
      `telegram: host video ${filename}`
    );
    if (!uploaded.ok || !uploaded.url) {
      return { error: uploaded.error || "Video upload failed" };
    }
    return { url: uploaded.url };
  }

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

async function hostTelegramPhoto(fileId: string, slugHint = "product") {
  return hostTelegramFile(fileId, slugHint, "image");
}

function helpText() {
  return `<b>The Crafted Home — Catalog Bot</b>

Prices are in <b>INR (₹)</b>.

<b>Products</b>
/list — list products
/get &lt;slug&gt; — product details
/price &lt;slug&gt; &lt;amount&gt; — set price in ₹
/stock &lt;slug&gt; &lt;qty&gt; — set stock
/discount &lt;slug&gt; &lt;percent&gt; — set discount %
/photos &lt;slug&gt; — list photos + video
/photo &lt;slug&gt; — add a photo (up to ${MAX_PRODUCT_IMAGES}; send photo with this caption)
/image &lt;slug&gt; — set cover photo (first image)
/delphoto &lt;slug&gt; &lt;n&gt; — remove photo #n
/video &lt;slug&gt; — set product video (send video with this caption)
/delvideo &lt;slug&gt; — remove video
/remove — tappable list to delete a listing (alias: /delete)
/add — add product (multi-line or photo + caption)

<b>Categories</b>
/categories — list + add / edit / remove
/addcategory — add a category
/setcategory &lt;slug&gt; — rename or change image
/rmcategory — remove a category

<b>Top header</b>
/nav — edit the 4 top links (Shop, Bestsellers, collections)

Each product can have <b>up to ${MAX_PRODUCT_IMAGES} photos</b> and <b>1 video</b>.`;
}

function describeNavSlot(slot: TopNavSlot, i: number) {
  if (slot.type === "shop") return `${i + 1}. <b>${slot.label || "Shop"}</b> → all products`;
  if (slot.type === "bestsellers") {
    return `${i + 1}. <b>${slot.label || "Bestsellers"}</b> → bestsellers`;
  }
  return `${i + 1}. <b>${slot.label}</b> → /shop?category=${slot.categorySlug}`;
}

/** Top-nav slots only — no category dump. */
function listTopNav(data: CatalogData) {
  const slots = ensureTopNav(data);
  return (
    `<b>Top header links</b>\n` +
    `Tap a button below to change that link.\n\n` +
    slots.map((s, i) => describeNavSlot(s, i)).join("\n")
  );
}

function buildNavHubKeyboard(data: CatalogData) {
  const slots = ensureTopNav(data);
  const slotButtons: InlineButton[] = slots.map((s, i) => ({
    text: truncateLabel(`${i + 1}. ${s.label || s.type}`, 28),
    callback_data: `navpick:${i}`,
  }));
  // Two rows of two for readability
  return {
    inline_keyboard: [
      slotButtons.slice(0, 2),
      slotButtons.slice(2, 4),
      [{ text: "Refresh", callback_data: "navrefresh" }],
    ],
  };
}

function buildPinNavKeyboard(categorySlug: string) {
  return {
    inline_keyboard: [
      [
        { text: "Slot 1", callback_data: `pinnav:0:${categorySlug}` },
        { text: "Slot 2", callback_data: `pinnav:1:${categorySlug}` },
        { text: "Slot 3", callback_data: `pinnav:2:${categorySlug}` },
        { text: "Slot 4", callback_data: `pinnav:3:${categorySlug}` },
      ],
      [{ text: "Skip", callback_data: "pinnavskip" }],
    ],
  };
}

function buildCollectionPicker(productId: string, catalog: CatalogData) {
  const cats = catalog.categories.slice(0, 20);
  const rows: InlineButton[][] = cats.map((c) => [
    {
      text: truncateLabel(c.name),
      callback_data: `prodcat:${productId}:${c.id}`,
    },
  ]);
  rows.push([{ text: "Keep current", callback_data: "prodcatskip" }]);
  return { inline_keyboard: rows };
}

function buildNavTypePicker(slotIndex: number, catalog: CatalogData) {
  const current = ensureTopNav(catalog)[slotIndex];
  const rows: InlineButton[][] = [
    [
      { text: "Shop", callback_data: `navtype:${slotIndex}:shop` },
      { text: "Bestsellers", callback_data: `navtype:${slotIndex}:best` },
    ],
  ];
  for (const c of catalog.categories.slice(0, 24)) {
    const mark =
      current?.type === "category" && current.categorySlug === c.slug
        ? "✓ "
        : "";
    rows.push([
      {
        text: truncateLabel(`${mark}${c.name}`),
        callback_data: `navcat:${slotIndex}:${c.slug}`,
      },
    ]);
  }
  rows.push([{ text: "« Back", callback_data: "navrefresh" }]);
  return { inline_keyboard: rows };
}

function navTypePickerIntro(slotIndex: number, catalog: CatalogData) {
  const current = ensureTopNav(catalog)[slotIndex];
  const now =
    current?.type === "shop"
      ? "Shop"
      : current?.type === "bestsellers"
        ? "Bestsellers"
        : current?.label || current?.categorySlug || "?";
  return (
    `<b>Edit top link ${slotIndex + 1}</b>\n` +
    `Now: <b>${now}</b>\n\n` +
    `Choose Shop, Bestsellers, or a collection:`
  );
}

function buildCategoriesHubKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "Add category", callback_data: "navmanage:add" },
        { text: "Edit category", callback_data: "navmanage:edit" },
      ],
      [{ text: "Remove category", callback_data: "navmanage:remove" }],
      [{ text: "Close", callback_data: "navcancel" }],
    ],
  };
}

function buildCategoryEditPicker(catalog: CatalogData) {
  const cats = catalog.categories.slice(0, 30);
  const inline_keyboard: InlineButton[][] = cats.map((c) => [
    {
      text: truncateLabel(c.name),
      callback_data: `navedit:${c.slug}`,
    },
  ]);
  inline_keyboard.push([{ text: "« Back", callback_data: "cathub" }]);
  return { inline_keyboard };
}

function mediaSummary(product: {
  title: string;
  slug: string;
  images: string[];
  video?: string | null;
}) {
  const photoLines = product.images
    .map((url, i) => `${i + 1}. ${url}`)
    .join("\n");
  return (
    `<b>${product.title}</b>\n<code>${product.slug}</code>\n` +
    `Photos: ${product.images.length}/${MAX_PRODUCT_IMAGES}\n` +
    (photoLines ? `${photoLines}\n` : "") +
    `Video: ${product.video || "none"}`
  );
}

function listCategories(data: CatalogData) {
  if (!data.categories.length) {
    return "No categories yet. Send /addcategory to create one.";
  }
  return (
    `<b>Categories</b>\n\n` +
    data.categories
      .map((c, i) => {
        const count = data.products.filter((p) => p.categoryId === c.id).length;
        return `${i + 1}. <b>${c.name}</b>\n   <code>${c.slug}</code> · ${count} products`;
      })
      .join("\n\n")
  );
}

function buildCategoryRemovePicker(catalog: CatalogData) {
  const cats = catalog.categories.slice(0, 40);
  const inline_keyboard: InlineButton[][] = cats.map((c, i) => [
    {
      text: truncateLabel(`${i + 1}. ${c.name}`),
      callback_data: `catrmpick:${c.id}`,
    },
  ]);
  inline_keyboard.push([{ text: "« Back", callback_data: "cathub" }]);
  return { inline_keyboard };
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

function findProductIndex(data: CatalogData, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return -1;
  const bySlug = data.products.findIndex((p) => p.slug.toLowerCase() === q);
  if (bySlug !== -1) return bySlug;
  const exactTitle = data.products.findIndex((p) => p.title.toLowerCase() === q);
  if (exactTitle !== -1) return exactTitle;
  return data.products.findIndex((p) => p.title.toLowerCase().includes(q));
}

async function removeProductById(
  productId: string,
  actor: string
): Promise<{ ok: boolean; title?: string; slug?: string; error?: string }> {
  const catalog = await loadCatalog();
  const idx = catalog.products.findIndex((p) => p.id === productId);
  if (idx === -1) return { ok: false, error: "Product not found (maybe already removed)." };
  const removed = catalog.products[idx];
  catalog.products.splice(idx, 1);
  const saved = await saveCatalog(
    catalog,
    `telegram: remove ${removed.slug} by ${actor}`
  );
  if (!saved.ok) return { ok: false, error: saved.error || "Failed to save" };
  return { ok: true, title: removed.title, slug: removed.slug };
}

async function removeCategoryById(
  categoryId: string,
  actor: string
): Promise<{ ok: boolean; name?: string; slug?: string; error?: string }> {
  const catalog = await loadCatalog();
  const idx = catalog.categories.findIndex((c) => c.id === categoryId);
  if (idx === -1) {
    return { ok: false, error: "Category not found (maybe already removed)." };
  }
  const removed = catalog.categories[idx];
  const inUse = catalog.products.filter((p) => p.categoryId === categoryId).length;
  if (inUse > 0) {
    return {
      ok: false,
      error: `${inUse} product(s) still use this category. Move or delete those listings first.`,
    };
  }
  if (catalog.categories.length <= 1) {
    return { ok: false, error: "Keep at least one category." };
  }
  catalog.categories.splice(idx, 1);
  clearTopNavCategory(catalog, removed.slug);
  const saved = await saveCatalog(
    catalog,
    `telegram: remove category ${removed.slug} by ${actor}`
  );
  if (!saved.ok) return { ok: false, error: saved.error || "Failed to save" };
  return { ok: true, name: removed.name, slug: removed.slug };
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

  // Inline button presses (delete picker)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat.id;
    const messageId = cb.message?.message_id;
    const fromId = String(cb.from?.id || "");
    const data = cb.data || "";

    if (chatId == null || messageId == null) {
      await answerCallback(cb.id);
      return NextResponse.json({ ok: true });
    }

    if (!isAuthorized(fromId, chatId)) {
      await answerCallback(cb.id, "Not authorized");
      return NextResponse.json({ ok: true });
    }

    try {
      if (data === "rmno") {
        await answerCallback(cb.id, "Cancelled");
        await editMessage(chatId, messageId, "Remove cancelled.");
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("rmpick:")) {
        const productId = data.slice("rmpick:".length);
        const catalog = await loadCatalog();
        const product = catalog.products.find((p) => p.id === productId);
        if (!product) {
          await answerCallback(cb.id, "Not found");
          await editMessage(
            chatId,
            messageId,
            "That listing is gone. Send /remove again."
          );
          return NextResponse.json({ ok: true });
        }
        await answerCallback(cb.id);
        await editMessage(
          chatId,
          messageId,
          `Delete <b>${product.title}</b>?\n<code>${product.slug}</code>\n${formatCurrency(product.price)}`,
          {
            inline_keyboard: [
              [
                { text: "Yes, delete", callback_data: `rmyes:${product.id}` },
                { text: "Cancel", callback_data: "rmno" },
              ],
            ],
          }
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("rmyes:")) {
        const productId = data.slice("rmyes:".length);
        const result = await removeProductById(
          productId,
          cb.from?.username || fromId
        );
        if (!result.ok) {
          await answerCallback(cb.id, "Failed");
          await editMessage(
            chatId,
            messageId,
            `Could not remove listing: ${result.error}`
          );
          return NextResponse.json({ ok: true });
        }
        await answerCallback(cb.id, "Deleted");
        await editMessage(
          chatId,
          messageId,
          `Removed <b>${result.title}</b>\n<code>${result.slug}</code>`
        );
        return NextResponse.json({ ok: true });
      }

      if (data === "catrmno") {
        const catalog = await loadCatalog();
        await answerCallback(cb.id, "Cancelled");
        await editMessage(
          chatId,
          messageId,
          `${listCategories(catalog)}\n\nManage categories:`,
          buildCategoriesHubKeyboard()
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("catrmpick:")) {
        const categoryId = data.slice("catrmpick:".length);
        const catalog = await loadCatalog();
        const category = catalog.categories.find((c) => c.id === categoryId);
        if (!category) {
          await answerCallback(cb.id, "Not found");
          await editMessage(
            chatId,
            messageId,
            "That category is gone. Send /rmcategory again."
          );
          return NextResponse.json({ ok: true });
        }
        const count = catalog.products.filter(
          (p) => p.categoryId === categoryId
        ).length;
        await answerCallback(cb.id);
        await editMessage(
          chatId,
          messageId,
          `Delete category <b>${category.name}</b>?\n<code>${category.slug}</code>\n${count} product(s) assigned` +
            (count > 0 ? "\n(must be 0 to delete)" : ""),
          {
            inline_keyboard: [
              [
                {
                  text: "Yes, delete",
                  callback_data: `catrmyes:${category.id}`,
                },
                { text: "Cancel", callback_data: "catrmno" },
              ],
            ],
          }
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("catrmyes:")) {
        const categoryId = data.slice("catrmyes:".length);
        const result = await removeCategoryById(
          categoryId,
          cb.from?.username || fromId
        );
        if (!result.ok) {
          await answerCallback(cb.id, "Failed");
          await editMessage(
            chatId,
            messageId,
            `Could not remove category: ${result.error}`
          );
          return NextResponse.json({ ok: true });
        }
        await answerCallback(cb.id, "Deleted");
        await editMessage(
          chatId,
          messageId,
          `Removed category <b>${result.name}</b>\n<code>${result.slug}</code>\n\n${listCategories(await loadCatalog())}`,
          buildCategoriesHubKeyboard()
        );
        return NextResponse.json({ ok: true });
      }

      if (data === "pinnavskip" || data === "navcancel" || data === "prodcatskip") {
        await answerCallback(cb.id, "OK");
        await editMessage(
          chatId,
          messageId,
          data === "prodcatskip"
            ? "Kept current collection."
            : data === "pinnavskip"
              ? "Skipped top-nav pin."
              : "Closed."
        );
        return NextResponse.json({ ok: true });
      }

      if (data === "navrefresh") {
        const catalog = await loadCatalog();
        await answerCallback(cb.id);
        await editMessage(
          chatId,
          messageId,
          listTopNav(catalog),
          buildNavHubKeyboard(catalog)
        );
        return NextResponse.json({ ok: true });
      }

      if (data === "cathub") {
        const catalog = await loadCatalog();
        await answerCallback(cb.id);
        await editMessage(
          chatId,
          messageId,
          `${listCategories(catalog)}\n\nManage categories:`,
          buildCategoriesHubKeyboard()
        );
        return NextResponse.json({ ok: true });
      }

      if (data === "navmanage:add") {
        await answerCallback(cb.id);
        await editMessage(
          chatId,
          messageId,
          `Send one message:\n\n<code>/addcategory\nname: Ceramics\npin: 3</code>\n\n<code>pin</code> (1–4) is optional.`,
          {
            inline_keyboard: [[{ text: "« Back", callback_data: "cathub" }]],
          }
        );
        return NextResponse.json({ ok: true });
      }

      if (data === "navmanage:edit") {
        const catalog = await loadCatalog();
        if (!catalog.categories.length) {
          await answerCallback(cb.id, "None");
          await editMessage(chatId, messageId, "No categories to edit.");
          return NextResponse.json({ ok: true });
        }
        await answerCallback(cb.id);
        await editMessage(
          chatId,
          messageId,
          "Pick a category to rename / change image:",
          buildCategoryEditPicker(catalog)
        );
        return NextResponse.json({ ok: true });
      }

      if (data === "navmanage:remove") {
        const catalog = await loadCatalog();
        if (!catalog.categories.length) {
          await answerCallback(cb.id, "None");
          await editMessage(chatId, messageId, "No categories to remove.");
          return NextResponse.json({ ok: true });
        }
        await answerCallback(cb.id);
        await editMessage(
          chatId,
          messageId,
          "Tap a category to remove (must have 0 products):",
          buildCategoryRemovePicker(catalog)
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("navedit:")) {
        const slug = data.slice("navedit:".length);
        await answerCallback(cb.id);
        await editMessage(
          chatId,
          messageId,
          `Rename / change image — send:\n\n<code>/setcategory ${slug}\nname: New Name</code>\n\nOr a photo with caption <code>/setcategory ${slug}</code>`,
          {
            inline_keyboard: [[{ text: "« Back", callback_data: "cathub" }]],
          }
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("pinnav:")) {
        const parts = data.split(":");
        const slotIndex = Number(parts[1]);
        const categorySlug = parts.slice(2).join(":");
        const catalog = await loadCatalog();
        const applied = setTopNavSlot(catalog, slotIndex, {
          type: "category",
          categorySlug,
          label: "",
        });
        if (applied.error) {
          await answerCallback(cb.id, "Failed");
          await editMessage(chatId, messageId, applied.error);
          return NextResponse.json({ ok: true });
        }
        const saved = await saveCatalog(
          catalog,
          `telegram: pin nav slot ${slotIndex + 1} → ${categorySlug} by ${cb.from?.username || fromId}`
        );
        if (!saved.ok) {
          await answerCallback(cb.id, "Failed");
          await editMessage(chatId, messageId, `Failed to save: ${saved.error}`);
          return NextResponse.json({ ok: true });
        }
        await answerCallback(cb.id, "Saved");
        await editMessage(
          chatId,
          messageId,
          listTopNav(catalog),
          buildNavHubKeyboard(catalog)
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("navpick:")) {
        const slotIndex = Number(data.slice("navpick:".length));
        const catalog = await loadCatalog();
        ensureTopNav(catalog);
        await answerCallback(cb.id);
        await editMessage(
          chatId,
          messageId,
          navTypePickerIntro(slotIndex, catalog),
          buildNavTypePicker(slotIndex, catalog)
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("navtype:")) {
        const [, idxStr, kind] = data.split(":");
        const slotIndex = Number(idxStr);
        const catalog = await loadCatalog();
        const applied = setTopNavSlot(catalog, slotIndex, {
          type: kind === "best" ? "bestsellers" : "shop",
          label: kind === "best" ? "Bestsellers" : "Shop",
        });
        if (applied.error) {
          await answerCallback(cb.id, "Failed");
          await editMessage(chatId, messageId, applied.error);
          return NextResponse.json({ ok: true });
        }
        const saved = await saveCatalog(
          catalog,
          `telegram: set nav slot ${slotIndex + 1} by ${cb.from?.username || fromId}`
        );
        if (!saved.ok) {
          await answerCallback(cb.id, "Failed");
          await editMessage(chatId, messageId, `Failed to save: ${saved.error}`);
          return NextResponse.json({ ok: true });
        }
        await answerCallback(cb.id, "Saved");
        await editMessage(
          chatId,
          messageId,
          listTopNav(catalog),
          buildNavHubKeyboard(catalog)
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("navcat:")) {
        const parts = data.split(":");
        const slotIndex = Number(parts[1]);
        const categorySlug = parts.slice(2).join(":");
        const catalog = await loadCatalog();
        const applied = setTopNavSlot(catalog, slotIndex, {
          type: "category",
          categorySlug,
        });
        if (applied.error) {
          await answerCallback(cb.id, "Failed");
          await editMessage(chatId, messageId, applied.error);
          return NextResponse.json({ ok: true });
        }
        const saved = await saveCatalog(
          catalog,
          `telegram: set nav slot ${slotIndex + 1} → ${categorySlug} by ${cb.from?.username || fromId}`
        );
        if (!saved.ok) {
          await answerCallback(cb.id, "Failed");
          await editMessage(chatId, messageId, `Failed to save: ${saved.error}`);
          return NextResponse.json({ ok: true });
        }
        await answerCallback(cb.id, "Saved");
        await editMessage(
          chatId,
          messageId,
          listTopNav(catalog),
          buildNavHubKeyboard(catalog)
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("prodcat:")) {
        const parts = data.split(":");
        const productId = parts[1];
        const categoryId = parts.slice(2).join(":");
        const catalog = await loadCatalog();
        const product = catalog.products.find((p) => p.id === productId);
        const category = catalog.categories.find((c) => c.id === categoryId);
        if (!product || !category) {
          await answerCallback(cb.id, "Not found");
          await editMessage(chatId, messageId, "Product or collection not found.");
          return NextResponse.json({ ok: true });
        }
        product.categoryId = category.id;
        product.category = { name: category.name, slug: category.slug };
        const saved = await saveCatalog(
          catalog,
          `telegram: set collection ${product.slug} → ${category.slug} by ${cb.from?.username || fromId}`
        );
        if (!saved.ok) {
          await answerCallback(cb.id, "Failed");
          await editMessage(chatId, messageId, `Failed to save: ${saved.error}`);
          return NextResponse.json({ ok: true });
        }
        await answerCallback(cb.id, "Saved");
        await editMessage(
          chatId,
          messageId,
          `<b>${product.title}</b> is in collection <b>${category.name}</b>\n<code>${category.slug}</code>`
        );
        return NextResponse.json({ ok: true });
      }

      await answerCallback(cb.id);
    } catch (e) {
      console.error(e);
      await answerCallback(cb.id, "Error");
    }
    return NextResponse.json({ ok: true });
  }

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
      await sendMessage(
        chatId,
        `${listCategories(catalog)}\n\nManage categories:`,
        buildCategoriesHubKeyboard()
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/addcategory" || cmd === "/addcat") {
      const body = text.replace(
        /^\/(?:addcategory|addcat)(?:@\w+)?\s*/i,
        ""
      );
      const fields = parseKeyValueMessage(body);

      if (message.photo?.length && !fields.image) {
        const largest = message.photo[message.photo.length - 1];
        const hosted = await hostTelegramPhoto(
          largest.file_id,
          (fields.name || "category")
            .toLowerCase()
            .replace(/\s+/g, "-")
            .slice(0, 40)
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

      const created = createCategoryFromFields(catalog, fields);
      if (created.error || !created.category) {
        await sendMessage(
          chatId,
          `${created.error || "Could not create category"}\n\n<code>/addcategory
name: Textiles
slug: textiles
pin: 3
image: https://...</code>\n\nOr send a photo with that caption. <code>pin</code> (1–4) is optional.`
        );
        return NextResponse.json({ ok: true });
      }

      catalog.categories.push(created.category);

      // Optional pin: 1–4 puts the new category in that top-nav slot
      const pinRaw = fields.pin || fields.nav || fields.slot;
      const pinNum = pinRaw ? Number(pinRaw) : NaN;
      let pinNote = "";
      if (Number.isFinite(pinNum) && pinNum >= 1 && pinNum <= 4) {
        const pinned = setTopNavSlot(catalog, pinNum - 1, {
          type: "category",
          categorySlug: created.category.slug,
          label: created.category.name,
        });
        if (pinned.error) {
          pinNote = `\n(Could not pin to slot ${pinNum}: ${pinned.error})`;
        } else {
          pinNote = `\nPinned to top-nav slot <b>${pinNum}</b>.`;
        }
      }

      const saved = await saveCatalog(
        catalog,
        `telegram: add category ${created.category.slug} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(
        chatId,
        `Added category <b>${created.category.name}</b>\n<code>${created.category.slug}</code>${pinNote}`
      );
      if (!Number.isFinite(pinNum)) {
        await sendMessage(
          chatId,
          `Where should <b>${created.category.name}</b> appear in the top header?\nPick a slot (or Skip):`,
          buildPinNavKeyboard(created.category.slug)
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/setcategory" || cmd === "/editcategory" || cmd === "/cat") {
      const query = rest[0] || "";
      const idx = findCategoryIndex(catalog, query);
      if (idx === -1) {
        await sendMessage(
          chatId,
          `Category not found: <code>${query || "?"}</code>\nSend /categories to list.`
        );
        return NextResponse.json({ ok: true });
      }

      const body = text
        .replace(/^\/(?:setcategory|editcategory|cat)(?:@\w+)?\s+\S+\s*/i, "")
        .trim();
      const fields = parseKeyValueMessage(body);

      if (message.photo?.length) {
        const largest = message.photo[message.photo.length - 1];
        const hosted = await hostTelegramPhoto(
          largest.file_id,
          catalog.categories[idx].slug
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

      if (!fields.name && !fields.slug && !fields.image) {
        const slug = catalog.categories[idx].slug;
        await sendMessage(
          chatId,
          `Update <b>${catalog.categories[idx].name}</b> with:\n<code>/setcategory ${slug}
name: New Name
image: https://...</code>\n\nOr send a photo with caption <code>/setcategory ${slug}</code>`
        );
        return NextResponse.json({ ok: true });
      }

      const applied = applyCategoryUpdate(catalog, idx, fields);
      if (applied.error) {
        await sendMessage(chatId, applied.error);
        return NextResponse.json({ ok: true });
      }

      const saved = await saveCatalog(
        catalog,
        `telegram: update category ${catalog.categories[idx].slug} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      const c = catalog.categories[idx];
      await sendMessage(
        chatId,
        `Updated category <b>${c.name}</b>\n<code>${c.slug}</code>`
      );
      if (fields.image) {
        await sendMessage(
          chatId,
          `Where should <b>${c.name}</b> appear in the top header?\nPick a slot (or Skip):`,
          buildPinNavKeyboard(c.slug)
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/nav" || cmd === "/topnav") {
      await sendMessage(
        chatId,
        listTopNav(catalog),
        buildNavHubKeyboard(catalog)
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/setnav") {
      // /setnav → same as /nav hub
      // /setnav 3 shop | bestsellers | home-decor | Home decor
      if (!rest.length) {
        await sendMessage(
          chatId,
          listTopNav(catalog),
          buildNavHubKeyboard(catalog)
        );
        return NextResponse.json({ ok: true });
      }

      const slotNum = Number(rest[0]);
      if (!Number.isFinite(slotNum) || slotNum < 1 || slotNum > 4) {
        await sendMessage(
          chatId,
          "Usage:\n<code>/nav</code> — tap a link to change it\n<code>/setnav 3 home-decor</code>\n<code>/setnav 1 shop</code>"
        );
        return NextResponse.json({ ok: true });
      }
      const slotIndex = slotNum - 1;
      const query = rest.slice(1).join(" ").trim();
      if (!query) {
        await sendMessage(
          chatId,
          navTypePickerIntro(slotIndex, catalog),
          buildNavTypePicker(slotIndex, catalog)
        );
        return NextResponse.json({ ok: true });
      }

      const qLower = query.toLowerCase();
      let applied: { error?: string };
      let createdNote = "";

      if (qLower === "shop") {
        applied = setTopNavSlot(catalog, slotIndex, {
          type: "shop",
          label: "Shop",
        });
      } else if (
        qLower === "bestsellers" ||
        qLower === "bestseller" ||
        qLower === "best"
      ) {
        applied = setTopNavSlot(catalog, slotIndex, {
          type: "bestsellers",
          label: "Bestsellers",
        });
      } else {
        let catIdx = findCategoryIndex(catalog, query);
        if (catIdx === -1) {
          const created = createCategoryFromFields(catalog, { name: query });
          if (created.error || !created.category) {
            await sendMessage(
              chatId,
              created.error || "Could not create category for this slot."
            );
            return NextResponse.json({ ok: true });
          }
          catalog.categories.push(created.category);
          catIdx = catalog.categories.length - 1;
          createdNote = `\nCreated <b>${created.category.name}</b>.`;
        }
        const cat = catalog.categories[catIdx];
        applied = setTopNavSlot(catalog, slotIndex, {
          type: "category",
          categorySlug: cat.slug,
          label: cat.name,
        });
      }

      if (applied.error) {
        await sendMessage(chatId, applied.error);
        return NextResponse.json({ ok: true });
      }
      const saved = await saveCatalog(
        catalog,
        `telegram: setnav ${slotNum} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(
        chatId,
        listTopNav(catalog) + createdNote,
        buildNavHubKeyboard(catalog)
      );
      return NextResponse.json({ ok: true });
    }

    if (
      cmd === "/rmcategory" ||
      cmd === "/removecategory" ||
      cmd === "/deletecategory"
    ) {
      const query = rest.join(" ").trim();
      if (!query) {
        if (!catalog.categories.length) {
          await sendMessage(chatId, "No categories to remove.");
          return NextResponse.json({ ok: true });
        }
        await sendMessage(
          chatId,
          "Tap a category to remove it (only empty categories can be deleted):",
          buildCategoryRemovePicker(catalog)
        );
        return NextResponse.json({ ok: true });
      }

      const idx = findCategoryIndex(catalog, query);
      if (idx === -1) {
        await sendMessage(
          chatId,
          `Category not found: <code>${query}</code>\nSend /rmcategory to pick from a list.`
        );
        return NextResponse.json({ ok: true });
      }
      const category = catalog.categories[idx];
      const count = catalog.products.filter(
        (p) => p.categoryId === category.id
      ).length;
      await sendMessage(
        chatId,
        `Delete category <b>${category.name}</b>?\n<code>${category.slug}</code>\n${count} product(s) assigned` +
          (count > 0 ? "\n(must be 0 to delete)" : ""),
        {
          inline_keyboard: [
            [
              {
                text: "Yes, delete",
                callback_data: `catrmyes:${category.id}`,
              },
              { text: "Cancel", callback_data: "catrmno" },
            ],
          ],
        }
      );
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
        `<b>${product.title}</b>\nPrice: ${formatCurrency(product.price)}\nDiscount: ${product.discount}%\nStock: ${product.stock}\nCategory: ${product.category?.slug}\nArtisan: ${product.artisan}\nSlug: <code>${product.slug}</code>\nPhotos: ${product.images.length}/${MAX_PRODUCT_IMAGES}\nVideo: ${product.video ? "yes" : "none"}`
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/photos") {
      const slug = rest[0];
      const product = catalog.products.find((p) => p.slug === slug);
      if (!product) {
        await sendMessage(chatId, `Product not found: <code>${slug || "?"}</code>`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(chatId, mediaSummary(product));
      return NextResponse.json({ ok: true });
    }

    if (
      cmd === "/photo" ||
      cmd === "/addphoto" ||
      cmd === "/addimage"
    ) {
      const slug = rest[0];
      const idx = catalog.products.findIndex((p) => p.slug === slug);
      if (idx === -1) {
        await sendMessage(
          chatId,
          `Product not found: <code>${slug || "?"}</code>\nUsage: send a photo with caption <code>/photo your-slug</code>`
        );
        return NextResponse.json({ ok: true });
      }

      if (catalog.products[idx].images.length >= MAX_PRODUCT_IMAGES) {
        await sendMessage(
          chatId,
          `Already has ${MAX_PRODUCT_IMAGES} photos. Remove one with /delphoto &lt;slug&gt; &lt;n&gt; first.`
        );
        return NextResponse.json({ ok: true });
      }

      let imageUrl = rest.slice(1).join(" ").trim();
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
          `Send a photo with caption <code>/photo ${slug}</code>\nor <code>/photo ${slug} https://...</code>`
        );
        return NextResponse.json({ ok: true });
      }
      if (imageUrl.includes("api.telegram.org/file/bot")) {
        await sendMessage(
          chatId,
          "Don't use Telegram file links. Send the photo with caption /photo &lt;slug&gt; instead."
        );
        return NextResponse.json({ ok: true });
      }

      catalog.products[idx].images.push(imageUrl);
      const saved = await saveCatalog(
        catalog,
        `telegram: add photo ${slug} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(
        chatId,
        `Added photo ${catalog.products[idx].images.length}/${MAX_PRODUCT_IMAGES} to <b>${catalog.products[idx].title}</b>\nSend more with <code>/photo ${slug}</code> or a video with <code>/video ${slug}</code>`
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/delphoto" || cmd === "/rmphoto") {
      const slug = rest[0];
      const n = Number(rest[1]);
      const idx = catalog.products.findIndex((p) => p.slug === slug);
      if (idx === -1) {
        await sendMessage(chatId, `Product not found: <code>${slug || "?"}</code>`);
        return NextResponse.json({ ok: true });
      }
      if (!Number.isFinite(n) || n < 1 || n > catalog.products[idx].images.length) {
        await sendMessage(
          chatId,
          `Usage: /delphoto &lt;slug&gt; &lt;n&gt;\n${mediaSummary(catalog.products[idx])}`
        );
        return NextResponse.json({ ok: true });
      }
      if (catalog.products[idx].images.length <= 1) {
        await sendMessage(chatId, "Keep at least one photo. Use /image to replace it.");
        return NextResponse.json({ ok: true });
      }
      catalog.products[idx].images.splice(n - 1, 1);
      const saved = await saveCatalog(
        catalog,
        `telegram: del photo ${slug} #${n} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(chatId, mediaSummary(catalog.products[idx]));
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/video" || cmd === "/setvideo") {
      const slug = rest[0];
      const idx = catalog.products.findIndex((p) => p.slug === slug);
      if (idx === -1) {
        await sendMessage(
          chatId,
          `Product not found: <code>${slug || "?"}</code>\nUsage: send a video with caption <code>/video your-slug</code>`
        );
        return NextResponse.json({ ok: true });
      }

      let videoUrl = rest.slice(1).join(" ").trim();
      const videoFile =
        message.video ||
        (message.document?.mime_type?.startsWith("video/")
          ? message.document
          : undefined);

      if (videoFile) {
        if (videoFile.file_size && videoFile.file_size > 18 * 1024 * 1024) {
          await sendMessage(chatId, "Video must be under 18MB.");
          return NextResponse.json({ ok: true });
        }
        const hosted = await hostTelegramFile(videoFile.file_id, slug, "video");
        if (hosted.error || !hosted.url) {
          await sendMessage(chatId, `Could not host video: ${hosted.error}`);
          return NextResponse.json({ ok: true });
        }
        videoUrl = hosted.url;
      }

      if (!videoUrl) {
        await sendMessage(
          chatId,
          `Send a video with caption <code>/video ${slug}</code>\nor <code>/video ${slug} https://...</code>`
        );
        return NextResponse.json({ ok: true });
      }
      if (videoUrl.includes("api.telegram.org/file/bot")) {
        await sendMessage(
          chatId,
          "Don't use Telegram file links. Send the video with caption /video &lt;slug&gt; instead."
        );
        return NextResponse.json({ ok: true });
      }

      catalog.products[idx].video = videoUrl;
      const saved = await saveCatalog(
        catalog,
        `telegram: set video ${slug} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(
        chatId,
        `Video set for <b>${catalog.products[idx].title}</b>\n${videoUrl}`
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/delvideo" || cmd === "/rmvideo") {
      const slug = rest[0];
      const idx = catalog.products.findIndex((p) => p.slug === slug);
      if (idx === -1) {
        await sendMessage(chatId, `Product not found: <code>${slug || "?"}</code>`);
        return NextResponse.json({ ok: true });
      }
      catalog.products[idx].video = null;
      const saved = await saveCatalog(
        catalog,
        `telegram: del video ${slug} by ${message.from?.username || fromId}`
      );
      if (!saved.ok) {
        await sendMessage(chatId, `Failed to save: ${saved.error}`);
        return NextResponse.json({ ok: true });
      }
      await sendMessage(chatId, `Video removed from <b>${catalog.products[idx].title}</b>`);
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
            "Usage: /image &lt;slug&gt; &lt;https://...&gt;\nOr send a photo with caption: /image &lt;slug&gt;\nTo <b>add</b> another photo (up to 5+), use /photo &lt;slug&gt;"
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
        // Set as cover (first), keep other photos
        const restImages = catalog.products[idx].images.filter((u) => u !== imageUrl);
        catalog.products[idx].images = [imageUrl, ...restImages].slice(
          0,
          MAX_PRODUCT_IMAGES
        );
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
      if (cmd === "/image") {
        await sendMessage(chatId, mediaSummary(catalog.products[idx]));
      } else {
        await sendMessage(
          chatId,
          `Updated <b>${catalog.products[idx].title}</b>\n${formatCurrency(catalog.products[idx].price)} · stock ${catalog.products[idx].stock} · discount ${catalog.products[idx].discount}%`
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/delete" || cmd === "/remove") {
      const query = rest.join(" ").trim();

      // No argument → show tappable list
      if (!query) {
        if (!catalog.products.length) {
          await sendMessage(chatId, "Catalog is empty — nothing to remove.");
          return NextResponse.json({ ok: true });
        }
        await sendMessage(
          chatId,
          "Tap a listing to remove it:",
          buildRemovePicker(catalog)
        );
        return NextResponse.json({ ok: true });
      }

      const idx = findProductIndex(catalog, query);
      if (idx === -1) {
        await sendMessage(
          chatId,
          `No listing found for <code>${query}</code>\nSend /remove to pick from a list.`
        );
        return NextResponse.json({ ok: true });
      }

      const product = catalog.products[idx];
      await sendMessage(
        chatId,
        `Delete <b>${product.title}</b>?\n<code>${product.slug}</code>\n${formatCurrency(product.price)}`,
        {
          inline_keyboard: [
            [
              { text: "Yes, delete", callback_data: `rmyes:${product.id}` },
              { text: "Cancel", callback_data: "rmno" },
            ],
          ],
        }
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/add" || message.photo?.length) {
      let body = text;
      if (cmd === "/add") {
        body = text.replace(/^\/add\s*/i, "");
      }
      const fields = parseKeyValueMessage(body);

      if (message.photo?.length && !fields.image && !fields.images) {
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

      const videoFile =
        message.video ||
        (message.document?.mime_type?.startsWith("video/")
          ? message.document
          : undefined);
      if (videoFile && !fields.video) {
        const hosted = await hostTelegramFile(
          videoFile.file_id,
          (fields.title || "product").toLowerCase().replace(/\s+/g, "-").slice(0, 40),
          "video"
        );
        if (hosted.error || !hosted.url) {
          await sendMessage(
            chatId,
            `Video received but could not host: ${hosted.error || "unknown error"}`
          );
          return NextResponse.json({ ok: true });
        }
        fields.video = hosted.url;
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
        `Added <b>${created.product.title}</b>\n${formatCurrency(created.product.price)}\n<code>${created.product.slug}</code>\n\n` +
          `Photos: ${created.product.images.length}/${MAX_PRODUCT_IMAGES}` +
          (created.product.video ? ` · Video: yes` : "") +
          `\nCollection: <b>${created.product.category?.name || "?"}</b>\n\n` +
          `Add more photos: <code>/photo ${created.product.slug}</code>\n` +
          `Add a video: <code>/video ${created.product.slug}</code>`
      );
      await sendMessage(
        chatId,
        `Which collection should <b>${created.product.title}</b> stay in?`,
        buildCollectionPicker(created.product.id, catalog)
      );
      return NextResponse.json({ ok: true });
    }

    // Standalone video without a recognized command
    if (message.video || message.document?.mime_type?.startsWith("video/")) {
      await sendMessage(
        chatId,
        "To attach a video, send it with caption:\n<code>/video product-slug</code>"
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
