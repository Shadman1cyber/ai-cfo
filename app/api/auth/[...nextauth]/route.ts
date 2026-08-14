import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";

const { handlers, auth, signOut } = NextAuth(authConfig);

export const { GET, POST } = handlers;
export { auth, signOut };