import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";

const { handlers, auth, signOut } = NextAuth(authConfig);

// Export individual HTTP methods (valid Route export fields for Next.js 16)
export const GET = handlers.GET;
export const POST = handlers.POST;

// Export auth and signOut for use elsewhere in the app
export { auth, signOut };