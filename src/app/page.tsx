import Link from "next/link";
import Image from "next/image";
import { loadCatalog } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/products/product-grid";
import { FadeIn } from "@/components/ui/motion";
import { OriginMark } from "@/components/brand/origin-mark";
import { Quote, Leaf, HandHeart, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

const testimonials = [
  {
    quote:
      "Every piece feels considered. The ceramic vase set is the first thing guests notice — and knowing it was made in India makes it feel even more special.",
    name: "Ananya Shah",
    place: "Indore",
  },
  {
    quote:
      "Finally a marketplace that respects craftsmanship. Packaging was careful, and the story behind the candle made me keep the jar.",
    name: "Kabir Mehta",
    place: "Mumbai",
  },
  {
    quote:
      "The oak serving board is now part of every dinner we host. Proud it comes from a brand born in Bhopal.",
    name: "Riya Kapoor",
    place: "Bhopal",
  },
];

const instagramImages = [
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80",
  "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80",
  "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=600&q=80",
  "https://images.unsplash.com/photo-1603006905004-abd84d2429d2?w=600&q=80",
  "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
];

export default async function HomePage() {
  const catalog = await loadCatalog();
  const categories = catalog.categories;
  const featured = catalog.products.filter((p) => p.featured).slice(0, 4);
  const trending = catalog.products.filter((p) => p.trending).slice(0, 4);
  const bestsellers = catalog.products.filter((p) => p.bestSeller).slice(0, 4);

  const artisans = [
    ...new Map(
      catalog.products.slice(0, 8).map((p) => [
        p.artisan,
        { name: p.artisan, image: p.images[0], category: p.category?.name || "" },
      ])
    ).values(),
  ].slice(0, 4);

  return (
    <div>
      <section className="relative min-h-[92vh] w-full overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1618220179428-22790b461013?w=2000&q=80"
          alt="Sunlit handmade living room with ceramic and wood accents"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-28">
          <FadeIn>
            <OriginMark onDark size="md" className="mb-4" />
          </FadeIn>
          <FadeIn delay={0.08}>
            <p className="font-display text-4xl text-white sm:text-6xl lg:text-7xl">
              The Crafted Home
            </p>
          </FadeIn>
          <FadeIn delay={0.16}>
            <h1 className="mt-4 max-w-2xl text-xl font-light text-white/90 sm:text-2xl lg:text-3xl">
              Handcrafted with Love, Designed for Your Home.
            </h1>
          </FadeIn>
          <FadeIn delay={0.26}>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
              Ceramics, textiles, wood, and quiet light — handmade in India,
              rooted in Bhopal, made for everyday living.
            </p>
          </FadeIn>
          <FadeIn delay={0.36}>
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

      <section className="border-b border-border bg-secondary/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 text-center sm:px-6 lg:flex-row lg:justify-between lg:px-8 lg:text-left">
          <div>
            <OriginMark size="md" />
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Every piece ships with a story — why it was made, how it was made,
              and the hands in Bhopal and across India that shaped it.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/#origin">Our origin</Link>
          </Button>
        </div>
      </section>

      <section id="collections" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-10 max-w-xl">
            <h2 className="font-display text-3xl sm:text-4xl">Collections</h2>
            <p className="mt-3 text-muted-foreground">
              Four focused collections — ceramics, textiles, wood, and light & scent.
            </p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
          {categories.map((category, i) => (
            <FadeIn key={category.id} delay={i * 0.05}>
              <Link
                href={`/shop?category=${category.slug}`}
                className="image-zoom group relative block aspect-[4/5] overflow-hidden rounded-2xl"
              >
                <Image
                  src={category.image}
                  alt={category.name}
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
              <p className="mt-3 text-muted-foreground">Editor picks with lasting presence.</p>
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

      <section id="origin" className="relative overflow-hidden py-24">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #C98C4A 0%, transparent 45%), radial-gradient(circle at 80% 70%, #7A5C43 0%, transparent 40%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <FadeIn>
            <OriginMark size="md" />
            <h2 className="mt-4 font-display text-3xl sm:text-5xl">
              From Bhopal, for every home
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              The Crafted Home began in Bhopal — a city of lakes, quiet craft,
              and homes that value warmth over trend. We source and shape pieces
              made in India so you can feel the maker&apos;s intent: why a piece
              exists, and how it came to life.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Open any product and read its story. That connection is the point.
            </p>
          </FadeIn>
          <FadeIn delay={0.12}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1400&q=80"
                alt="Handmade objects arranged in warm natural light"
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
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
                    alt={artisan.name}
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
                title: "Support makers",
                text: "Your purchase goes directly to independent makers and small studios across India.",
              },
              {
                icon: Leaf,
                title: "Thoughtful materials",
                text: "Natural fibres, reclaimed woods, and small-batch finishes chosen with care.",
              },
              {
                icon: MapPin,
                title: "Rooted in Bhopal",
                text: "Born in Bhopal, made in India — every piece carries a real place and a real story.",
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
              <p className="mt-2 text-sm text-muted-foreground">@thecraftedhome</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {instagramImages.map((src, i) => (
            <div key={src} className="image-zoom relative aspect-square">
              <Image
                src={src}
                alt={`Gallery image ${i + 1}`}
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
