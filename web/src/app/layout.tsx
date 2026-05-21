import type { Metadata } from "next";
import { Cairo, Outfit } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Gaming Zone | مجتمع اللاعبين العربي",
  description:
    "الموقع العربي الأول لمتابعة أخبار الألعاب، المراجعات، العروض المجانية، وتنظيم قائمة ألعابك المفضلة.",
  icons: {
    icon: "/assets/icon.webp",
  },
  openGraph: {
    title: "Gaming Zone | مجتمع اللاعبين العربي",
    description: "تابع أخبار الألعاب والعروض المجانية ونظم مكتبتك الخاصة.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cairo.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-white font-outfit">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
