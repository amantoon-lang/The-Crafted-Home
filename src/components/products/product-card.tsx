"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverLift } from "@/components/ui/motion";
import { calculateSalePrice, formatCurrency, cn } from "@/lib/utils";
import { useUIStore, useWishlistStore, useGuestCartStore } from "@/store";
import type { ProductCardData } from "@/types";

export function ProductCard({ product }: { product: ProductCardData }) {
  const { triggerCartAnimation } = useUIStore();
  const { has, toggle } = useWishlistStore();
  const addItem = useGuestCartStore((s) => s.addItem);
  const salePrice = calculateSalePrice(product.price, product.discount);
  const wished = has(product.id);

  const addToCart = () => {
    if (product.stock < 1) return;
    addItem(product, 1);
    triggerCartAnimation();
    toast.success("Added to cart");
  };

  return (
    <HoverLift className="group">
      <article className="overflow-hidden rounded-2xl bg-card">
        <div className="image-zoom relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary">
          <Link href={`/products/${product.slug}`}>
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          </Link>
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.discount > 0 && (
              <Badge variant="accent">-{product.discount}%</Badge>
            )}
            {product.bestSeller && <Badge>Bestseller</Badge>}
          </div>
          <button
            onClick={() => {
              toggle(product.id);
              toast.success(
                wished ? "Removed from wishlist" : "Saved to wishlist"
              );
            }}
            className="absolute right-3 top-3 rounded-xl bg-background/90 p-2 shadow-sm transition hover:scale-105"
            aria-label="Toggle wishlist"
          >
            <Heart className={cn("h-4 w-4", wished && "fill-accent text-accent")} />
          </button>
        </div>
        <div className="space-y-2 px-1 pt-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {product.artisan}
          </p>
          <Link href={`/products/${product.slug}`}>
            <h3 className="font-display text-lg leading-snug text-foreground transition-colors hover:text-primary">
              {product.title}
            </h3>
          </Link>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <span>{product.rating.toFixed(1)}</span>
            <span>({product.reviewCount})</span>
          </div>
          <div className="flex items-end justify-between gap-3 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold">{formatCurrency(salePrice)}</span>
              {product.discount > 0 && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={product.stock < 1}
              onClick={addToCart}
            >
              {product.stock < 1 ? "Sold out" : "Add"}
            </Button>
          </div>
        </div>
      </article>
    </HoverLift>
  );
}
