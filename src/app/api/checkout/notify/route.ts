import { NextResponse } from "next/server";
import { z } from "zod";
import { checkoutSchema } from "@/lib/validations";
import { notifyTelegramAdmins } from "@/lib/telegram-notify";
import { formatCurrency } from "@/lib/utils";

const lineSchema = z.object({
  title: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  slug: z.string().optional(),
});

const guestCheckoutSchema = checkoutSchema.extend({
  orderId: z.string().min(3),
  subtotal: z.number().nonnegative(),
  items: z.array(lineSchema).min(1),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  locationLabel: z.string().optional().nullable(),
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = guestCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid checkout data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const itemLines = data.items
      .map(
        (i) =>
          `• ${escapeHtml(i.title)} × ${i.quantity} — ${formatCurrency(i.unitPrice * i.quantity)}`
      )
      .join("\n");

    const hasCoords =
      typeof data.latitude === "number" && typeof data.longitude === "number";
    const mapsUrl = hasCoords
      ? `https://maps.google.com/?q=${data.latitude},${data.longitude}`
      : null;

    const text = [
      `<b>New checkout order</b>`,
      `<code>${escapeHtml(data.orderId)}</code>`,
      ``,
      `<b>Customer</b>`,
      escapeHtml(data.shippingName),
      escapeHtml(data.shippingPhone),
      ``,
      `<b>Address</b>`,
      escapeHtml(data.shippingAddress),
      escapeHtml(
        `${data.shippingCity}, ${data.shippingState} ${data.shippingZip}`
      ),
      escapeHtml(data.shippingCountry),
      data.deliveryInstructions
        ? `\nNotes: ${escapeHtml(data.deliveryInstructions)}`
        : "",
      data.couponCode ? `Coupon: <code>${escapeHtml(data.couponCode)}</code>` : "",
      ``,
      hasCoords
        ? `<b>Location</b>\n${data.latitude!.toFixed(5)}, ${data.longitude!.toFixed(5)}\n${mapsUrl}`
        : `<b>Location</b>\nNot shared`,
      data.locationLabel
        ? escapeHtml(data.locationLabel).slice(0, 200)
        : "",
      ``,
      `<b>Items</b>`,
      itemLines,
      ``,
      `<b>Subtotal</b> ${formatCurrency(data.subtotal)}`,
    ]
      .filter((line) => line !== "")
      .join("\n");

    const notify = await notifyTelegramAdmins(text);

    return NextResponse.json({
      ok: true,
      orderId: data.orderId,
      telegramSent: notify.sent,
      telegramErrors: notify.errors,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Checkout notify failed" }, { status: 500 });
  }
}
