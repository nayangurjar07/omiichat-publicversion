import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google';
import { siteConfig } from '@/config/site';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '600', '700', '800'],
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2A5BD7',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.fullTitle,
    template: '%s – Omii',
  },
  description: siteConfig.description,
  keywords: [
    'omii',
    'omii chat',
    'anonymous chat',
    'stranger chat',
    'talk to strangers',
    'talk to stranger online free',
    'random chat',
    'chat with strangers',
    'omegle alternative',
    'switchboard chat',
    'topic rooms',
    'private chat rooms',
    'random stranger chat',
    'free chat with strangers',
  ],
  authors: [{ name: siteConfig.creator }],
  creator: siteConfig.creator,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.fullTitle,
    description: siteConfig.description,
    siteName: siteConfig.siteName,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteConfig.url,
  },
  verification: {
    google: 'xoehmGRDTQUKHGQ-TnC9ZU8Bf0GN60bZzz541Nw8VHs',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full ${bricolage.variable} ${hanken.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Omii: Stranger Chat',
              url: siteConfig.url,
              applicationCategory: 'CommunicationApplication',
              operatingSystem: 'All',
              browserRequirements: 'Requires JavaScript. Requires HTML5.',
              description: siteConfig.description,
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('omii_theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');}else{document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-body antialiased bg-[var(--bg-paper)] text-[var(--text-ink)] selection:bg-[var(--accent-dial)] selection:text-white transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
