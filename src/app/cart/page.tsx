"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { calculateSalePrice, formatCurrency } from "@/lib/utils";
import { useGuestCartStore } from "@/store";

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, subtotal } = useGuestCartStore();
  const [coupon, setCoupon] = useState("");
  const [couponData, setCouponData] = useState<{
    code: string;
    discountPercent?: number | null;
    discountAmount?: number | null;
  } | null>(null);

  const cartSubtotal = subtotal();
  let discount = 0;
  if (couponData?.discountPercent) {
    discount =
      Math.round(cartSubtotal * (couponData.discountPercent / 100) * 100) / 100;
  } else if (couponData?.discountAmount) {
    discount = couponData.discountAmount;
  }
  const shipping = cartSubtotal - discount >= 4999 ? 0 : items.length ? 99 : 0;
  const tax = Math.round(Math.max(cartSubtotal - discount, 0) * 0.18);
  const total = Math.max(cartSubtotal - discount, 0) + shipping + tax;

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (code === "WELCOME10") {
      setCouponData({ code, discountPercent: 10 });
      toast.success("Coupon WELCOME10 applied");
      return;
    }
    if (code === "HANDMADE500") {
      if (cartSubtotal < 5000) {
        toast.error("Minimum order ₹5,000 required");
        return;
      }
      setCouponData({ code, discountAmount: 500 });
      toast.success("Coupon HANDMADE500 applied");
      return;
    }
    toast.error("Invalid coupon");
    setCouponData(null);
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
            {items.map((item) => {
              const price = calculateSalePrice(
                item.product.price,
                item.product.discount
              );
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
                        onClick={() => {
                          removeItem(item.product.id);
                          toast.success("Removed from cart");
                        }}
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
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          className="p-2"
                          disabled={item.quantity >= item.product.stock}
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
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
            })}
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
            <p className="mt-2 text-xs text-muted-foreground">
              Try WELCOME10 or HANDMADE500
            </p>
            <Separator className="my-5" />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatCurrency(cartSubtotal)}</dd>
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
                <dt className="text-muted-foreground">GST (18%)</dt>
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
          </aside>
        </div>
      )}
    </div>
  );
}
