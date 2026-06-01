import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "ar"];
const defaultLocale = "en";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if pathname already starts with a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Detect locale
  // 1. Check cookies
  let locale = request.cookies.get("NEXT_LOCALE")?.value;

  // 2. Check Accept-Language header
  if (!locale) {
    const acceptLang = request.headers.get("accept-language");
    if (acceptLang) {
      if (acceptLang.toLowerCase().includes("ar")) {
        locale = "ar";
      }
    }
  }

  // 3. Fallback to default
  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale;
  }

  // Redirect to localized URL (preserving query params)
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next), static assets, and .well-known verification directory
    "/((?!api|_next/static|_next/image|assets|\\.well-known|favicon.ico|.*\\.png$|.*\\.webp$|.*\\.jpg$|.*\\.svg$|.*\\.json$|.*\\.txt$).*)",
  ],
};
