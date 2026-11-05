import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import { ArrowRight, Globe, Shield, UserCheck, MessageCircle, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Random Chat: Talk to Random Strangers Online Free – Omii',
  description:
    'Start a random chat with strangers instantly. Free, private 1-on-1 text chat with people around the world without registration or downloads.',
  alternates: {
    canonical: `${siteConfig.url}/random-chat`,
  },
  openGraph: {
    title: 'Random Chat: Talk to Random Strangers Online Free – Omii',
    description:
      'Start a random chat with strangers instantly. Free, private 1-on-1 text chat with people around the world without registration or downloads.',
    url: `${siteConfig.url}/random-chat`,
    siteName: siteConfig.siteName,
  },
};

export default function RandomChatPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do I start a random chat online?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Simply open Omii, pick a nickname and optional interests, and click Start Chat. You will be connected to a random stranger immediately.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is random chatting safe on Omii?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. All sessions are 100% ephemeral and anonymous. No personal info is collected, and chats stream in-memory without persistent database storage.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I chat on mobile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Omii works seamlessly in any mobile browser on iOS and Android without needing an app store download.',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-12">
        {/* Hero Section */}
        <div className="space-y-4 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-dial-subtle)] border border-[var(--accent-dial)]/20 text-xs font-semibold text-[var(--accent-dial)]">
            <Globe className="w-3.5 h-3.5 text-[var(--accent-dial)]" />
            <span>Worldwide Random Chat</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-ink)] leading-tight">
            Connect & <span className="text-[var(--accent-dial)]">Talk to Random People</span>
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
            Break your routine and chat with strangers worldwide. Share thoughts, practice a new language, or find late-night friends in a private, distraction-free environment.
          </p>

          <div className="pt-2">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[var(--accent-dial)] hover:bg-[var(--accent-dial-hover)] text-white font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>Launch Random Chat</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dial-subtle)] text-[var(--accent-dial)] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-ink)]">
              No Profile, Just Chat
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              No pressure of bios, photos, or followers. You are simply two human beings having a genuine conversation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dial-subtle)] text-[var(--accent-dial)] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-ink)]">
              Skip Anytime with Double-Esc
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Not clicking with someone? Tap Skip or double-press Esc to instantly connect to a fresh conversation in seconds.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dial-subtle)] text-[var(--accent-dial)] flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-ink)]">
              Topic Rooms Included
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Prefer group conversations? Explore community topic rooms like Gaming, Music, Coding, and Philosophy.
            </p>
          </div>
        </div>

        {/* Action Callout */}
        <section className="p-8 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-center space-y-4">
          <h2 className="font-display text-2xl font-bold text-[var(--text-ink)]">
            Start talking in less than 3 seconds
          </h2>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Free, fast, and completely anonymous. Join thousands of conversations happening right now.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-dial)] hover:bg-[var(--accent-dial-hover)] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Connect to Random Stranger</span>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
