import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/profile"];
const locales = ["en", "ar"];
const defaultLocale = "en";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("__session");
  const { pathname } = request.nextUrl;

  // 1. Locale Routing
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    // e.g. incoming request is /about
    // The new URL is now /en/about
    request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // 2. Auth Protection
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.includes(route)
  );

  if (isProtectedRoute && !session) {
    const currentLocale = locales.find(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    ) || defaultLocale;
    
    const loginUrl = new URL(`/${currentLocale}/auth/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|assets|docs|favicon.ico).*)"],
};
