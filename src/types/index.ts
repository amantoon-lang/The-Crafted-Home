import type { Product } from "@prisma/client";

export type ProductCardData = {
  id: string;
  title: string;
  slug: string;
  price: number;
  discount: number;
  images: string[];
  /** Optional product video URL (mp4/webm). */
  video?: string | null;
  artisan: string;
  rating: number;
  reviewCount: number;
  stock: number;
  category?: { name: string; slug: string } | null;
  featured?: boolean;
  trending?: boolean;
  bestSeller?: boolean;
};

export type CartItemWithProduct = {
  id: string;
  quantity: number;
  product: ProductCardData & {
    materials?: string;
  };
};

export type OrderSummary = {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  couponCode?: string | null;
};

export function serializeProduct(product: Product & { category?: { name: string; slug: string } | null }): ProductCardData {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    price: Number(product.price),
    discount: product.discount,
    images: product.images,
    artisan: product.artisan,
    rating: product.rating,
    reviewCount: product.reviewCount,
    stock: product.stock,
    category: product.category ?? null,
    featured: product.featured,
    trending: product.trending,
    bestSeller: product.bestSeller,
  };
}
