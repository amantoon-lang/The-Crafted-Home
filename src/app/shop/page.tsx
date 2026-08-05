"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ProductGrid } from "@/components/products/product-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page") || "1");
  const [search, setSearch] = useState(q);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);
  const [suggestions, setSuggestions] = useState<
    { id: string; title: string; slug: string }[]
  >([]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("minPrice", String(priceRange[0]));
    params.set("maxPrice", String(priceRange[1]));
    return params.toString();
  }, [q, category, sort, page, priceRange]);

  const { data, isLoading } = useQuery({
    queryKey: ["products", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/products?${queryString}`);
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
      const json = await res.json();
      setSuggestions(json.suggestions || []);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    router.push(`/shop?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-2xl">
        <h1 className="font-display text-4xl sm:text-5xl">Shop handmade</h1>
        <p className="mt-3 text-muted-foreground">
          Search, filter, and discover pieces crafted for considered homes.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-8">
          <div className="relative space-y-2">
            <Label>Search</Label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateParams({ q: search || null, page: "1" });
                setSuggestions([]);
              }}
            >
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ceramic vase, oak..."
              />
            </form>
            {suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-soft)]">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
                    onClick={() => {
                      router.push(`/products/${s.slug}`);
                      setSuggestions([]);
                    }}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Categories</Label>
            <div className="flex flex-col gap-1">
              <button
                className={cn(
                  "rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary",
                  !category && "bg-secondary font-medium"
                )}
                onClick={() => updateParams({ category: null, page: "1" })}
              >
                All
              </button>
              {categoriesData?.categories?.map(
                (c: { slug: string; name: string; productCount: number }) => (
                  <button
                    key={c.slug}
                    className={cn(
                      "rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary",
                      category === c.slug && "bg-secondary font-medium"
                    )}
                    onClick={() => updateParams({ category: c.slug, page: "1" })}
                  >
                    {c.name}{" "}
                    <span className="text-muted-foreground">({c.productCount})</span>
                  </button>
                )
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Label>
              Price · ${priceRange[0]} – ${priceRange[1]}
            </Label>
            <Slider
              min={0}
              max={200}
              step={5}
              value={priceRange}
              onValueChange={(v) => setPriceRange(v as [number, number])}
              onValueCommit={(v) => {
                setPriceRange(v as [number, number]);
                updateParams({ page: "1" });
              }}
            />
          </div>
        </aside>

        <div>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {data?.pagination?.total ?? 0} pieces
            </p>
            <Select
              value={sort}
              onValueChange={(value) => updateParams({ sort: value, page: "1" })}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full" />
              ))}
            </div>
          ) : (
            <ProductGrid products={data?.products || []} />
          )}

          {data?.pagination?.pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                Previous
              </Button>
              <span className="px-3 text-sm text-muted-foreground">
                Page {page} of {data.pagination.pages}
              </span>
              <Button
                variant="outline"
                disabled={page >= data.pagination.pages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16">
          <Skeleton className="h-10 w-64" />
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
