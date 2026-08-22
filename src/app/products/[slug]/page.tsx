"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, Minus, Plus, Star, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGrid } from "@/components/products/product-grid";
import {
  calculateSalePrice,
  formatCurrency,
  getDeliveryEstimate,
  cn,
} from "@/lib/utils";
import { useUIStore, useWishlistStore, useGuestCartStore } from "@/store";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const { triggerCartAnimation } = useUIStore();
  const { has, toggle } = useWishlistStore();
  const addItem = useGuestCartStore((s) => s.addItem);

  const { data, isLoading, error } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data?.product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Product not found</h1>
        <Button asChild className="mt-6">
          <Link href="/shop">Back to shop</Link>
        </Button>
      </div>
    );
  }

  const product = data.product;
  const salePrice = calculateSalePrice(product.price, product.discount);
  const wished = has(product.id);

  const addToCart = () => {
    addItem(product, qty);
    triggerCartAnimation();
    toast.success("Added to cart");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <div
            className={cn(
              "relative aspect-square overflow-hidden rounded-2xl bg-secondary",
              zoomed && "cursor-zoom-out"
            )}
            onClick={() => setZoomed(!zoomed)}
          >
            <Image
              src={product.images[activeImage]}
              alt={product.title}
              fill
              priority
              className={cn(
                "object-cover transition-transform duration-500",
                zoomed && "scale-150"
              )}
              sizes="(max-width:1024px) 100vw, 50vw"
            />
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {product.images.map((img: string, i: number) => (
              <button
                key={img}
                onClick={() => {
                  setActiveImage(i);
                  setZoomed(false);
                }}
                className={cn(
                  "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2",
                  activeImage === i ? "border-primary" : "border-transparent"
                )}
              >
                <Image src={img} alt="" fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {product.artisan}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
            {product.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-accent text-accent" />
              {product.rating.toFixed(1)} ({product.reviewCount} reviews)
            </div>
            {product.discount > 0 && <Badge variant="accent">-{product.discount}%</Badge>}
            {product.stock < 8 && product.stock > 0 && (
              <Badge variant="outline">Only {product.stock} left</Badge>
            )}
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatCurrency(salePrice)}</span>
            {product.discount > 0 && (
              <span className="text-lg text-muted-foreground line-through">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>

          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-8 space-y-3 rounded-2xl bg-secondary/60 p-5 text-sm">
            <p>
              <span className="font-medium text-foreground">Materials:</span>{" "}
              {product.materials}
            </p>
            {product.dimensions && (
              <p>
                <span className="font-medium text-foreground">Dimensions:</span>{" "}
                {product.dimensions}
              </p>
            )}
            <p className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-accent" />
              Delivery estimate: {getDeliveryEstimate()}
            </p>
          </div>

          {product.story && (
            <div className="mt-8">
              <h2 className="font-display text-2xl">The artisan story</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {product.story}
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-xl border border-border">
              <button
                className="p-3"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <button
                className="p-3"
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button size="lg" disabled={product.stock < 1} onClick={addToCart}>
              {product.stock < 1 ? "Out of stock" : "Add to cart"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                toggle(product.id);
                toast.success(wished ? "Removed from wishlist" : "Saved to wishlist");
              }}
            >
              <Heart className={cn("h-4 w-4", wished && "fill-accent text-accent")} />
              Wishlist
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-16" />

      <section>
        <h2 className="font-display text-3xl">Customer reviews</h2>
        <div className="mt-6 space-y-4">
          {product.reviews?.length ? (
            product.reviews.map(
              (review: {
                id: string;
                rating: number;
                comment: string;
                user: { name: string | null };
              }) => (
                <div key={review.id} className="rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    {review.rating}/5 · {review.user.name || "Customer"}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                </div>
              )
            )
          ) : (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          )}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="mb-8 font-display text-3xl">Related pieces</h2>
        <ProductGrid products={data.related || []} />
      </section>
    </div>
  );
}
