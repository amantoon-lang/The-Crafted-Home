import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { category: { select: { name: true, slug: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { category: { select: { name: true, slug: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  return cart;
}

export function calcLinePrice(price: number, discount: number) {
  return Math.round(price * (1 - discount / 100) * 100) / 100;
}

export function calcOrderTotals(
  items: { price: number; discount: number; quantity: number }[],
  coupon?: { discountPercent?: number | null; discountAmount?: number | null } | null
) {
  const subtotal = items.reduce(
    (sum, item) => sum + calcLinePrice(item.price, item.discount) * item.quantity,
    0
  );

  let discount = 0;
  if (coupon?.discountPercent) {
    discount = Math.round(subtotal * (coupon.discountPercent / 100) * 100) / 100;
  } else if (coupon?.discountAmount) {
    discount = Number(coupon.discountAmount);
  }

  discount = Math.min(discount, subtotal);
  const shipping = subtotal - discount >= 100 ? 0 : 8.5;
  const taxable = Math.max(subtotal - discount, 0);
  const tax = Math.round(taxable * 0.08 * 100) / 100;
  const total = Math.round((taxable + shipping + tax) * 100) / 100;

  return { subtotal, shipping, tax, discount, total };
}
