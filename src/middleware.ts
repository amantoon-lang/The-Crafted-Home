import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Route protection for checkout/profile/admin.
 * Note: anonymous Vercel temporary deploys disallow Edge middleware;
 * use a claimed/logged-in Vercel project for production.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/checkout/:path*",
    "/orders/:path*",
    "/wishlist/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
