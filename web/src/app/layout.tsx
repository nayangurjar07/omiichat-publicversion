// web/src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
  ],
};

export const metadata: Metadata = {
  title: 'Omii: Stranger Chat – Free Random Chat & Talk to Strangers Online (No Sign Up)',
  description:
    'Connect instantly with strangers worldwide on OmiiChat. Free anonymous text, voice notes, and photo chat with zero sign-up required.',
  metadataBase: new URL('https://omiichat.antideploy.com'),
  openGraph: {
    title: 'OmiiChat – Free Anonymous Stranger Chat (No Sign Up)',
    description: 'Talk to strangers online via text, voice notes, and photos. Fast, safe, and 100% free.',
    url: 'https://omiichat.antideploy.com',
    siteName: 'OmiiChat',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'OmiiChat',
    url: 'https://omiichat.antideploy.com',
    applicationCategory: 'SocialNetworkingApplication',
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${outfit.variable} ${jetbrainsMono.variable} dark`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('omii_theme') || localStorage.getItem('theme');
                  var root = document.documentElement;
                  if (saved === 'light') {
                    root.classList.remove('dark');
                    root.classList.add('light');
                    root.setAttribute('data-theme', 'light');
                  } else {
                    root.classList.remove('light');
                    root.classList.add('dark');
                    root.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200 transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
