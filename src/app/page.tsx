import Link from "next/link";
import Image from "next/image";
import { loadCatalog } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/products/product-grid";
import { FadeIn } from "@/components/ui/motion";
import { Quote, Leaf, HandHeart, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

/** Scene photos matched to craft materials — used when a category still has a generic stock image. */
const CATEGORY_SCENES: Record<string, string> = {
  decor:
    "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80",
  "home-decor":
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
  "home-furnishing":
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
  jewellery:
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80",
  jewelry:
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80",
  "wooden-decor":
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  ceramics:
    "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80",
  candles:
    "https://images.unsplash.com/photo-1478144592103-25e218a04891?w=800&q=80",
  textiles:
    "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80",
  macrame:
    "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80",
};

const GENERIC_STOCK = [
  "photo-1616486338812-3dadae4b4ace", // repeated wood living-room stock
];

function isGenericStock(url: string) {
  return GENERIC_STOCK.some((id) => url.includes(id));
}

function categoryDisplayImage(category: {
  slug: string;
  image: string;
  name: string;
}) {
  if (category.image && !isGenericStock(category.image)) {
    return category.image;
  }
  return CATEGORY_SCENES[category.slug] || category.image;
}

const testimonials = [
  {
    quote:
      "The pooja thali feels like it was made for our home — warm wood, careful carving, and it arrived beautifully packed.",
    name: "Ananya Mehta",
    place: "Bhopal",
  },
  {
    quote:
      "Finally a marketplace that respects Indian craftsmanship. Our guests always ask where the holy cow piece is from.",
    name: "Rohit Sharma",
    place: "Indore",
  },
  {
    quote:
      "Quiet, handmade décor with real presence. Shipping was careful and every piece tells a story.",
    name: "Priya Nair",
    place: "Bengaluru",
  },
];

export default async function HomePage() {
  const catalog = await loadCatalog();
  const categories = catalog.categories;
  const latest = [...catalog.products].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const featured = (
    catalog.products.filter((p) => p.featured).length
      ? catalog.products.filter((p) => p.featured)
      : latest
  ).slice(0, 4);

  const trending = (
    catalog.products.filter((p) => p.trending).length
      ? catalog.products.filter((p) => p.trending)
      : latest
  ).slice(0, 4);

  const bestsellers = (
    catalog.products.filter((p) => p.bestSeller).length
      ? catalog.products.filter((p) => p.bestSeller)
      : latest
  ).slice(0, 4);

  const artisans = [
    ...new Map(
      catalog.products.slice(0, 8).map((p) => [
        p.artisan,
        {
          name: p.artisan,
          image: p.images[0],
          category: p.category?.name || "",
        },
      ])
    ).values(),
  ].slice(0, 4);

  // Hero: real catalog craft photo when available
  const heroImage =
    latest.find((p) => p.images?.[0])?.images[0] ||
    "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=2000&q=80";
  const heroAlt =
    latest[0]?.title ||
    "Handmade ceramics and craft pieces for the home";

  // Atelier strip: actual product photos, then category scenes
  const atelierImages = [
    ...latest.flatMap((p) => p.images.slice(0, 2)),
    ...categories.map((c) => categoryDisplayImage(c)),
  ]
    .filter(Boolean)
    .filter((url, i, arr) => arr.indexOf(url) === i)
    .slice(0, 6);

  while (atelierImages.length < 6) {
    atelierImages.push(
      CATEGORY_SCENES.ceramics,
      CATEGORY_SCENES.candles,
      CATEGORY_SCENES["wooden-decor"],
      CATEGORY_SCENES.textiles,
      CATEGORY_SCENES.jewellery,
      CATEGORY_SCENES["home-decor"]
    );
  }
  const atelier = atelierImages.slice(0, 6);

  return (
    <div>
      <section className="relative min-h-[92vh] w-full overflow-hidden">
        <Image
          src={heroImage}
          alt={heroAlt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-28">
          <FadeIn>
            <p className="font-display text-4xl text-white sm:text-6xl lg:text-7xl">
              The Crafted Home
            </p>
          </FadeIn>
          <FadeIn delay={0.12}>
            <h1 className="mt-4 max-w-2xl text-xl font-light text-white/90 sm:text-2xl lg:text-3xl">
              Handcrafted with Love, Designed for Your Home.
            </h1>
          </FadeIn>
          <FadeIn delay={0.22}>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
              Made in India · Born in Bhopal — ceramics, wood, textiles, and
              ritual pieces from independent artisans for everyday living.
            </p>
          </FadeIn>
          <FadeIn delay={0.32}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent">
                <Link href="/shop">Shop Now</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="#collections">Explore Collections</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="collections" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-10 max-w-xl">
            <h2 className="font-display text-3xl sm:text-4xl">Featured Collections</h2>
            <p className="mt-3 text-muted-foreground">
              Explore categories shaped by material, craft, and the makers behind them.
            </p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {categories.map((category, i) => (
            <FadeIn key={category.id} delay={i * 0.05}>
              <Link
                href={`/shop?category=${category.slug}`}
                className="image-zoom group relative block aspect-[4/5] overflow-hidden rounded-2xl"
              >
                <Image
                  src={categoryDisplayImage(category)}
                  alt={`${category.name} — handmade collection`}
                  fill
                  className="object-cover"
                  sizes="(max-width:768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <span className="absolute bottom-4 left-4 font-display text-xl text-white">
                  {category.name}
                </span>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="texture-bg py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl">Featured Pieces</h2>
              <p className="mt-3 text-muted-foreground">
                Fresh from the workshop — pieces with lasting presence.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/shop">View all</Link>
            </Button>
          </div>
          <ProductGrid products={featured} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="font-display text-3xl sm:text-4xl">Trending Handmade Items</h2>
          <p className="mt-3 text-muted-foreground">
            What collectors are bringing home this season.
          </p>
        </div>
        <ProductGrid products={trending} />
      </section>

      <section className="border-y border-border bg-secondary/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="font-display text-3xl sm:text-4xl">Bestsellers</h2>
            <p className="mt-3 text-muted-foreground">Beloved pieces, again and again.</p>
          </div>
          <ProductGrid products={bestsellers} />
        </div>
      </section>

      <section id="artisans" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-10 max-w-xl">
            <h2 className="font-display text-3xl sm:text-4xl">Featured Artisans</h2>
            <p className="mt-3 text-muted-foreground">
              Meet the makers whose hands and stories shape every object.
            </p>
          </div>
        </FadeIn>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {artisans.map((artisan, i) => (
            <FadeIn key={artisan.name} delay={i * 0.08}>
              <div className="overflow-hidden rounded-2xl">
                <div className="image-zoom relative aspect-square">
                  <Image
                    src={artisan.image}
                    alt={`${artisan.name} — ${artisan.category || "handmade"}`}
                    fill
                    className="object-cover"
                    sizes="25vw"
                  />
                </div>
                <div className="pt-4">
                  <h3 className="font-display text-xl">{artisan.name}</h3>
                  <p className="text-sm text-muted-foreground">{artisan.category}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section id="why-handmade" className="texture-bg py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-3xl sm:text-4xl">Why Buy Handmade</h2>
            <p className="mt-3 text-muted-foreground">
              Slow objects for lasting homes — better for people, planet, and place.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: HandHeart,
                title: "Support artisans",
                text: "Your purchase goes directly to independent makers and small studios across India.",
              },
              {
                icon: Leaf,
                title: "Thoughtful materials",
                text: "Natural fibers, reclaimed woods, and small-batch finishes chosen with care.",
              },
              {
                icon: Truck,
                title: "Packed with intention",
                text: "Plastic-light packaging and careful shipping so pieces arrive ready to love.",
              },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.1}>
                <div className="rounded-2xl bg-background/70 p-8 text-center shadow-[var(--shadow-soft)]">
                  <item.icon className="mx-auto h-8 w-8 text-accent" />
                  <h3 className="mt-4 font-display text-2xl">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl sm:text-4xl">Stories from Home</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.1}>
              <blockquote className="h-full rounded-2xl border border-border bg-card p-8">
                <Quote className="h-6 w-6 text-accent" />
                <p className="mt-4 text-base leading-relaxed text-foreground">{t.quote}</p>
                <footer className="mt-6 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{t.name}</span> · {t.place}
                </footer>
              </blockquote>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl">From the Atelier</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Real pieces from The Crafted Home catalog
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {atelier.map((src, i) => (
            <div key={`${src}-${i}`} className="image-zoom relative aspect-square">
              <Image
                src={src}
                alt={`Handmade piece from The Crafted Home ${i + 1}`}
                fill
                className="object-cover"
                sizes="16vw"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
