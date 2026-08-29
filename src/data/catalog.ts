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
const IMAGE_DIR = "public/catalog-images";

function githubConfig() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo =
    process.env.GITHUB_REPO ||
    (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : "amantoon-lang/The-Crafted-Home");
  // Prefer explicit catalog branch; default to main (not preview deploy ref).
  const branch = process.env.GITHUB_CATALOG_BRANCH || "main";
  return { token, repo, branch };
}

async function putGithubFile(
  path: string,
  contentBase64: string,
  message: string
): Promise<{ ok: boolean; error?: string; url?: string }> {
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
      `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
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

    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "the-crafted-home",
        },
        body: JSON.stringify({
          message,
          content: contentBase64,
          branch,
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.text();
      if (putRes.status === 403 || putRes.status === 401) {
        return {
          ok: false,
          error:
            "GitHub token cannot write to the repo. Use a classic PAT with the `repo` scope, set GITHUB_TOKEN in Vercel, and redeploy.",
        };
      }
      return { ok: false, error: err.slice(0, 300) };
    }

    const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
    return { ok: true, url: rawUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

/** Host a product image in the repo so Next/Image can load it (no Telegram bot URLs). */
export async function uploadCatalogImage(
  bytes: Buffer,
  filename: string,
  message?: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${IMAGE_DIR}/${safe}`;
  const saved = await putGithubFile(
    path,
    bytes.toString("base64"),
    message || `telegram: upload image ${safe}`
  );
  return saved;
}

function isCatalogData(data: unknown): data is CatalogData {
  if (!data || typeof data !== "object") return false;
  const d = data as CatalogData;
  return Array.isArray(d.categories) && Array.isArray(d.products);
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
        const data = await res.json();
        if (isCatalogData(data)) return data;
      }
    }

    // Public raw fallback (no token needed for public repos)
    const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${CATALOG_PATH}?t=${Date.now()}`;
    const rawRes = await fetch(rawUrl, { cache: "no-store" });
    if (rawRes.ok) {
      const data = await rawRes.json();
      if (isCatalogData(data)) return data;
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
  const saved = await putGithubFile(
    CATALOG_PATH,
    Buffer.from(JSON.stringify(data, null, 2) + "\n").toString("base64"),
    message
  );
  return { ok: saved.ok, error: saved.error };
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

export function findCategoryIndex(data: CatalogData, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return -1;
  const bySlug = data.categories.findIndex((c) => c.slug.toLowerCase() === q);
  if (bySlug !== -1) return bySlug;
  const exactName = data.categories.findIndex((c) => c.name.toLowerCase() === q);
  if (exactName !== -1) return exactName;
  return data.categories.findIndex((c) => c.name.toLowerCase().includes(q));
}

const DEFAULT_CATEGORY_IMAGE =
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80";

export function createCategoryFromFields(
  data: CatalogData,
  fields: Record<string, string>
): { category?: CatalogCategory; error?: string } {
  const name = fields.name?.trim();
  if (!name) return { error: "name is required" };

  const slug = slugify(fields.slug || name);
  if (!slug) return { error: "slug could not be derived from name" };
  if (data.categories.some((c) => c.slug === slug)) {
    return { error: `Category slug "${slug}" already exists` };
  }

  const category: CatalogCategory = {
    id: `cat-${Date.now().toString(36)}`,
    name,
    slug,
    image: fields.image?.trim() || DEFAULT_CATEGORY_IMAGE,
  };
  return { category };
}

/** Update name/image/slug on an existing category and sync embedded product.category. */
export function applyCategoryUpdate(
  data: CatalogData,
  index: number,
  fields: Record<string, string>
): { error?: string } {
  const current = data.categories[index];
  if (!current) return { error: "Category not found" };

  if (fields.name?.trim()) current.name = fields.name.trim();

  if (fields.slug?.trim()) {
    const nextSlug = slugify(fields.slug);
    if (!nextSlug) return { error: "Invalid slug" };
    if (
      data.categories.some((c, i) => i !== index && c.slug === nextSlug)
    ) {
      return { error: `Category slug "${nextSlug}" already exists` };
    }
    current.slug = nextSlug;
  }

  if (fields.image?.trim()) current.image = fields.image.trim();

  for (const p of data.products) {
    if (p.categoryId === current.id) {
      p.category = { name: current.name, slug: current.slug };
    }
  }
  return {};
}

export function moveCategory(
  data: CatalogData,
  index: number,
  position: number
): { error?: string } {
  if (index < 0 || index >= data.categories.length) {
    return { error: "Category not found" };
  }
  const max = data.categories.length;
  const target = Math.max(1, Math.min(max, Math.round(position))) - 1;
  if (target === index) return {};
  const [item] = data.categories.splice(index, 1);
  data.categories.splice(target, 0, item);
  return {};
}

/** Sync helpers for pages that still import named exports */
export const catalogCategories = (localCatalog as CatalogData).categories;
export const catalogProducts = (localCatalog as CatalogData).products;

export const DEMO_USERS = [
  {
    id: "demo-customer",
    name: "Avery Lane",
    email: "customer@craftedhome.com",
    password: "password123",
    role: "CUSTOMER" as const,
    phone: "+91 98765 43210",
  },
  {
    id: "demo-admin",
    name: "Admin",
    email: "admin@craftedhome.com",
    password: "password123",
    role: "ADMIN" as const,
    phone: "+91 98765 43211",
  },
];
