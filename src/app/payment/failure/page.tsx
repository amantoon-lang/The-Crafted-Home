"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";

function FailureContent() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("orderId");
  const [loading, setLoading] = useState(false);

  const retry = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "retry" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Retry failed");

      const confirm = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentIntentId: json.payment.paymentIntentId,
          action: "confirm",
        }),
      });
      const confirmJson = await confirm.json();
      if (!confirm.ok || !confirmJson.success) {
        toast.error("Payment failed again");
        return;
      }
      router.push(`/payment/success?orderId=${orderId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="texture-bg flex min-h-[70vh] items-center justify-center px-4 py-16">
      <FadeIn className="w-full max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
        <AlertCircle className="mx-auto h-14 w-14 text-destructive" />
        <h1 className="mt-6 font-display text-4xl">Payment failed</h1>
        <p className="mt-3 text-muted-foreground">
          Something went wrong while processing your payment. You can retry securely.
        </p>
        {orderId && (
          <p className="mt-4 text-sm text-muted-foreground">Order: {orderId}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={retry} disabled={!orderId || loading}>
            {loading ? "Retrying..." : "Retry payment"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/cart">Back to cart</Link>
          </Button>
        </div>
      </FadeIn>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense>
      <FailureContent />
    </Suspense>
  );
}
