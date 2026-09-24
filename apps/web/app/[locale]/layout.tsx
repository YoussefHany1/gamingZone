import type { Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import { createLocalizedMetadata } from "@/lib/metadata";
import "../globals.css";

const cairo = localFont({
  src: [
    {
      path: "../../public/font/cairo/Cairo-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/font/cairo/Cairo-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/font/cairo/Cairo-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/font/cairo/Cairo-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-cairo",
  display: "swap",
});

const inter = localFont({
  src: [
    {
      path: "../../public/font/Inter/Inter_18pt-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/font/Inter/Inter_18pt-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/font/Inter/Inter_18pt-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/font/Inter/Inter_18pt-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c1a33",
};

export const generateMetadata = createLocalizedMetadata({
  en: {
    title: "Gaming Zone | News, Game Tracker & Free Games",
    description:
      "Your ultimate destination for gaming news, game tracker and free games alerts. Join our community of gamers and stay updated with the latest trends in the world of gaming.",
    keywords: ["gaming", "news", "free games", "tracker", "videogames", "esports", "steam", "epic games"],
  },
  ar: {
    title: "Gaming Zone | أخبار، مراجعات، ألعاب مجانية",
    description:
      "الموقع العربي الأول لمتابعة أخبار ألعاب الفيديو، المراجعات، فعاليات وعروض الألعاب المجانية، وتنظيم قوائم ومكتبة ألعابك المفضلة.",
    keywords: ["ألعاب", "أخبار", "ألعاب مجانية", "مراجعات", "إكسبوكس", "بلايستيشن", "كمبيوتر", "جيمرز"],
  },
});

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  return (
    <html
      lang={locale}
      className={`${cairo.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col text-white font-inter"
        suppressHydrationWarning
      >
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
