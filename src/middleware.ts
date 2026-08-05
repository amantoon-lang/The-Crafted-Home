import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

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
