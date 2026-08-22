import { NextResponse } from "next/server";
import {
  loadCatalog,
  getCatalogProduct,
  getRelatedProducts,
} from "@/data/catalog";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const catalog = await loadCatalog();
  const product = getCatalogProduct(catalog, slug);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const related = getRelatedProducts(catalog, product).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: p.price,
    discount: p.discount,
    images: p.images,
    artisan: p.artisan,
    rating: p.rating,
    reviewCount: p.reviewCount,
    stock: p.stock,
    category: p.category,
    featured: p.featured,
    trending: p.trending,
    bestSeller: p.bestSeller,
  }));

  return NextResponse.json({
    product: {
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      discount: product.discount,
      images: product.images,
      artisan: product.artisan,
      rating: product.rating,
      reviewCount: product.reviewCount,
      stock: product.stock,
      category: product.category,
      featured: product.featured,
      trending: product.trending,
      bestSeller: product.bestSeller,
      description: product.description,
      story: product.story,
      whyMade: product.whyMade || "",
      howMade: product.howMade || "",
      materials: product.materials,
      dimensions: product.dimensions,
      reviews: product.reviews,
    },
    related,
  });
}
