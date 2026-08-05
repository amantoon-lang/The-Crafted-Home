import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productFilterSchema } from "@/lib/validations";
import { serializeProduct } from "@/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = productFilterSchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  }

  const q = parsed.data.q;
  const category = parsed.data.category;
  const minPrice = parsed.data.minPrice;
  const maxPrice = parsed.data.maxPrice;
  const sort = parsed.data.sort ?? "newest";
  const page = parsed.data.page ?? 1;
  const limit = parsed.data.limit ?? 12;
  const where: Prisma.ProductWhereInput = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { artisan: { contains: q, mode: "insensitive" } },
      { materials: { contains: q, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = { slug: category };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price-asc"
      ? { price: "asc" }
      : sort === "price-desc"
        ? { price: "desc" }
        : sort === "popularity"
          ? { reviewCount: "desc" }
          : { createdAt: "desc" };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: { select: { name: true, slug: true } } },
    }),
  ]);

  return NextResponse.json({
    products: products.map(serializeProduct),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
