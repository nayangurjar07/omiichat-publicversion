import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { HomePageClient } from '@/components/home/HomePageClient';

export const metadata: Metadata = {
  title: 'Omii: Stranger Chat – Free Random Chat & Talk to Strangers Online (No Sign Up)',
  description:
    'Instant, free anonymous stranger chat. Connect 1-on-1 on a private switchboard line. Talk to random strangers worldwide with interest matching, voice notes, and zero logs.',
  alternates: {
    canonical: siteConfig.url,
  },
  keywords: [
    'stranger chat',
    'talk to strangers',
    'random chat',
    'omegle alternative',
    'talk to strangers online',
    'chat with strangers free',
    'anonymous chat',
    'random text chat',
    'talk to random people',
  ],
  openGraph: {
    title: 'Omii: Stranger Chat – Free Random Chat & Talk to Strangers Online',
    description:
      'Instant, free anonymous stranger chat. Connect 1-on-1 on a private switchboard line with interest matching and zero logging.',
    url: siteConfig.url,
    siteName: siteConfig.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Omii: Stranger Chat – Free Random Chat & Talk to Strangers Online',
    description:
      'Instant, free anonymous stranger chat. Connect 1-on-1 on a private switchboard line with interest matching and zero logging.',
  },
};

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${siteConfig.url}/#webapp`,
        name: 'Omii Stranger Chat',
        url: siteConfig.url,
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'All',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description:
          'Free anonymous stranger chat. Connect 1-on-1 on a private switchboard line. Talk to random strangers worldwide without registration.',
      },
      {
        '@type': 'FAQPage',
        '@id': `${siteConfig.url}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How do I talk to strangers on Omii?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Simply enter an optional nickname and interests, then click Start Chatting. You will be connected instantly to a random stranger on a private 1-to-1 line.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is Omii stranger chat completely free?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, Omii is 100% free with no sign-up, subscriptions, or credit card required.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I reconnect if my stranger chat disconnects?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Omii features unique 6-digit Reconnect Codes. When a chat ends, both parties can trade a code to reconnect without exchanging phone numbers or social media.',
            },
          },
          {
            '@type': 'Question',
            name: 'Are my chats logged or stored?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. All conversations and attachments are purely ephemeral and stream directly in memory. Once the line disconnects, messages are instantly deleted.',
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient />
    </>
  );
}
