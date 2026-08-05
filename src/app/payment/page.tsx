"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Stripe Elements entry point.
 * When NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set, integrate @stripe/react-stripe-js here.
 * Currently redirects demo flow through checkout confirmation.
 */
function PaymentContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const clientSecret = params.get("clientSecret");

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-display text-3xl">Complete payment</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {clientSecret
          ? "Stripe client secret received. Mount Payment Element when Stripe keys are configured."
          : "No payment session found."}
      </p>
      {orderId && (
        <p className="mt-4 text-xs text-muted-foreground">Order {orderId}</p>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-20 h-40 w-96" />}>
      <PaymentContent />
    </Suspense>
  );
}
