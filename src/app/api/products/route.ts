import { NextResponse } from "next/server";
import { queryCatalogProducts } from "@/data/catalog";
import { productFilterSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = productFilterSchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  }

  const { q, category, minPrice, maxPrice } = parsed.data;
  const sort = parsed.data.sort ?? "newest";
  const page = parsed.data.page ?? 1;
  const limit = parsed.data.limit ?? 12;

  // Catalog-first so inventory always works without a production database
  const result = queryCatalogProducts({
    q,
    category,
    minPrice,
    maxPrice,
    sort,
    page,
    limit,
  });

  return NextResponse.json(result);
}
