import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/authConfig";

const publicPaths = ["/login", "/register", "/api/auth"];
const dashboardPaths = ["/dashboard"];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublicPath = publicPaths.some((path) => nextUrl.pathname.startsWith(path));
  const isDashboardPath = dashboardPaths.some((path) => nextUrl.pathname.startsWith(path));

  if (isPublicPath) {
    if (isLoggedIn && nextUrl.pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  if (isDashboardPath) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};