import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "ar"];
const defaultLocale = "en";

// Protected routes are handled client-side in each page component
// Add routes back here once Firebase Admin session cookie is working
const protectedRoutes: string[] = [];

export function proxy(request: NextRequest) {
  const session = request.cookies.get("__session");
  const { pathname } = request.nextUrl;

  // 1. Locale Routing
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (!pathnameHasLocale) {
    request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // 2. Auth Protection (only redirects if __session cookie is missing)
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.includes(route),
  );

  if (isProtectedRoute && !session) {
    const currentLocale =
      locales.find(
        (locale) =>
          pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
      ) || defaultLocale;

    const loginUrl = new URL(`/${currentLocale}/auth/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude static files, API routes, and well-known files from locale redirect
    "/((?!api|_next/static|_next/image|assets|docs|sitemap.xml|robots.txt|favicon.ico|\\.well-known).*)",
  ],
};
