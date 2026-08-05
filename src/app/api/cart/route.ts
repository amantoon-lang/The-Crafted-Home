import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrCreateCart, calcLinePrice } from "@/lib/services";
import { serializeProduct } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED", items: [], itemCount: 0 }, { status: 401 });
  }

  const cart = await getOrCreateCart(session.user.id);
  const items = cart.items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    product: serializeProduct(item.product),
  }));

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce(
    (sum, i) =>
      sum + calcLinePrice(i.product.price, i.product.discount) * i.quantity,
    0
  );

  return NextResponse.json({ items, itemCount, subtotal });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { productId, quantity = 1 } = await req.json();
  if (!productId || quantity < 1) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.stock < quantity) {
    return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
  }

  const cart = await getOrCreateCart(session.user.id);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  const nextQty = (existing?.quantity ?? 0) + quantity;
  if (nextQty > product.stock) {
    return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { itemId, quantity } = await req.json();
  const cart = await getOrCreateCart(session.user.id);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: { product: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (quantity < 1) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    if (quantity > item.product.stock) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
    }
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  const cart = await getOrCreateCart(session.user.id);
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  return NextResponse.json({ success: true });
}
