import { ProductCard } from "@/components/products/product-card";
import type { ProductCardData } from "@/types";

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  if (!products.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-16 text-center">
        <p className="font-display text-2xl">No pieces found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
