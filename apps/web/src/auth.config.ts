// Edge-compatible auth config — used by middleware only.
// Does NOT import Prisma or bcrypt (both require Node.js native modules
// unavailable in the Edge runtime). The full config with providers and
// PrismaAdapter lives in auth.ts (Node.js server only).
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
