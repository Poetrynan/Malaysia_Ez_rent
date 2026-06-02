import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";
import Script from "next/script";

export const metadata: Metadata = {
  // 基础信息
  title: {
    default: "Malaysia Ez Rent | AI 智能租房助手",
    template: "%s | Malaysia Ez Rent",
  },
  description: "马来西亚 AI 智能租房系统 — 为国际租客提供找房、通勤计算、租约台账、扫码缴租一站式服务。支持中英双语，AI 智能匹配房源。",
  keywords: [
    "马来西亚租房",
    "Malaysia rental",
    "留学租房",
    "student housing",
    "Sunway",
    "Monash",
    "Taylor's",
    "AI租房",
    "智能找房",
    "国际学生",
    "international students",
  ],

  // Open Graph (社交媒体分享)
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://ezrent.my",
    siteName: "Malaysia Ez Rent",
    title: "Malaysia Ez Rent | AI 智能租房助手",
    description: "马来西亚 AI 智能租房系统 — 为国际租客提供找房、通勤计算、租约台账、扫码缴租一站式服务。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Malaysia Ez Rent",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Malaysia Ez Rent | AI 智能租房助手",
    description: "马来西亚 AI 智能租房系统",
    images: ["/og-image.png"],
  },

  // 其他元数据
  icons: { icon: "/logo.png" },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // 从 Google Search Console 获取
    yandex: "your-yandex-verification-code", // 可选
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;400;500;600;700;1,9..40,400&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* 结构化数据 (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Malaysia Ez Rent",
              description: "马来西亚 AI 智能租房系统",
              url: "https://ezrent.my",
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "MYR",
              },
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=en&loading=async`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
