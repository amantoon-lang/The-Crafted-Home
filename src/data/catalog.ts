import type { ProductCardData } from "@/types";

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

export const catalogCategories: CatalogCategory[] = [
  {
    id: "cat-wooden",
    name: "Wooden Decor",
    slug: "wooden-decor",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
  },
  {
    id: "cat-macrame",
    name: "Macrame",
    slug: "macrame",
    image: "https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=800&q=80",
  },
  {
    id: "cat-ceramics",
    name: "Ceramics",
    slug: "ceramics",
    image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80",
  },
  {
    id: "cat-wall",
    name: "Wall Art",
    slug: "wall-art",
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80",
  },
  {
    id: "cat-candles",
    name: "Candles",
    slug: "candles",
    image: "https://images.unsplash.com/photo-1603006905004-abd84d2429d2?w=800&q=80",
  },
  {
    id: "cat-planters",
    name: "Planters",
    slug: "planters",
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80",
  },
  {
    id: "cat-kitchen",
    name: "Kitchen Decor",
    slug: "kitchen-decor",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  },
];

const bySlug = Object.fromEntries(catalogCategories.map((c) => [c.slug, c]));

export const catalogProducts: CatalogProduct[] = [
  {
    id: "prod-oak-board",
    title: "Hand-Carved Oak Serving Board",
    slug: "hand-carved-oak-serving-board",
    description:
      "A generously sized serving board carved from sustainably sourced oak — perfect for entertaining or everyday kitchen rituals.",
    story:
      "Each board is finished by hand with food-safe oil so the grain deepens beautifully over time.",
    price: 89,
    discount: 10,
    images: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    ],
    stock: 24,
    artisan: "Maya Chen",
    materials: "American white oak, food-safe mineral oil",
    dimensions: "18 × 10 × 1 in",
    rating: 4.8,
    reviewCount: 42,
    featured: true,
    trending: true,
    bestSeller: true,
    categoryId: bySlug["wooden-decor"].id,
    category: { name: bySlug["wooden-decor"].name, slug: bySlug["wooden-decor"].slug },
    createdAt: "2026-06-01T00:00:00.000Z",
    reviews: [
      {
        id: "rev-1",
        rating: 5,
        comment: "Beautiful grain and substantial feel — our go-to cheese board.",
        createdAt: "2026-07-01T00:00:00.000Z",
        user: { name: "Avery Lane" },
      },
    ],
  },
  {
    id: "prod-macrame",
    title: "Linen Wall Macrame Tapestry",
    slug: "linen-wall-macrame-tapestry",
    description:
      "An airy large-scale macrame piece woven from soft natural cord — softens blank walls with texture and light.",
    story: "Knotted over three days, finished with a hand-sanded birch dowel.",
    price: 148,
    discount: 0,
    images: [
      "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=1200&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    ],
    stock: 12,
    artisan: "Elena Rojas",
    materials: "Natural linen cord, birch dowel",
    dimensions: "36 × 48 in",
    rating: 4.9,
    reviewCount: 67,
    featured: true,
    trending: true,
    bestSeller: false,
    categoryId: bySlug["macrame"].id,
    category: { name: bySlug["macrame"].name, slug: bySlug["macrame"].slug },
    createdAt: "2026-05-20T00:00:00.000Z",
    reviews: [],
  },
  {
    id: "prod-vases",
    title: "Speckled Stoneware Vase Set",
    slug: "speckled-stoneware-vase-set",
    description:
      "A trio of wheel-thrown vases with a soft speckled glaze — lovely alone or clustered on a console.",
    story: "Thrown on a kick wheel and glazed with a signature ash blend.",
    price: 112,
    discount: 15,
    images: [
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=1200&q=80",
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1200&q=80",
    ],
    stock: 18,
    artisan: "Jonah Hale",
    materials: "Stoneware clay, ash glaze",
    dimensions: "5–9 in height (set of 3)",
    rating: 4.7,
    reviewCount: 31,
    featured: true,
    trending: false,
    bestSeller: true,
    categoryId: bySlug["ceramics"].id,
    category: { name: bySlug["ceramics"].name, slug: bySlug["ceramics"].slug },
    createdAt: "2026-05-10T00:00:00.000Z",
    reviews: [],
  },
  {
    id: "prod-botanical",
    title: "Abstract Botanical Print",
    slug: "abstract-botanical-print",
    description:
      "Limited-edition print with soft greens and warm neutrals that complement handmade textiles and wood.",
    story: "Signed and numbered on archival cotton rag paper.",
    price: 78,
    discount: 0,
    images: [
      "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&q=80",
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&q=80",
    ],
    stock: 40,
    artisan: "Priya Nair",
    materials: "Archival cotton rag, pigment ink",
    dimensions: "16 × 20 in (unframed)",
    rating: 4.6,
    reviewCount: 19,
    featured: false,
    trending: true,
    bestSeller: false,
    categoryId: bySlug["wall-art"].id,
    category: { name: bySlug["wall-art"].name, slug: bySlug["wall-art"].slug },
    createdAt: "2026-04-28T00:00:00.000Z",
    reviews: [],
  },
  {
    id: "prod-candles",
    title: "Beeswax Pillar Candle Trio",
    slug: "beeswax-pillar-candle-trio",
    description:
      "Slow-burning beeswax pillars with a gentle honey scent — warm ambient light for evenings at home.",
    story: "Hand-poured in small batches and cooled overnight for an even burn.",
    price: 54,
    discount: 5,
    images: [
      "https://images.unsplash.com/photo-1603006905004-abd84d2429d2?w=1200&q=80",
      "https://images.unsplash.com/photo-1602607326812-0e5c8d5f0b8e?w=1200&q=80",
    ],
    stock: 55,
    artisan: "The Meadow Apothecary",
    materials: "100% beeswax, cotton wick, ceramic vessel",
    dimensions: "3 × 4 in each",
    rating: 4.9,
    reviewCount: 88,
    featured: true,
    trending: true,
    bestSeller: true,
    categoryId: bySlug["candles"].id,
    category: { name: bySlug["candles"].name, slug: bySlug["candles"].slug },
    createdAt: "2026-04-15T00:00:00.000Z",
    reviews: [],
  },
  {
    id: "prod-planter",
    title: "Terracotta Hanging Planter",
    slug: "terracotta-hanging-planter",
    description:
      "Hand-formed terracotta planter with a braided jute hanger — ideal for trailing greens and herbs.",
    story: "Fired in a wood kiln that leaves subtle flame marks on every piece.",
    price: 46,
    discount: 0,
    images: [
      "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1200&q=80",
      "https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=1200&q=80",
    ],
    stock: 30,
    artisan: "Sofia Alvarez",
    materials: "Terracotta clay, natural jute",
    dimensions: "6 in diameter × 5 in depth",
    rating: 4.5,
    reviewCount: 27,
    featured: false,
    trending: true,
    bestSeller: false,
    categoryId: bySlug["planters"].id,
    category: { name: bySlug["planters"].name, slug: bySlug["planters"].slug },
    createdAt: "2026-04-01T00:00:00.000Z",
    reviews: [],
  },
  {
    id: "prod-towels",
    title: "Handwoven Linen Tea Towels",
    slug: "handwoven-linen-tea-towels",
    description:
      "A set of three tea towels woven on a traditional loom — soft, absorbent, and beautiful on display.",
    story: "Woven from European flax linen in patterns passed down for generations.",
    price: 62,
    discount: 0,
    images: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
    ],
    stock: 45,
    artisan: "Meridian Loom Co-op",
    materials: "100% European flax linen",
    dimensions: "20 × 28 in each",
    rating: 4.8,
    reviewCount: 53,
    featured: true,
    trending: false,
    bestSeller: true,
    categoryId: bySlug["kitchen-decor"].id,
    category: { name: bySlug["kitchen-decor"].name, slug: bySlug["kitchen-decor"].slug },
    createdAt: "2026-03-22T00:00:00.000Z",
    reviews: [],
  },
  {
    id: "prod-shelf",
    title: "Walnut Floating Shelf",
    slug: "walnut-floating-shelf",
    description:
      "A minimal floating shelf milled from solid walnut — clean, gallery-like display for ceramics and books.",
    story: "Finished with hand-rubbed hardwax oil that deepens the grain over time.",
    price: 128,
    discount: 12,
    images: [
      "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=1200&q=80",
      "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80",
    ],
    stock: 16,
    artisan: "David Park",
    materials: "Solid walnut, steel hidden brackets",
    dimensions: "36 × 8 × 2 in",
    rating: 4.7,
    reviewCount: 22,
    featured: false,
    trending: false,
    bestSeller: true,
    categoryId: bySlug["wooden-decor"].id,
    category: { name: bySlug["wooden-decor"].name, slug: bySlug["wooden-decor"].slug },
    createdAt: "2026-03-10T00:00:00.000Z",
    reviews: [],
  },
  {
    id: "prod-pourover",
    title: "Ceramic Pour-Over Set",
    slug: "ceramic-pour-over-set",
    description:
      "A hand-thrown pour-over dripper with matching mug — ritual coffee, elevated.",
    story: "Refined over years of daily use for a balanced pour and easy cleaning.",
    price: 96,
    discount: 0,
    images: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80",
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1200&q=80",
    ],
    stock: 22,
    artisan: "Amelia Brooks",
    materials: "Porcelain, satin matte glaze",
    dimensions: "Dripper 5 in / Mug 12 oz",
    rating: 4.9,
    reviewCount: 74,
    featured: true,
    trending: true,
    bestSeller: true,
    categoryId: bySlug["ceramics"].id,
    category: { name: bySlug["ceramics"].name, slug: bySlug["ceramics"].slug },
    createdAt: "2026-03-01T00:00:00.000Z",
    reviews: [],
  },
  {
    id: "prod-mirror",
    title: "Woven Rattan Mirror",
    slug: "woven-rattan-mirror",
    description:
      "A circular mirror framed in handwoven rattan — organic texture for entryways and dressing nooks.",
    story: "Each frame takes a full day of careful weaving.",
    price: 164,
    discount: 8,
    images: [
      "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80",
      "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=1200&q=80",
    ],
    stock: 10,
    artisan: "Bali Weave Atelier",
    materials: "Natural rattan, glass mirror",
    dimensions: "28 in diameter",
    rating: 4.6,
    reviewCount: 15,
    featured: true,
    trending: false,
    bestSeller: false,
    categoryId: bySlug["wall-art"].id,
    category: { name: bySlug["wall-art"].name, slug: bySlug["wall-art"].slug },
    createdAt: "2026-02-18T00:00:00.000Z",
    reviews: [],
  },
  {
    id: "prod-cedar",
    title: "Cedarwood Diffuser Candle",
    slug: "cedarwood-diffuser-candle",
    description:
      "A soy-blend candle with notes of cedarwood, amber, and soft musk in reusable amber glass.",
    story: "Blended by hand in small batches; the wooden lid doubles as a coaster.",
    price: 38,
    discount: 0,
    images: [
      "https://images.unsplash.com/photo-1602607326812-0e5c8d5f0b8e?w=1200&q=80",
      "https://images.unsplash.com/photo-1603006905004-abd84d2429d2?w=1200&q=80",
    ],
    stock: 60,
    artisan: "Hearth & Wick",
    materials: "Soy wax blend, essential oils, amber glass",
    dimensions: "8 oz / 40-hour burn",
    rating: 4.8,
    reviewCount: 91,
    featured: false,
    trending: true,
    bestSeller: true,
    categoryId: bySlug["candles"].id,
    category: { name: bySlug["candles"].name, slug: bySlug["candles"].slug },
    createdAt: "2026-02-05T00:00:00.000Z",
    reviews: [],
  },
  {
    id: "prod-hanger",
    title: "Braided Plant Hanger",
    slug: "braided-plant-hanger",
    description:
      "A sculptural plant hanger braided from soft cotton rope — bring greenery into vertical space.",
    story: "Braided by hand in small studio batches.",
    price: 34,
    discount: 0,
    images: [
      "https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=1200&q=80",
      "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1200&q=80",
    ],
    stock: 38,
    artisan: "Nora Kim",
    materials: "Organic cotton rope",
    dimensions: "42 in length",
    rating: 4.4,
    reviewCount: 33,
    featured: false,
    trending: false,
    bestSeller: false,
    categoryId: bySlug["macrame"].id,
    category: { name: bySlug["macrame"].name, slug: bySlug["macrame"].slug },
    createdAt: "2026-01-28T00:00:00.000Z",
    reviews: [],
  },
].map((p) => p);

export function getCatalogCategories() {
  return catalogCategories.map((c) => ({
    ...c,
    productCount: catalogProducts.filter((p) => p.categoryId === c.id).length,
  }));
}

export function getCatalogProduct(slug: string) {
  return catalogProducts.find((p) => p.slug === slug) ?? null;
}

export function getRelatedProducts(product: CatalogProduct, limit = 4) {
  return catalogProducts
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, limit);
}

export function queryCatalogProducts(filters: {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  let list = [...catalogProducts];

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
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/** Demo accounts that work without a database (browse-first mode). */
export const DEMO_USERS = [
  {
    id: "demo-customer",
    name: "Avery Lane",
    email: "customer@craftedhome.com",
    password: "password123",
    role: "CUSTOMER" as const,
    phone: "+1 555 0101",
  },
  {
    id: "demo-admin",
    name: "Admin",
    email: "admin@craftedhome.com",
    password: "password123",
    role: "ADMIN" as const,
    phone: "+1 555 0100",
  },
];
