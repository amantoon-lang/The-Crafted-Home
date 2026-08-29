"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useCheckoutStore, useGuestCartStore } from "@/store";

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponFromQuery = searchParams.get("coupon") || "";
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    lat: number;
    lon: number;
    label?: string;
  } | null>(null);
  const draft = useCheckoutStore();
  const { items, subtotal, clear } = useGuestCartStore();

  useEffect(() => setMounted(true), []);

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
      shippingCountry: draft.shippingCountry || "IN",
      deliveryInstructions: draft.deliveryInstructions,
      couponCode: couponFromQuery || draft.couponCode,
    },
  });

  useEffect(() => {
    if (couponFromQuery) setValue("couponCode", couponFromQuery);
  }, [couponFromQuery, setValue]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await fetch(
            `/api/geo/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
          );
          const data = await res.json();
          if (!res.ok) {
            setCoords({ lat, lon });
            toast.message("Location saved", {
              description: "Could not fill address automatically — enter it below.",
            });
            return;
          }
          const a = data.address || {};
          if (a.shippingAddress) setValue("shippingAddress", a.shippingAddress, { shouldValidate: true });
          if (a.shippingCity) setValue("shippingCity", a.shippingCity, { shouldValidate: true });
          if (a.shippingState) setValue("shippingState", a.shippingState, { shouldValidate: true });
          if (a.shippingZip) setValue("shippingZip", a.shippingZip, { shouldValidate: true });
          if (a.shippingCountry) {
            setValue("shippingCountry", a.shippingCountry, { shouldValidate: true });
          }
          setCoords({
            lat,
            lon,
            label: data.displayName || undefined,
          });
          toast.success("Location filled from your device");
        } catch {
          setCoords({ lat, lon });
          toast.message("Location saved", {
            description: "Address fields were not auto-filled.",
          });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied"
            : "Could not get your location"
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground">
        Loading checkout…
      </div>
    );
  }

  if (!items.length) {
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

    const orderId = `ord_${Date.now().toString(36)}`;
    const cartSubtotal = subtotal();
    const lineItems = items.map((item) => ({
      title: item.product.title,
      slug: item.product.slug,
      quantity: item.quantity,
      unitPrice: item.product.price * (1 - item.product.discount / 100),
    }));

    try {
      const res = await fetch("/api/checkout/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          orderId,
          subtotal: cartSubtotal,
          items: lineItems,
          latitude: coords?.lat ?? null,
          longitude: coords?.lon ?? null,
          locationLabel: coords?.label ?? null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Checkout failed");
        return;
      }

      clear();
      draft.reset();
      toast.success("Order placed — we notified the shop on Telegram");
      router.push(`/payment/success?orderId=${orderId}`);
    } catch {
      toast.error("Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl">Checkout</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No account needed — explore and order as a guest.
      </p>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_0.7fr]"
      >
        <div className="space-y-6 rounded-2xl border border-border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Shipping address</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={useMyLocation}
              disabled={locating}
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {locating ? "Locating…" : "Use my location"}
            </Button>
          </div>
          {coords && (
            <p className="text-xs text-muted-foreground">
              Location pinned: {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
              {" · "}
              <a
                href={`https://maps.google.com/?q=${coords.lat},${coords.lon}`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Open map
              </a>
            </p>
          )}
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
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input {...register("shippingState")} />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input {...register("shippingZip")} />
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
            {items.map((item) => (
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
            ))}
          </ul>
          <Separator className="my-4" />
          <div className="flex justify-between font-semibold">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal())}</span>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
            {submitting ? "Placing order..." : "Place order"}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Placing an order notifies the shop on Telegram with your address
            {coords ? " and map pin" : ""}.
          </p>
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
