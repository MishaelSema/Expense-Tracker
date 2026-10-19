import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/transactions",
  "/budgets",
  "/debts",
  "/wishlist",
  "/goals",
  "/notes",
  "/reports",
  "/profile",
  // Reminder digest emails deep-link here, so an unauthenticated click needs to
  // remember where it was headed and come back after sign-in.
  "/reminders",
];

const authPages = ["/login", "/register", "/forgot-password"];

// Next.js 16 renamed the "middleware" file convention to "proxy".
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // next-auth v4 prefixes the cookie with __Secure- only on https requests.
  // Derive it from the actual protocol so `next start` over http still works.
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol;
  const secureCookie = proto.startsWith("https");

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie,
  });

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isAuthPage = authPages.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/debts/:path*",
    "/wishlist/:path*",
    "/goals/:path*",
    "/notes/:path*",
    "/reports/:path*",
    "/profile/:path*",
    "/reminders/:path*",
    "/login",
    "/register",
    "/forgot-password",
  ],
};
