import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { artisan: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 8,
    select: {
      id: true,
      title: true,
      slug: true,
      images: true,
      price: true,
      artisan: true,
    },
  });

  return NextResponse.json({
    suggestions: products.map((p) => ({
      ...p,
      price: Number(p.price),
    })),
  });
}
