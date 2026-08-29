"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Heart,
  Menu,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/providers/theme-provider";
import { useUIStore, useGuestCartStore } from "@/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?sort=popularity", label: "Bestsellers" },
  { href: "/shop?category=ceramics", label: "Ceramics" },
  { href: "/shop?category=wooden-decor", label: "Wood" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { mobileNavOpen, setMobileNavOpen, cartAnimating, setSearchOpen, searchOpen } =
    useUIStore();
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const guestItems = useGuestCartStore((s) => s.items);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setSearchOpen(false);
  }, [pathname, setMobileNavOpen, setSearchOpen]);

  const itemCount = mounted
    ? guestItems.reduce((sum, i) => sum + i.quantity, 0)
    : 0;
  const isHome = pathname === "/";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled || !isHome
          ? "border-b border-border/70 bg-background/90 backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 text-foreground lg:hidden"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/" className="group flex flex-col leading-none">
            <span className="font-display text-xl tracking-tight text-foreground sm:text-2xl">
              The Crafted Home
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
              Handmade marketplace
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors hover:text-primary",
                pathname.startsWith("/shop") && link.href.startsWith("/shop")
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/wishlist" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={cn(cartAnimating && "animate-bounce")}
          >
            <Link href="/cart" aria-label="Cart" className="relative">
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-md bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                  {itemCount}
                </span>
              )}
            </Link>
          </Button>
          {session ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="icon" asChild>
                <Link
                  href={session.user.role === "ADMIN" ? "/admin" : "/profile"}
                  aria-label="Account"
                >
                  <User className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Logout
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-background"
          >
            <form
              className="mx-auto flex max-w-7xl gap-3 px-4 py-4 sm:px-6 lg:px-8"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = `/shop?q=${encodeURIComponent(query)}`;
              }}
            >
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search handmade treasures..."
                className="flex-1"
              />
              <Button type="submit">Search</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-border bg-background lg:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-3 py-3 text-sm hover:bg-secondary"
                >
                  {link.label}
                </Link>
              ))}
              {session ? (
                <>
                  <Link href="/profile" className="rounded-xl px-3 py-3 text-sm hover:bg-secondary">
                    Profile
                  </Link>
                  <button
                    className="rounded-xl px-3 py-3 text-left text-sm hover:bg-secondary"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link href="/login" className="rounded-xl px-3 py-3 text-sm hover:bg-secondary">
                  Sign in
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
