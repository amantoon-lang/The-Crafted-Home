import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    include: {
      product: { include: { category: { select: { name: true, slug: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: items.map((i) => serializeProduct(i.product)),
    ids: items.map((i) => i.productId),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { productId } = await req.json();
  const existing = await prisma.wishlistItem.findUnique({
    where: {
      userId_productId: { userId: session.user.id, productId },
    },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ wished: false });
  }

  await prisma.wishlistItem.create({
    data: { userId: session.user.id, productId },
  });
  return NextResponse.json({ wished: true });
}
