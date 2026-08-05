import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible Auth.js config (no Prisma / bcrypt).
 * Used by middleware; full providers live in auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);

      const protectedPaths = ["/checkout", "/orders", "/wishlist", "/profile", "/admin"];
      const isProtected = protectedPaths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
      );

      if (pathname.startsWith("/admin")) {
        return isLoggedIn && auth?.user?.role === "ADMIN";
      }

      if (isProtected) return isLoggedIn;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "CUSTOMER" | "ADMIN") ?? "CUSTOMER";
        session.user.phone = token.phone as string | null;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
