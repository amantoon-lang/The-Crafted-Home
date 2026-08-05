"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart3,
  Boxes,
  Package,
  Ticket,
  Users,
  AlertTriangle,
} from "lucide-react";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/admin");
    if (status === "authenticated" && session.user.role !== "ADMIN") {
      router.push("/profile");
    }
  }, [status, session, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) throw new Error("Failed to load admin data");
      return res.json();
    },
    enabled: status === "authenticated" && session?.user.role === "ADMIN",
  });

  if (status === "loading" || isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Unable to load admin dashboard.</p>
      </div>
    );
  }

  const cards = [
    { label: "Revenue", value: formatCurrency(data.stats.revenue), icon: BarChart3 },
    { label: "Orders", value: data.stats.orders, icon: Package },
    { label: "Customers", value: data.stats.customers, icon: Users },
    { label: "Products", value: data.stats.products, icon: Boxes },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="font-display text-4xl">Admin dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Orders, inventory, customers, coupons, and analytics at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <card.icon className="h-4 w-4 text-accent" />
            </div>
            <p className="mt-3 font-display text-3xl">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-border p-6">
          <h2 className="font-display text-2xl">Recent orders</h2>
          <div className="mt-4 space-y-3">
            {data.recentOrders.map(
              (order: {
                id: string;
                total: number;
                status: string;
                paymentStatus: string;
                createdAt: string;
                customer: { name: string | null; email: string };
                itemCount: number;
              }) => (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{order.customer.name || order.customer.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.createdAt), "MMM d")} · {order.itemCount} items
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{order.status}</Badge>
                    <span className="font-medium">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl">Low inventory</h2>
          </div>
          <div className="mt-4 space-y-3">
            {data.lowStock.map((p: { id: string; title: string; stock: number }) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3 text-sm"
              >
                <span>{p.title}</span>
                <Badge variant={p.stock <= 5 ? "accent" : "secondary"}>{p.stock} left</Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border p-6">
          <h2 className="font-display text-2xl">Categories</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.categories.map((c: { id: string; name: string; productCount: number }) => (
              <li key={c.id} className="flex justify-between border-b border-border py-2">
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.productCount} products</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl">Coupons</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {data.coupons.map(
              (c: {
                id: string;
                code: string;
                description: string | null;
                usedCount: number;
                active: boolean;
              }) => (
                <li key={c.id} className="rounded-xl bg-secondary/50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.code}</span>
                    <Badge variant={c.active ? "default" : "outline"}>
                      {c.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.description} · used {c.usedCount}×
                  </p>
                </li>
              )
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
