"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProductGrid } from "@/components/products/product-grid";
import { Button } from "@/components/ui/button";
import { useWishlistStore } from "@/store";
import { catalogProducts } from "@/data/catalog";

export default function WishlistPage() {
  const ids = useWishlistStore((s) => s.ids);

  const items = useMemo(
    () =>
      catalogProducts
        .filter((p) => ids.includes(p.id))
        .map((p) => ({
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
        })),
    [ids]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl">Wishlist</h1>
      <p className="mt-2 text-muted-foreground">Pieces you&apos;ve saved for later.</p>
      <div className="mt-10">
        {items.length ? (
          <ProductGrid products={items} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-muted-foreground">Your wishlist is empty.</p>
            <Button asChild className="mt-6">
              <Link href="/shop">Explore the shop</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
