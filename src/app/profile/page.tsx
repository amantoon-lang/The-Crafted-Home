"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Heart, MapPin, LogOut, Shield } from "lucide-react";

const links = [
  { href: "/orders", label: "Orders", icon: Package, desc: "Track and review past purchases" },
  { href: "/wishlist", label: "Wishlist", icon: Heart, desc: "Pieces you have saved" },
  { href: "/profile/addresses", label: "Addresses", icon: MapPin, desc: "Manage shipping addresses" },
];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/profile");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl">Your profile</h1>
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <p className="font-display text-2xl">{session.user.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
        {session.user.phone && (
          <p className="mt-1 text-sm text-muted-foreground">{session.user.phone}</p>
        )}
        <p className="mt-3 inline-flex rounded-lg bg-secondary px-2.5 py-1 text-xs uppercase tracking-wider">
          {session.user.role}
        </p>
      </div>

      <div className="mt-8 grid gap-4">
        {session.user.role === "ADMIN" && (
          <Link
            href="/admin"
            className="flex items-start gap-4 rounded-2xl border border-border p-5 transition hover:bg-secondary/50"
          >
            <Shield className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <p className="font-medium">Admin panel</p>
              <p className="text-sm text-muted-foreground">
                Dashboard, orders, inventory, and analytics
              </p>
            </div>
          </Link>
        )}
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-4 rounded-2xl border border-border p-5 transition hover:bg-secondary/50"
          >
            <link.icon className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <p className="font-medium">{link.label}</p>
              <p className="text-sm text-muted-foreground">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <Button
        variant="outline"
        className="mt-8"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
