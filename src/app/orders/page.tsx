"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";

function OrdersContent() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const highlight = params.get("highlight");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/orders");
  }, [status, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  if (status === "loading" || isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const orders = data?.orders || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl">Order history</h1>
      {!orders.length ? (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">No orders yet.</p>
          <Button asChild className="mt-6">
            <Link href="/shop">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map(
            (order: {
              id: string;
              status: string;
              paymentStatus: string;
              total: number;
              createdAt: string;
              items: { title: string; quantity: number; price: number }[];
            }) => (
              <article
                key={order.id}
                className={cn(
                  "rounded-2xl border border-border p-5",
                  highlight === order.id && "ring-2 ring-accent"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.createdAt), "MMM d, yyyy · h:mm a")}
                    </p>
                    <p className="mt-1 font-medium">Order {order.id.slice(0, 8)}…</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{order.status}</Badge>
                    <Badge variant={order.paymentStatus === "PAID" ? "default" : "outline"}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </div>
                <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                  {order.items.map((item, i) => (
                    <li key={`${order.id}-${i}`}>
                      {item.title} × {item.quantity} — {formatCurrency(item.price * item.quantity)}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-right font-semibold">{formatCurrency(order.total)}</p>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersContent />
    </Suspense>
  );
}
