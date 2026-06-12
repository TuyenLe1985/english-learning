// NextAuth v5 App Router route handler.
// Delegates all auth requests (GET + POST) to the NextAuth handlers from auth.ts.
// Source: https://authjs.dev/getting-started/installation — App Router pattern

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
