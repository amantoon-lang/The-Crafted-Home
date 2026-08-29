/** Shared Telegram outbound helpers (orders, alerts). */

function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

/** Chat/user ids that should receive order alerts. */
export function telegramNotifyChatIds(): string[] {
  const ids = new Set<string>();
  for (const raw of (process.env.TELEGRAM_ADMIN_IDS || "").split(",")) {
    const id = raw.trim();
    if (id) ids.add(id);
  }
  for (const raw of (process.env.TELEGRAM_ORDER_CHAT_IDS || "").split(",")) {
    const id = raw.trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

export async function sendTelegramText(
  chatId: string | number,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const token = botToken();
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body.slice(0, 200) };
  }
  return { ok: true };
}

export async function notifyTelegramAdmins(
  text: string
): Promise<{ sent: number; errors: string[] }> {
  const chats = telegramNotifyChatIds();
  if (!chats.length) {
    return {
      sent: 0,
      errors: ["No TELEGRAM_ADMIN_IDS / TELEGRAM_ORDER_CHAT_IDS configured"],
    };
  }

  let sent = 0;
  const errors: string[] = [];
  for (const chatId of chats) {
    const result = await sendTelegramText(chatId, text);
    if (result.ok) sent += 1;
    else errors.push(`${chatId}: ${result.error || "failed"}`);
  }
  return { sent, errors };
}
