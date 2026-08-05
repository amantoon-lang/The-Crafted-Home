import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/services";

export async function GET() {
  try {
    await requireAdmin();

    const [orders, customers, products, revenue, lowStock, recentOrders] =
      await Promise.all([
        prisma.order.count(),
        prisma.user.count({ where: { role: "CUSTOMER" } }),
        prisma.product.count(),
        prisma.order.aggregate({
          where: { paymentStatus: "PAID" },
          _sum: { total: true },
        }),
        prisma.product.findMany({
          where: { stock: { lte: 10 } },
          orderBy: { stock: "asc" },
          take: 8,
          select: { id: true, title: true, stock: true, slug: true },
        }),
        prisma.order.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true, email: true } },
            items: true,
          },
        }),
      ]);

    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
    });

    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

    return NextResponse.json({
      stats: {
        orders,
        customers,
        products,
        revenue: Number(revenue._sum.total ?? 0),
      },
      lowStock,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: Number(o.total),
        createdAt: o.createdAt,
        customer: o.user,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        productCount: c._count.products,
      })),
      coupons: coupons.map((c) => ({
        ...c,
        discountAmount: c.discountAmount ? Number(c.discountAmount) : null,
        minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
