import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { name: "Ceramics", slug: "ceramics", image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80" },
  { name: "Textiles", slug: "textiles", image: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80" },
  { name: "Wood", slug: "wood", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80" },
  { name: "Light & Scent", slug: "light-scent", image: "https://images.unsplash.com/photo-1603006905004-abd84d2429d2?w=800&q=80" },
];

const products = [
  {
    title: "Hand-Carved Oak Serving Board",
    slug: "hand-carved-oak-serving-board",
    description:
      "A generously sized serving board carved from sustainably sourced American oak. Smooth edges, natural grain, and a food-safe oil finish make it equally at home for cheese boards or quiet morning toast.",
    story:
      "Maya Chen carves each board in her Vermont studio, selecting planks for their grain character and letting the wood guide the final silhouette. No two boards share the same pattern.",
    price: 89,
    discount: 10,
    images: [
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80",
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
    categorySlug: "wood",
  },
  {
    title: "Linen Wall Macrame Tapestry",
    slug: "linen-wall-macrame-tapestry",
    description:
      "An airy large-scale macrame piece woven from soft natural linen cord. Designed to soften blank walls and catch afternoon light through its open knotwork.",
    story:
      "Elena Rojas learned knotting from her grandmother in Oaxaca. Each tapestry takes three days of focused handwork, finished with wooden dowels she sands by hand.",
    price: 148,
    discount: 0,
    images: [
      "https://images.unsplash.com/photo-1602028915047-37209f1fd8c6?w=1200&q=80",
      "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=1200&q=80",
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
    categorySlug: "textiles",
  },
  {
    title: "Speckled Stoneware Vase Set",
    slug: "speckled-stoneware-vase-set",
    description:
      "A trio of wheel-thrown vases with a soft speckled glaze. Perfect for single stems or clustered as a sculptural still life on a console.",
    story:
      "Jonah Hale throws each vase on a kick wheel in Portland. The speckled glaze is his signature — a blend of locally sourced clay ash and porcelain slip.",
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
    categorySlug: "ceramics",
  },
  {
    title: "Abstract Botanical Print",
    slug: "abstract-botanical-print",
    description:
      "Limited-edition giclée print of an original watercolor study. Soft greens and warm neutrals that complement handmade textiles and wood.",
    story:
      "Priya Nair paints botanicals from her greenhouse sketches. This edition of 100 is signed and numbered on archival cotton rag paper.",
    price: 78,
    discount: 0,
    images: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&q=80",
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&q=80",
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
    categorySlug: "textiles",
  },
  {
    title: "Beeswax Pillar Candle Trio",
    slug: "beeswax-pillar-candle-trio",
    description:
      "Slow-burning beeswax pillars with a gentle honey scent. Hand-poured into reusable ceramic cups that become tiny planters once the wax is gone.",
    story:
      "The Meadow Apothecary sources beeswax from small Pennsylvania hives. Each pour is cooled overnight for a clean, even burn.",
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
    categorySlug: "light-scent",
  },
  {
    title: "Terracotta Hanging Planter",
    slug: "terracotta-hanging-planter",
    description:
      "Hand-formed terracotta planter with a braided jute hanger. Breathable clay keeps roots happy — ideal for trailing greens and herbs.",
    story:
      "Sofia Alvarez presses each planter from Mexican clay, firing them in a wood kiln that leaves subtle flame marks on every piece.",
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
    categorySlug: "ceramics",
  },
  {
    title: "Handwoven Linen Tea Towels",
    slug: "handwoven-linen-tea-towels",
    description:
      "A set of three tea towels woven on a traditional loom. Soft, absorbent, and beautiful enough to hang on display.",
    story:
      "The Meridian Loom Cooperative in Maine weaves these towels from European flax linen, using patterns passed down through four generations.",
    price: 62,
    discount: 0,
    images: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80",
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
    categorySlug: "textiles",
  },
  {
    title: "Walnut Floating Shelf",
    slug: "walnut-floating-shelf",
    description:
      "A minimal floating shelf milled from solid walnut. Hidden brackets create a clean, gallery-like display for ceramics and books.",
    story:
      "David Park mills each shelf from reclaimed walnut beams. He finishes with a hand-rubbed hardwax oil that deepens the grain over time.",
    price: 128,
    discount: 12,
    images: [
      "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=1200&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
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
    categorySlug: "wood",
  },
  {
    title: "Ceramic Pour-Over Set",
    slug: "ceramic-pour-over-set",
    description:
      "A hand-thrown pour-over dripper with matching mug. Matte glaze outside, glossy interior for easy cleaning — ritual coffee, elevated.",
    story:
      "Amelia Brooks designs functional ceramics for slow mornings. This set was refined over two years of daily use in her own kitchen.",
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
    categorySlug: "ceramics",
  },
  {
    title: "Woven Rattan Mirror",
    slug: "woven-rattan-mirror",
    description:
      "A circular mirror framed in handwoven rattan. Soft, organic texture that warms entryways and dressing nooks.",
    story:
      "Crafted by a family atelier in Bali using sustainably harvested rattan. Each frame takes a full day of careful weaving.",
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
    categorySlug: "textiles",
  },
  {
    title: "Cedarwood Diffuser Candle",
    slug: "cedarwood-diffuser-candle",
    description:
      "A soy-blend candle with notes of cedarwood, amber, and soft musk. Housed in a reusable amber glass jar with a wooden lid.",
    story:
      "Blended by hand in small batches. The wooden lid doubles as a coaster — a quiet detail for thoughtful living.",
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
    categorySlug: "light-scent",
  },
  {
    title: "Braided Plant Hanger",
    slug: "braided-plant-hanger",
    description:
      "A sculptural plant hanger braided from soft cotton rope. Holds pots up to 8 inches — a simple way to bring greenery into vertical space.",
    story:
      "Made by Nora Kim in her Brooklyn loft, each hanger is braided while listening to vinyl — a rhythm she says shows up in the finished work.",
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
    categorySlug: "textiles",
  },
];

async function main() {
  console.log("Seeding The Crafted Home database...");

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@craftedhome.com",
      password: passwordHash,
      phone: "+1 555 0100",
      role: Role.ADMIN,
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "Avery Lane",
      email: "customer@craftedhome.com",
      password: passwordHash,
      phone: "+1 555 0101",
      role: Role.CUSTOMER,
    },
  });

  await prisma.cart.create({ data: { userId: customer.id } });
  await prisma.cart.create({ data: { userId: admin.id } });

  await prisma.address.create({
    data: {
      userId: customer.id,
      label: "Home",
      name: "Avery Lane",
      phone: "+1 555 0101",
      line1: "42 Willow Lane",
      city: "Brooklyn",
      state: "NY",
      zip: "11201",
      country: "US",
      isDefault: true,
    },
  });

  const createdCategories = await Promise.all(
    categories.map((c) => prisma.category.create({ data: c }))
  );

  const categoryMap = Object.fromEntries(
    createdCategories.map((c) => [c.slug, c.id])
  );

  const createdProducts = [];
  for (const p of products) {
    const { categorySlug, ...data } = p;
    const product = await prisma.product.create({
      data: {
        ...data,
        categoryId: categoryMap[categorySlug],
      },
    });
    createdProducts.push(product);
  }

  await prisma.coupon.createMany({
    data: [
      {
        code: "WELCOME10",
        description: "10% off your first order",
        discountPercent: 10,
        minOrderAmount: 50,
        maxUses: 1000,
        active: true,
      },
      {
        code: "HANDMADE20",
        description: "$20 off orders over $150",
        discountAmount: 20,
        minOrderAmount: 150,
        maxUses: 500,
        active: true,
      },
    ],
  });

  await prisma.review.createMany({
    data: [
      {
        productId: createdProducts[0].id,
        userId: customer.id,
        rating: 5,
        comment:
          "Absolutely stunning. The grain is beautiful and it feels substantial — exactly what I hoped for.",
      },
      {
        productId: createdProducts[1].id,
        userId: customer.id,
        rating: 5,
        comment:
          "This tapestry transformed our living room. Soft, elegant, and clearly made with care.",
      },
    ],
  });

  console.log(`Seeded ${createdCategories.length} categories`);
  console.log(`Seeded ${createdProducts.length} products`);
  console.log("Demo accounts:");
  console.log("  Admin:    admin@craftedhome.com / password123");
  console.log("  Customer: customer@craftedhome.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
