// NextAuth v5 (Auth.js) configuration for the English Learning Platform.
// Central auth config — providers, PrismaAdapter, jwt/session callbacks, 30-day JWT (AUTH-05, D-14).
// Source: .planning/phases/02-authentication-user-profile/02-RESEARCH.md — Pattern 1

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@repo/database";
import bcrypt from "bcrypt";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // D-09: PrismaAdapter persists auth sessions, accounts, and users via Prisma.
  // allowDangerousEmailAccountLinking is set on the Google provider (see below).
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        // D-11: Google OAuth users have no passwordHash — return null rather than throw
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        return user;
      },
    }),
    // D-09: allowDangerousEmailAccountLinking — if a Google OAuth sign-in arrives with an email
    // that already has a Credentials account, auto-link the Google account to the existing user.
    // Safe because Google has verified email ownership. Accepted risk per D-09.
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  // D-14, AUTH-05: 30-day JWT session — persists across browser refresh and tab close/reopen
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async signIn({ user, account }) {
      // D-10: Google OAuth users skip email verification — Google already verified ownership
      if (account?.provider === "google") return true;

      // D-01: Gate Credentials users on emailVerified — unverified users cannot access content.
      // Returns a redirect path so NextAuth forwards to /login?error=email-not-verified.
      // The full verify-email page UX is implemented in Plan 03.
      // Note: user.emailVerified is available from AdapterUser (DB-backed); cast needed for type safety.
      const emailVerified = (user as { emailVerified?: Date | null }).emailVerified;
      if (!emailVerified) {
        return "/login?error=email-not-verified";
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // D-13: Embed userId, role, cefrLevel in JWT on first sign-in.
        // Enables NestJS to authorize requests without a DB lookup on every request.
        token.userId = user.id;
        token.role = (user as { role?: string }).role;
        token.cefrLevel = (user as { cefrLevel?: string }).cefrLevel;
      }
      if (account?.provider === "google" && user) {
        // D-10: Set emailVerified for Google OAuth users at account creation time.
        // This runs only once on first Google sign-in (account is null on subsequent JWT refreshes).
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
      return token;
    },
    async session({ session, token }) {
      // Copy D-13 payload fields from token to session.user so client components can read them.
      session.user.userId = token.userId as string;
      // Type assertion needed: token fields are string, session.user fields are union types.
      session.user.role = token.role as "STUDENT" | "ADMIN";
      session.user.cefrLevel = token.cefrLevel as "B1" | "B2" | "C1";
      return session;
    },
  },
  pages: {
    signIn: "/login",
    // Note: Pitfall 4 — PrismaAdapter writes Google avatar to User.image (not avatarUrl).
    // Display logic should use `avatarUrl ?? image` (upload takes precedence over Google avatar).
    // Google avatar mapping is addressed in Plan 06 profile work.
    error: "/login",
  },
  // Pitfall 3: Read NEXTAUTH_SECRET (not AUTH_SECRET) to match Phase 1 env var naming.
  // Auth.js v5 accepts both names; NEXTAUTH_SECRET matches Phase 1 .env.example.
  secret: process.env.NEXTAUTH_SECRET,
});
