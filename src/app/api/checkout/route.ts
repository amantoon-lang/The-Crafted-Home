import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validations";
import { getOrCreateCart, calcOrderTotals, calcLinePrice } from "@/lib/services";
import { createPaymentProvider } from "@/lib/payments";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid checkout data" },
        { status: 400 }
      );
    }

    const cart = await getOrCreateCart(session.user.id);
    if (!cart.items.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    for (const item of cart.items) {
      if (item.quantity > item.product.stock) {
        return NextResponse.json(
          { error: `Insufficient stock for ${item.product.title}` },
          { status: 400 }
        );
      }
    }

    let coupon = null;
    if (parsed.data.couponCode) {
      coupon = await prisma.coupon.findFirst({
        where: {
          code: parsed.data.couponCode.toUpperCase(),
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      if (!coupon) {
        return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
      }
    }

    const totals = calcOrderTotals(
      cart.items.map((i) => ({
        price: Number(i.product.price),
        discount: i.product.discount,
        quantity: i.quantity,
      })),
      coupon
        ? {
            discountPercent: coupon.discountPercent,
            discountAmount: coupon.discountAmount
              ? Number(coupon.discountAmount)
              : null,
          }
        : null
    );

    if (coupon?.minOrderAmount && totals.subtotal < Number(coupon.minOrderAmount)) {
      return NextResponse.json(
        { error: `Minimum order of $${coupon.minOrderAmount} required for this coupon` },
        { status: 400 }
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: session.user.id,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotal: totals.subtotal,
          shippingCost: totals.shipping,
          tax: totals.tax,
          discount: totals.discount,
          total: totals.total,
          couponCode: coupon?.code,
          shippingName: parsed.data.shippingName,
          shippingPhone: parsed.data.shippingPhone,
          shippingAddress: parsed.data.shippingAddress,
          shippingCity: parsed.data.shippingCity,
          shippingState: parsed.data.shippingState,
          shippingZip: parsed.data.shippingZip,
          shippingCountry: parsed.data.shippingCountry ?? "US",
          deliveryInstructions: parsed.data.deliveryInstructions,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: calcLinePrice(Number(item.product.price), item.product.discount),
              title: item.product.title,
            })),
          },
        },
      });

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

    const provider = createPaymentProvider();
    const payment = await provider.createPaymentIntent({
      amount: totals.total,
      orderId: order.id,
      customerEmail: session.user.email!,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentIntentId: payment.paymentIntentId,
        paymentProvider: payment.provider,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      total: totals.total,
      payment,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
