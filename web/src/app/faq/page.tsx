import type { Metadata } from 'next';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import { HelpCircle, ChevronDown, Sparkles, Shield, MessageSquare, Flame, KeyRound, Mic } from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'FAQ – Omii: Stranger Chat',
  description: `Frequently asked questions about ${siteConfig.fullTitle}. Learn how anonymous matching, public rooms, voice notes, and moderation work.`,
  alternates: {
    canonical: `${siteConfig.url}/faq`,
  },
  openGraph: {
    title: 'FAQ – Omii: Stranger Chat',
    description: `Frequently asked questions about ${siteConfig.fullTitle}. Learn how anonymous matching, public rooms, voice notes, and moderation work.`,
    url: `${siteConfig.url}/faq`,
    siteName: siteConfig.siteName,
  },
};

const FAQS = [
  {
    question: 'What is Omii?',
    answer:
      'Omii is a free, modern anonymous communication platform for everyone. It provides instantaneous 1-to-1 stranger chat matching based on shared interests, as well as real-time public topic rooms and private group rooms. No registration or account is required.',
  },
  {
    question: 'Do I need to create an account or provide an email?',
    answer:
      'No. Omii is completely anonymous by default. You can simply pick any nickname and start chatting immediately. An optional account system is available if you wish to personalize an avatar and maintain a friends list across sessions.',
  },
  {
    question: 'Is Omii safe for everyone?',
    answer:
      'Yes. Omii is built to be a safe and welcoming platform for all users. We enforce a zero-tolerance policy against harassment, spam, and inappropriate content. Any accounts or sessions found to be violating safety rules are immediately and permanently banned.',
  },
  {
    question: 'How does 1-to-1 Stranger Chat work?',
    answer:
      'When you start chatting, Omii pairs you with an available stranger who shares similar interest tags, or pairs you randomly if no exact match is found. You can exchange text messages, send short voice notes (up to 30 seconds), and share photos safely.',
  },
  {
    question: 'How does the 24-hour reconnect code work?',
    answer:
      'If you lose connection or disconnect accidentally, Omii generates an 8-character reconnect code for your partner. You can enter this code within 24 hours on the homepage or chat page to re-establish your conversation.',
  },
  {
    question: 'How do Public Topic Rooms work?',
    answer:
      'Public rooms are organized around community topics like Gaming Hub, Music Lounge, Cinema & TV, Tech & Code, College Life, Chill Cafe, and regional communities. Up to 200 members can chat simultaneously, and the last 50 messages are preserved for new joiners.',
  },
  {
    question: 'Can I create a private group room?',
    answer:
      'Yes! You can generate a private room in seconds. You will receive a unique shareable link (/r/code) to invite friends. As the room creator, you have host privileges to mute or kick disruptive members. Empty private rooms automatically delete after 30 minutes of inactivity.',
  },
  {
    question: 'How does image sharing work with safety blurs?',
    answer:
      'When an image is sent in 1-to-1 chat or topic rooms, it is validated for security and rendered with a protective blur. The receiving user can click the image to reveal it whenever they choose.',
  },
  {
    question: 'How is spam, profanity, and harassment moderated?',
    answer:
      'Omii implements real-time profanity and spam filters, per-room rate limits, and an integrated message reporting system. Sessions that receive multiple validated abuse reports are automatically banned by the server and audited by human moderators.',
  },
  {
    question: 'Does Omii store my conversations permanently?',
    answer:
      'No. Omii chat transcripts are ephemeral and stream strictly in memory. Once a 1-to-1 conversation finishes, messages are discarded. Only when a report is filed are the last 20 messages securely saved for moderation audit.',
  },
];

export default function FAQPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-10 w-full">
        <div className="space-y-3 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-line)] text-xs font-medium text-[var(--text-muted)]">
            <HelpCircle className="w-3.5 h-3.5 text-[var(--accent-dial)]" />
            <span>Answers to common questions</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-[var(--text-ink)]">
            Frequently asked questions
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-xl">
            Everything you need to know about using {siteConfig.fullTitle}, privacy, topic rooms, and safety.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-2"
            >
              <h2 className="text-sm font-semibold text-[var(--text-ink)]">
                {faq.question}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        <div className="p-6 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-center space-y-3">
          <h3 className="text-base font-bold font-display text-[var(--text-ink)]">Still have questions?</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Our moderation and support team is always available to assist with inquiries, bug reports, and ban appeals.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link
              href="/contact"
              className="px-4 py-2 rounded-xl bg-[var(--accent-dial)] hover:opacity-90 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
            >
              Contact support
            </Link>
            <Link
              href="/rules"
              className="px-4 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-ink)] font-medium text-xs border border-[var(--border-line)] transition-colors"
            >
              Community rules
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
