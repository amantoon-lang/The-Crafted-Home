"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FooterLink = { href: string; label: string };

const companyLinks: FooterLink[] = [
  { href: "/#artisans", label: "Artisans" },
  { href: "/#why-handmade", label: "Why Handmade" },
  { href: "/#testimonials", label: "Stories" },
];

const accountLinks: FooterLink[] = [
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Create account" },
  { href: "/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
];

export function SiteFooter() {
  const [shopLinks, setShopLinks] = useState<FooterLink[]>([
    { href: "/shop", label: "All Products" },
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) return;
        const data = (await res.json()) as {
          categories?: { name: string; slug: string }[];
        };
        const cats = (data.categories || []).slice(0, 6).map((c) => ({
          href: `/shop?category=${c.slug}`,
          label: c.name,
        }));
        if (!cancelled) {
          setShopLinks([{ href: "/shop", label: "All Products" }, ...cats]);
        }
      } catch {
        // keep default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections: [string, FooterLink[]][] = [
    ["Shop", shopLinks],
    ["Company", companyLinks],
    ["Account", accountLinks],
  ];

  return (
    <footer className="mt-24 border-t border-border bg-secondary/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="font-display text-2xl text-foreground">
              The Crafted Home
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A curated marketplace for handmade home décor — pieces with soul,
              made by independent artisans around the world.
            </p>
            <form className="mt-6 flex max-w-md gap-2" action="/api/newsletter" method="post">
              <Input
                type="email"
                name="email"
                required
                placeholder="Email for artisan stories"
                className="bg-background"
              />
              <Button type="submit" variant="accent">
                Join
              </Button>
            </form>
          </div>

          {sections.map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold tracking-wide text-foreground">{title}</h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} The Crafted Home. Crafted with care.
          </p>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <Camera className="h-4 w-4" />
            @thecraftedhome
          </a>
        </div>
      </div>
    </footer>
  );
}
