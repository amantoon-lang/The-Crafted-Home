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

export type TopNavSlot = {
  label: string;
  type: "shop" | "bestsellers" | "category";
  /** Required when type is category */
  categorySlug?: string;
};

/** Homepage blocks that can be toggled / curated via Telegram `/home`. */
export type HomeSectionKey =
  | "hero"
  | "collections"
  | "featured"
  | "trending"
  | "bestsellers"
  | "artisans"
  | "whyHandmade"
  | "testimonials"
  | "atelier";

export type HomeSectionConfig = {
  visible: boolean;
  /**
   * Explicit picks. Empty = automatic defaults on the homepage.
   * - collections → category ids
   * - hero / featured / trending / bestsellers / artisans / atelier → product ids
   * - whyHandmade / testimonials → unused (visibility only)
   */
  itemIds: string[];
};

export type HomeSectionsConfig = Record<HomeSectionKey, HomeSectionConfig>;

export type CatalogData = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  /** Exactly 4 header links (Shop / Bestsellers / two collections by default). */
  topNav?: TopNavSlot[];
  /** Homepage section visibility + curated items (Telegram `/home`). */
  homeSections?: HomeSectionsConfig;
};

export const DEFAULT_TOP_NAV: TopNavSlot[] = [
  { label: "Shop", type: "shop" },
  { label: "Bestsellers", type: "bestsellers" },
  { label: "Ceramics", type: "category", categorySlug: "ceramics" },
  { label: "Wood", type: "category", categorySlug: "wooden-decor" },
];

export function ensureTopNav(data: CatalogData): TopNavSlot[] {
  if (Array.isArray(data.topNav) && data.topNav.length === 4) {
    return data.topNav;
  }
  data.topNav = DEFAULT_TOP_NAV.map((s) => ({ ...s }));
  return data.topNav;
}

/** Resolved header links for the site. */
export function getTopNavLinks(data: CatalogData): { href: string; label: string }[] {
  const slots = ensureTopNav(data);
  return slots.map((slot) => {
    if (slot.type === "shop") {
      return { href: "/shop", label: slot.label || "Shop" };
    }
    if (slot.type === "bestsellers") {
      return {
        href: "/shop?sort=popularity",
        label: slot.label || "Bestsellers",
      };
    }
    const slug = slot.categorySlug || "";
    const cat = data.categories.find((c) => c.slug === slug);
    return {
      href: `/shop?category=${slug}`,
      label: slot.label || cat?.name || slug || "Collection",
    };
  });
}

export function setTopNavSlot(
  data: CatalogData,
  index: number,
  slot: {
    type: TopNavSlot["type"];
    label?: string;
    categorySlug?: string;
  }
): { error?: string } {
  if (index < 0 || index > 3) return { error: "Slot must be 1–4" };
  ensureTopNav(data);
  if (slot.type === "category") {
    if (!slot.categorySlug) return { error: "categorySlug is required" };
    const cat = data.categories.find((c) => c.slug === slot.categorySlug);
    if (!cat) return { error: `Unknown category: ${slot.categorySlug}` };
    data.topNav![index] = {
      type: "category",
      categorySlug: cat.slug,
      label: slot.label?.trim() || cat.name,
    };
    return {};
  }
  data.topNav![index] = {
    type: slot.type,
    label:
      slot.label?.trim() ||
      (slot.type === "shop" ? "Shop" : "Bestsellers"),
  };
  return {};
}

/** Clear or retarget top-nav slots that pointed at a removed category. */
export function clearTopNavCategory(data: CatalogData, categorySlug: string) {
  ensureTopNav(data);
  const fallback = data.categories[0];
  for (let i = 0; i < data.topNav!.length; i++) {
    const slot = data.topNav![i];
    if (slot.type === "category" && slot.categorySlug === categorySlug) {
      if (fallback) {
        data.topNav![i] = {
          type: "category",
          categorySlug: fallback.slug,
          label: fallback.name,
        };
      } else {
        data.topNav![i] = { type: "shop", label: "Shop" };
      }
    }
  }
}

export const HOME_SECTION_META: {
  key: HomeSectionKey;
  label: string;
  /** Short key used in Telegram callback_data */
  short: string;
  itemKind: "product" | "category" | "none";
  /** Max curated items (hero = 1 photo). 0 = no cap for picker UX. */
  maxItems: number;
}[] = [
  { key: "hero", label: "Hero", short: "hero", itemKind: "product", maxItems: 1 },
  {
    key: "collections",
    label: "Featured Collections",
    short: "collections",
    itemKind: "category",
    maxItems: 12,
  },
  {
    key: "featured",
    label: "Featured Pieces",
    short: "featured",
    itemKind: "product",
    maxItems: 8,
  },
  {
    key: "trending",
    label: "Trending",
    short: "trending",
    itemKind: "product",
    maxItems: 8,
  },
  {
    key: "bestsellers",
    label: "Bestsellers",
    short: "bestsellers",
    itemKind: "product",
    maxItems: 8,
  },
  {
    key: "artisans",
    label: "Featured Artisans",
    short: "artisans",
    itemKind: "product",
    maxItems: 8,
  },
  {
    key: "whyHandmade",
    label: "Why Buy Handmade",
    short: "why",
    itemKind: "none",
    maxItems: 0,
  },
  {
    key: "testimonials",
    label: "Stories from Home",
    short: "stories",
    itemKind: "none",
    maxItems: 0,
  },
  {
    key: "atelier",
    label: "From the Atelier",
    short: "atelier",
    itemKind: "product",
    maxItems: 12,
  },
];

const HOME_SHORT_TO_KEY = Object.fromEntries(
  HOME_SECTION_META.map((m) => [m.short, m.key])
) as Record<string, HomeSectionKey>;

export function homeSectionKeyFromShort(short: string): HomeSectionKey | null {
  return HOME_SHORT_TO_KEY[short] || null;
}

export function homeSectionMeta(key: HomeSectionKey) {
  return HOME_SECTION_META.find((m) => m.key === key)!;
}

export const DEFAULT_HOME_SECTIONS: HomeSectionsConfig = {
  hero: { visible: true, itemIds: [] },
  collections: { visible: true, itemIds: [] },
  featured: { visible: true, itemIds: [] },
  trending: { visible: true, itemIds: [] },
  bestsellers: { visible: true, itemIds: [] },
  artisans: { visible: true, itemIds: [] },
  whyHandmade: { visible: true, itemIds: [] },
  testimonials: { visible: true, itemIds: [] },
  atelier: { visible: true, itemIds: [] },
};

export function ensureHomeSections(data: CatalogData): HomeSectionsConfig {
  if (!data.homeSections) {
    data.homeSections = structuredClone(DEFAULT_HOME_SECTIONS);
    return data.homeSections;
  }
  for (const meta of HOME_SECTION_META) {
    const cur = data.homeSections[meta.key];
    if (!cur || typeof cur.visible !== "boolean") {
      data.homeSections[meta.key] = {
        visible: true,
        itemIds: Array.isArray(cur?.itemIds) ? cur.itemIds.filter(Boolean) : [],
      };
    } else if (!Array.isArray(cur.itemIds)) {
      cur.itemIds = [];
    }
  }
  return data.homeSections;
}

export function setHomeSectionVisible(
  data: CatalogData,
  key: HomeSectionKey,
  visible: boolean
) {
  const sections = ensureHomeSections(data);
  sections[key].visible = visible;
  if (!visible) {
    // Keep itemIds so turning back on restores the curation
  }
}

export function setHomeSectionItems(
  data: CatalogData,
  key: HomeSectionKey,
  itemIds: string[]
): { error?: string } {
  const meta = homeSectionMeta(key);
  if (meta.itemKind === "none") {
    return { error: "This section has no items to pick." };
  }
  const sections = ensureHomeSections(data);
  const unique = [...new Set(itemIds.filter(Boolean))];
  if (meta.maxItems > 0 && unique.length > meta.maxItems) {
    return { error: `Pick at most ${meta.maxItems} items for ${meta.label}.` };
  }
  if (meta.itemKind === "category") {
    const ok = new Set(data.categories.map((c) => c.id));
    for (const id of unique) {
      if (!ok.has(id)) return { error: `Unknown category id: ${id}` };
    }
  } else {
    const ok = new Set(data.products.map((p) => p.id));
    for (const id of unique) {
      if (!ok.has(id)) return { error: `Unknown product id: ${id}` };
    }
  }
  sections[key].itemIds = unique;
  return {};
}

export function toggleHomeSectionItem(
  data: CatalogData,
  key: HomeSectionKey,
  itemId: string
): { error?: string; selected?: boolean } {
  const meta = homeSectionMeta(key);
  if (meta.itemKind === "none") {
    return { error: "This section has no items to pick." };
  }
  const sections = ensureHomeSections(data);
  const ids = sections[key].itemIds;
  const idx = ids.indexOf(itemId);
  if (idx >= 0) {
    ids.splice(idx, 1);
    return { selected: false };
  }
  if (meta.maxItems === 1) {
    sections[key].itemIds = [itemId];
    return { selected: true };
  }
  if (meta.maxItems > 0 && ids.length >= meta.maxItems) {
    return { error: `Max ${meta.maxItems} items for ${meta.label}.` };
  }
  if (meta.itemKind === "category") {
    if (!data.categories.some((c) => c.id === itemId)) {
      return { error: "Unknown category" };
    }
  } else if (!data.products.some((p) => p.id === itemId)) {
    return { error: "Unknown product" };
  }
  ids.push(itemId);
  return { selected: true };
}

/** Drop deleted product/category ids from homepage curation. */
export function pruneHomeSectionItems(data: CatalogData) {
  const sections = ensureHomeSections(data);
  const productIds = new Set(data.products.map((p) => p.id));
  const categoryIds = new Set(data.categories.map((c) => c.id));
  for (const meta of HOME_SECTION_META) {
    if (meta.itemKind === "none") continue;
    const allowed = meta.itemKind === "category" ? categoryIds : productIds;
    sections[meta.key].itemIds = sections[meta.key].itemIds.filter((id) =>
      allowed.has(id)
    );
  }
}

/** Resolve products for a curated shelf (order preserved). Empty ids → fallback. */
export function resolveHomeProducts(
  data: CatalogData,
  key: HomeSectionKey,
  fallback: CatalogProduct[],
  limit: number
): CatalogProduct[] {
  const section = ensureHomeSections(data)[key];
  if (!section.visible) return [];
  if (section.itemIds.length) {
    const byId = new Map(data.products.map((p) => [p.id, p]));
    return section.itemIds
      .map((id) => byId.get(id))
      .filter((p): p is CatalogProduct => Boolean(p))
      .slice(0, limit);
  }
  return fallback.slice(0, limit);
}

export function resolveHomeCategories(
  data: CatalogData,
  limit = 12
): CatalogCategory[] {
  const section = ensureHomeSections(data).collections;
  if (!section.visible) return [];
  if (section.itemIds.length) {
    const byId = new Map(data.categories.map((c) => [c.id, c]));
    return section.itemIds
      .map((id) => byId.get(id))
      .filter((c): c is CatalogCategory => Boolean(c))
      .slice(0, limit);
  }
  return data.categories.slice(0, limit);
}

const CATALOG_PATH = "src/data/catalog.json";
const IMAGE_DIR = "public/catalog-images";
const VIDEO_DIR = "public/catalog-videos";

/** Products support at least 5 photos; hard cap keeps GitHub uploads manageable. */
export const MAX_PRODUCT_IMAGES = 8;

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

/** Host a product video in the repo (mp4/webm). Keep files modest for GitHub. */
export async function uploadCatalogVideo(
  bytes: Buffer,
  filename: string,
  message?: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const maxBytes = 18 * 1024 * 1024; // Telegram bot download limit ~20MB
  if (bytes.length > maxBytes) {
    return {
      ok: false,
      error: `Video is too large (${Math.round(bytes.length / 1024 / 1024)}MB). Keep under 18MB.`,
    };
  }
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${VIDEO_DIR}/${safe}`;
  const saved = await putGithubFile(
    path,
    bytes.toString("base64"),
    message || `telegram: upload video ${safe}`
  );
  return saved;
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
  ensureTopNav(data);
  ensureHomeSections(data);
  pruneHomeSectionItems(data);
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
  const imagesFromField = (fields.images || "")
    .split(/[,|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const images = [
    ...imagesFromField,
    ...(image && !imagesFromField.includes(image) ? [image] : []),
  ].slice(0, MAX_PRODUCT_IMAGES);

  const video = fields.video?.trim() || null;

  const product: CatalogProduct = {
    id: `prod-${Date.now().toString(36)}`,
    title,
    slug,
    description: fields.description?.trim() || title,
    story: fields.story?.trim() || "",
    price: Math.round(price),
    discount: Number(fields.discount || 0) || 0,
    images: images.length
      ? images
      : [
          "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
        ],
    video,
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

  return {
    category: {
      id: `cat-${Date.now().toString(36)}`,
      name,
      slug,
      image: fields.image?.trim() || DEFAULT_CATEGORY_IMAGE,
    },
  };
}

/** Update name/image/slug and sync embedded product.category fields. */
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
    if (data.categories.some((c, i) => i !== index && c.slug === nextSlug)) {
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
