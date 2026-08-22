import localCatalog from "@/data/catalog.json";
import type { ProductCardData } from "@/types";
import { slugify } from "@/lib/utils";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount?: number;
};

export type CatalogProduct = ProductCardData & {
  description: string;
  story: string;
  /** Why this piece exists — the human reason behind making it */
  whyMade?: string;
  /** How it was made — materials, process, craft */
  howMade?: string;
  materials: string;
  dimensions: string;
  categoryId: string;
  createdAt: string;
  reviews: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    user: { name: string | null };
  }[];
};

export type CatalogData = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
};

const CATALOG_PATH = "src/data/catalog.json";

function githubConfig() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo =
    process.env.GITHUB_REPO ||
    (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : "amantoon-lang/The-Crafted-Home");
  const branch =
    process.env.GITHUB_CATALOG_BRANCH ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    "main";
  return { token, repo, branch };
}

/** Load catalog — prefers live GitHub file so Telegram updates apply without redeploy. */
export async function loadCatalog(): Promise<CatalogData> {
  const { token, repo, branch } = githubConfig();
  try {
    if (token) {
      const headers: HeadersInit = {
        Accept: "application/vnd.github.raw+json",
        "User-Agent": "the-crafted-home",
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
      };
      const url = `https://api.github.com/repos/${repo}/contents/${CATALOG_PATH}?ref=${encodeURIComponent(branch)}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as CatalogData;
        if (data?.products?.length) return data;
      }
    }

    // Public raw fallback (no token needed for public repos)
    const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${CATALOG_PATH}?t=${Date.now()}`;
    const rawRes = await fetch(rawUrl, { cache: "no-store" });
    if (rawRes.ok) {
      const data = (await rawRes.json()) as CatalogData;
      if (data?.products?.length) return data;
    }
  } catch {
    // fall through to bundled catalog
  }
  return localCatalog as CatalogData;
}

export async function saveCatalog(
  data: CatalogData,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const { token, repo, branch } = githubConfig();
  if (!token) {
    return {
      ok: false,
      error:
        "GITHUB_TOKEN is not set. Add a GitHub personal access token with repo contents write access in Vercel env.",
    };
  }

  try {
    const metaRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${CATALOG_PATH}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "the-crafted-home",
        },
        cache: "no-store",
      }
    );
    const meta = metaRes.ok ? await metaRes.json() : null;
    const sha = meta?.sha as string | undefined;

    const body = {
      message,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    };

    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${CATALOG_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "the-crafted-home",
        },
        body: JSON.stringify(body),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.text();
      return { ok: false, error: err.slice(0, 300) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export function getCatalogCategories(data: CatalogData) {
  return data.categories.map((c) => ({
    ...c,
    productCount: data.products.filter((p) => p.categoryId === c.id).length,
  }));
}

export function getCatalogProduct(data: CatalogData, slug: string) {
  return data.products.find((p) => p.slug === slug) ?? null;
}

export function getRelatedProducts(
  data: CatalogData,
  product: CatalogProduct,
  limit = 4
) {
  return data.products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, limit);
}

export function queryCatalogProducts(
  data: CatalogData,
  filters: {
    q?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }
) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  let list = [...data.products];

  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.artisan.toLowerCase().includes(q) ||
        p.materials.toLowerCase().includes(q)
    );
  }
  if (filters.category) {
    list = list.filter((p) => p.category?.slug === filters.category);
  }
  if (filters.minPrice !== undefined) {
    list = list.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    list = list.filter((p) => p.price <= filters.maxPrice!);
  }

  switch (filters.sort) {
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "popularity":
      list.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    default:
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  const total = list.length;
  const start = (page - 1) * limit;
  const products = list.slice(start, start + limit).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: p.price,
    discount: p.discount,
    images: p.images,
    artisan: p.artisan,
    rating: p.rating,
    reviewCount: p.reviewCount,
    stock: p.stock,
    category: p.category,
    featured: p.featured,
    trending: p.trending,
    bestSeller: p.bestSeller,
  }));

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export function createProductFromFields(
  data: CatalogData,
  fields: Record<string, string>
): { product?: CatalogProduct; error?: string } {
  const title = fields.title?.trim();
  const price = Number(fields.price);
  if (!title) return { error: "title is required" };
  if (!Number.isFinite(price) || price <= 0) return { error: "price must be a positive number (INR)" };

  const categorySlug = (fields.category || "ceramics").toLowerCase();
  const category =
    data.categories.find((c) => c.slug === categorySlug) || data.categories[0];
  if (!category) return { error: "No categories configured" };

  const slug = slugify(fields.slug || title);
  if (data.products.some((p) => p.slug === slug)) {
    return { error: `Product with slug "${slug}" already exists` };
  }

  const image = fields.image?.trim();
  const product: CatalogProduct = {
    id: `prod-${Date.now().toString(36)}`,
    title,
    slug,
    description: fields.description?.trim() || title,
    story: fields.story?.trim() || "",
    whyMade: fields.whymade?.trim() || fields.why?.trim() || "",
    howMade: fields.howmade?.trim() || fields.how?.trim() || "",
    price: Math.round(price),
    discount: Number(fields.discount || 0) || 0,
    images: image
      ? [image]
      : [
          "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
        ],
    stock: Number(fields.stock || 10) || 10,
    artisan: fields.artisan?.trim() || "The Crafted Home",
    materials: fields.materials?.trim() || "Handmade",
    dimensions: fields.dimensions?.trim() || "",
    rating: 5,
    reviewCount: 0,
    featured: fields.featured === "true",
    trending: fields.trending === "true",
    bestSeller: fields.bestseller === "true",
    categoryId: category.id,
    category: { name: category.name, slug: category.slug },
    createdAt: new Date().toISOString(),
    reviews: [],
  };

  return { product };
}

export function parseKeyValueMessage(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key) fields[key] = value;
  }
  return fields;
}

/** Sync helpers for pages that still import named exports */
export const catalogCategories = (localCatalog as CatalogData).categories;
export const catalogProducts = (localCatalog as CatalogData).products;
