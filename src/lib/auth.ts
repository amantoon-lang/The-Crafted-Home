import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { authConfig } from "@/lib/auth.config";
import {
  findAuthUserByIdentifier,
  passwordsMatch,
} from "@/lib/accounts";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      phone?: string | null;
      username?: string | null;
    };
  }

  interface User {
    role: Role;
    phone?: string | null;
    username?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    phone?: string | null;
    username?: string | null;
  }
}

const providers = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email or username", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await findAuthUserByIdentifier(parsed.data.email);
      if (!user?.passwordHash) return null;

      const valid = await passwordsMatch(
        parsed.data.password,
        user.passwordHash
      );
      if (!valid) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        phone: user.phone,
        username: user.username,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }) as never
  );
}

const useAdapter = Boolean(process.env.DATABASE_URL);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: useAdapter ? PrismaAdapter(prisma) : undefined,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.phone = user.phone;
        token.username = user.username;
      }
      return token;
    },
  },
});
