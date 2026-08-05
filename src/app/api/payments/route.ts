import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentProvider } from "@/lib/payments";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { orderId, paymentIntentId, action = "confirm" } = await req.json();

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const provider = createPaymentProvider();

    if (action === "retry") {
      const payment = await provider.createPaymentIntent({
        amount: Number(order.total),
        orderId: order.id,
        customerEmail: session.user.email!,
      });
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentIntentId: payment.paymentIntentId,
          paymentProvider: payment.provider,
          paymentStatus: "PENDING",
        },
      });
      return NextResponse.json({ payment, orderId: order.id });
    }

    const result = await provider.confirmPayment(
      paymentIntentId || order.paymentIntentId || ""
    );

    if (result.success) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
        },
      });

      // Email confirmation placeholder — wire to Resend/SendGrid in production
      console.log(`[email] Order confirmation sent to ${session.user.email} for ${order.id}`);

      return NextResponse.json({
        success: true,
        orderId: order.id,
        status: "paid",
      });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });

    return NextResponse.json(
      { success: false, orderId: order.id, status: "failed", message: result.message },
      { status: 402 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
