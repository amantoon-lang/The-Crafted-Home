import { NextResponse } from "next/server";
import { catalogProducts } from "@/data/catalog";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = catalogProducts
    .filter(
      (p) =>
        p.title.toLowerCase().includes(q) || p.artisan.toLowerCase().includes(q)
    )
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      images: p.images,
      price: p.price,
      artisan: p.artisan,
    }));

  return NextResponse.json({ suggestions });
}
