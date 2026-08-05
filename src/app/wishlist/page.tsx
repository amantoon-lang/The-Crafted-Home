"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ProductGrid } from "@/components/products/product-grid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlistStore } from "@/store";

export default function WishlistPage() {
  const { status } = useSession();
  const router = useRouter();
  const setIds = useWishlistStore((s) => s.setIds);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/wishlist");
  }, [status, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const res = await fetch("/api/wishlist");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  useEffect(() => {
    if (data?.ids) setIds(data.ids);
  }, [data, setIds]);

  if (status === "loading" || isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl">Wishlist</h1>
      <p className="mt-2 text-muted-foreground">Pieces you&apos;ve saved for later.</p>
      <div className="mt-10">
        {data?.items?.length ? (
          <ProductGrid products={data.items} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-muted-foreground">Your wishlist is empty.</p>
            <Button asChild className="mt-6">
              <Link href="/shop">Explore the shop</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
