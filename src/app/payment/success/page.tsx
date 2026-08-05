"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");

  return (
    <div className="texture-bg flex min-h-[70vh] items-center justify-center px-4 py-16">
      <FadeIn className="w-full max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-6 font-display text-4xl">Order confirmed</h1>
        <p className="mt-3 text-muted-foreground">
          Thank you for supporting handmade makers. A confirmation has been logged
          for your email.
        </p>
        {orderId && (
          <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm">
            Order ID: <span className="font-medium">{orderId}</span>
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={`/orders${orderId ? `?highlight=${orderId}` : ""}`}>
              View orders
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </div>
      </FadeIn>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
