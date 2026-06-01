"use client";

import NextLink from "next/link";
import { useLangStore } from "../store/useLangStore";
import React from "react";

export default function Link({
  href,
  children,
  ...props
}: React.ComponentProps<typeof NextLink>) {
  const { lang } = useLangStore();

  let hrefStr = "";
  if (typeof href === "string") {
    hrefStr = href;
  } else if (href && typeof href === "object" && href.pathname) {
    hrefStr = href.pathname;
  }

  // Prepend locale if it's an internal link and not already prefixed with /en/ or /ar/
  const isInternal = hrefStr.startsWith("/");
  const hasLocalePrefix =
    hrefStr.startsWith("/en/") ||
    hrefStr.startsWith("/ar/") ||
    hrefStr === "/en" ||
    hrefStr === "/ar";

  if (isInternal && !hasLocalePrefix) {
    const localizedPath = hrefStr === "/" ? `/${lang}` : `/${lang}${hrefStr}`;
    
    if (typeof href === "object") {
      href = { ...href, pathname: localizedPath };
    } else {
      href = localizedPath;
    }
  }

  return (
    <NextLink href={href} {...props}>
      {children}
    </NextLink>
  );
}
