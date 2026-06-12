// NextAuth v5 type augmentation — extends Session and JWT with D-13 payload fields.
// Without this, session.user.userId / role / cefrLevel are not in TypeScript types.
// Source: .planning/phases/02-authentication-user-profile/02-RESEARCH.md — Code Examples

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      role: "STUDENT" | "ADMIN";
      cefrLevel: "B1" | "B2" | "C1";
    } & DefaultSession["user"];
  }

  interface JWT {
    userId?: string;
    role?: string;
    cefrLevel?: string;
  }
}
