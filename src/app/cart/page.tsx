"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateSalePrice, formatCurrency } from "@/lib/utils";

export default function CartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [coupon, setCoupon] = useState("");
  const [couponData, setCouponData] = useState<{
    code: string;
    discountPercent?: number | null;
    discountAmount?: number | null;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await fetch("/api/cart");
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error("Failed to load cart");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  const updateItem = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/cart?itemId=${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Removed from cart");
    },
  });

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Your cart is waiting</h1>
        <p className="mt-3 text-muted-foreground">Sign in to view and manage your cart.</p>
        <Button asChild className="mt-6">
          <Link href="/login?callbackUrl=/cart">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (isLoading || status === "loading") {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const items = data?.items || [];
  const subtotal = data?.subtotal || 0;
  let discount = 0;
  if (couponData?.discountPercent) {
    discount = Math.round(subtotal * (couponData.discountPercent / 100) * 100) / 100;
  } else if (couponData?.discountAmount) {
    discount = couponData.discountAmount;
  }
  const shipping = subtotal - discount >= 100 ? 0 : items.length ? 8.5 : 0;
  const tax = Math.round(Math.max(subtotal - discount, 0) * 0.08 * 100) / 100;
  const total = Math.round((Math.max(subtotal - discount, 0) + shipping + tax) * 100) / 100;

  const applyCoupon = async () => {
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: coupon }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Invalid coupon");
      setCouponData(null);
      return;
    }
    setCouponData(json);
    toast.success(`Coupon ${json.code} applied`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl">Your cart</h1>

      {!items.length ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Button asChild className="mt-6">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            {items.map(
              (item: {
                id: string;
                quantity: number;
                product: {
                  id: string;
                  title: string;
                  slug: string;
                  price: number;
                  discount: number;
                  images: string[];
                  stock: number;
                };
              }) => {
                const price = calculateSalePrice(item.product.price, item.product.discount);
                return (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-2xl border border-border p-4 sm:gap-6"
                  >
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary sm:h-32 sm:w-28"
                    >
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.title}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="font-display text-xl hover:text-primary"
                          >
                            {item.product.title}
                          </Link>
                          <p className="mt-1 text-sm font-medium">
                            {formatCurrency(price)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem.mutate(item.id)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-xl border border-border">
                          <button
                            className="p-2"
                            onClick={() =>
                              updateItem.mutate({
                                itemId: item.id,
                                quantity: item.quantity - 1,
                              })
                            }
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            className="p-2"
                            disabled={item.quantity >= item.product.stock}
                            onClick={() =>
                              updateItem.mutate({
                                itemId: item.id,
                                quantity: item.quantity + 1,
                              })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-medium">
                          {formatCurrency(price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="font-display text-2xl">Order summary</h2>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Coupon code"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              />
              <Button variant="outline" onClick={applyCoupon}>
                Apply
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Try WELCOME10 or HANDMADE20</p>
            <Separator className="my-5" />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd>-{formatCurrency(discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{shipping === 0 ? "Free" : formatCurrency(shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax (8%)</dt>
                <dd>{formatCurrency(tax)}</dd>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatCurrency(total)}</dd>
              </div>
            </dl>
            <Button
              className="mt-6 w-full"
              size="lg"
              onClick={() =>
                router.push(
                  `/checkout${couponData?.code ? `?coupon=${couponData.code}` : ""}`
                )
              }
            >
              Checkout
            </Button>
            {!session && null}
          </aside>
        </div>
      )}
    </div>
  );
}
