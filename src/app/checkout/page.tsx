"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useCheckoutStore } from "@/store";

function CheckoutForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponFromQuery = searchParams.get("coupon") || "";
  const [submitting, setSubmitting] = useState(false);
  const draft = useCheckoutStore();

  const { data: cart, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error("UNAUTHORIZED");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingName: draft.shippingName,
      shippingPhone: draft.shippingPhone,
      shippingAddress: draft.shippingAddress,
      shippingCity: draft.shippingCity,
      shippingState: draft.shippingState,
      shippingZip: draft.shippingZip,
      shippingCountry: draft.shippingCountry || "US",
      deliveryInstructions: draft.deliveryInstructions,
      couponCode: couponFromQuery || draft.couponCode,
    },
  });

  useEffect(() => {
    if (couponFromQuery) setValue("couponCode", couponFromQuery);
  }, [couponFromQuery, setValue]);

  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/checkout");
    return null;
  }

  if (isLoading || status === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!cart?.items?.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Nothing to checkout</h1>
        <Button className="mt-6" onClick={() => router.push("/shop")}>
          Browse products
        </Button>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutInput) => {
    setSubmitting(true);
    draft.setField("shippingName", data.shippingName);
    draft.setField("shippingPhone", data.shippingPhone);
    draft.setField("shippingAddress", data.shippingAddress);
    draft.setField("shippingCity", data.shippingCity);
    draft.setField("shippingState", data.shippingState);
    draft.setField("shippingZip", data.shippingZip);
    draft.setField("shippingCountry", data.shippingCountry);
    draft.setField("deliveryInstructions", data.deliveryInstructions || "");
    draft.setField("couponCode", data.couponCode || "");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");

      // Demo payment auto-confirms; Stripe would use Elements here
      if (json.payment.demoMode) {
        const payRes = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: json.orderId,
            paymentIntentId: json.payment.paymentIntentId,
            action: "confirm",
          }),
        });
        const payJson = await payRes.json();
        if (!payRes.ok || !payJson.success) {
          router.push(`/payment/failure?orderId=${json.orderId}`);
          return;
        }
        draft.reset();
        router.push(`/payment/success?orderId=${json.orderId}`);
        return;
      }

      router.push(
        `/payment?orderId=${json.orderId}&clientSecret=${json.payment.clientSecret}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl">Checkout</h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_0.7fr]"
      >
        <div className="space-y-6 rounded-2xl border border-border p-6">
          <h2 className="font-display text-2xl">Shipping address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Full name</Label>
              <Input {...register("shippingName")} />
              {errors.shippingName && (
                <p className="text-xs text-destructive">{errors.shippingName.message}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Contact number</Label>
              <Input {...register("shippingPhone")} />
              {errors.shippingPhone && (
                <p className="text-xs text-destructive">{errors.shippingPhone.message}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input {...register("shippingAddress")} />
              {errors.shippingAddress && (
                <p className="text-xs text-destructive">{errors.shippingAddress.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input {...register("shippingCity")} />
              {errors.shippingCity && (
                <p className="text-xs text-destructive">{errors.shippingCity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input {...register("shippingState")} />
              {errors.shippingState && (
                <p className="text-xs text-destructive">{errors.shippingState.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input {...register("shippingZip")} />
              {errors.shippingZip && (
                <p className="text-xs text-destructive">{errors.shippingZip.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input {...register("shippingCountry")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Delivery instructions</Label>
              <Textarea {...register("deliveryInstructions")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Coupon code</Label>
              <Input {...register("couponCode")} placeholder="Optional" />
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-2xl">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.items.map(
              (item: {
                id: string;
                quantity: number;
                product: { title: string; price: number; discount: number };
              }) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {item.product.title} × {item.quantity}
                  </span>
                  <span>
                    {formatCurrency(
                      item.product.price *
                        (1 - item.product.discount / 100) *
                        item.quantity
                    )}
                  </span>
                </li>
              )
            )}
          </ul>
          <Separator className="my-4" />
          <div className="flex justify-between font-semibold">
            <span>Subtotal</span>
            <span>{formatCurrency(cart.subtotal)}</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Shipping, tax, and discounts calculated when you place the order.
            {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
              ? " Payment via Stripe."
              : " Demo payment mode (no Stripe keys configured)."}
          </p>
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
            {submitting ? "Placing order..." : "Place order & pay"}
          </Button>
        </aside>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutForm />
    </Suspense>
  );
}
