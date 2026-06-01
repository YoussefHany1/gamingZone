import type { Metadata } from "next";
import { Cairo, Outfit } from "next/font/google";
import { Providers } from "./providers";
import "../globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (locale === "en") {
    return {
      metadataBase: new URL(baseUrl),
      title: "Gaming Zone | News, Game Tracker & Free Games",
      description:
        "Your ultimate destination for gaming news, game tracker and free games alerts. Join our community of gamers and stay updated with the latest trends in the world of gaming.",
      icons: {
        icon: "/assets/icon.webp",
      },
      openGraph: {
        title: "Gaming Zone | News, Game Tracker & Free Games",
        description:
          "Your ultimate destination for gaming news, game tracker and free games alerts. Join our community of gamers and stay updated with the latest trends in the world of gaming.",
        siteName: "Gaming Zone",
        images: [
          {
            url: "/assets/cover2.png",
            width: 1024,
            height: 500,
            alt: "Gaming Zone Banner",
          },
        ],
        locale: "en_US",
        type: "website",
      },
    };
  }

  return {
    metadataBase: new URL(baseUrl),
    title: "Gaming Zone | أخبار، مراجعات، ألعاب مجانية",
    description:
      "الموقع العربي الأول لمتابعة أخبار ألعاب الفيديو، المراجعات، فعاليات وعروض الألعاب المجانية، وتنظيم قوائم ومكتبة ألعابك المفضلة.",
    icons: {
      icon: "/assets/icon.webp",
    },
    openGraph: {
      title: "Gaming Zone | أخبار، مراجعات، ألعاب مجانية",
      description:
        "تابع أخبار ألعاب الفيديو، المراجعات، فعاليات وعروض الألعاب المجانية، وتنظيم قوائم ومكتبة ألعابك المفضلة.",
      siteName: "Gaming Zone",
      images: [
        {
          url: "/assets/cover2.png",
          width: 1024,
          height: 500,
          alt: "Gaming Zone Banner",
        },
      ],
      locale: "ar_EG",
      type: "website",
    },
  };
}

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
      className={`${cairo.variable} ${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col text-white font-outfit"
        suppressHydrationWarning
      >
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
