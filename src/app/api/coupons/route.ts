import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart, calcOrderTotals } from "@/lib/services";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: "Coupon code required" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findFirst({
    where: {
      code: String(code).toUpperCase(),
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!coupon) {
    return NextResponse.json({ error: "Invalid coupon" }, { status: 404 });
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ error: "Coupon fully redeemed" }, { status: 400 });
  }

  const session = await auth();
  let subtotal = 0;
  if (session?.user?.id) {
    const cart = await getOrCreateCart(session.user.id);
    const totals = calcOrderTotals(
      cart.items.map((i) => ({
        price: Number(i.product.price),
        discount: i.product.discount,
        quantity: i.quantity,
      })),
      {
        discountPercent: coupon.discountPercent,
        discountAmount: coupon.discountAmount ? Number(coupon.discountAmount) : null,
      }
    );
    subtotal = totals.subtotal;
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      return NextResponse.json(
        { error: `Minimum order $${coupon.minOrderAmount} required` },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({
    code: coupon.code,
    description: coupon.description,
    discountPercent: coupon.discountPercent,
    discountAmount: coupon.discountAmount ? Number(coupon.discountAmount) : null,
  });
}
