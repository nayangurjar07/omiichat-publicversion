import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import { ArrowRight, ShieldCheck, Zap, Lock, MessageSquare, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Best Omegle Alternative in 2026: Safe Anonymous Stranger Chat – Omii',
  description:
    'Looking for an Omegle alternative? Omii offers free, anonymous 1-on-1 stranger chat with interest matching, ephemeral voice notes, zero logging, and strict safety.',
  alternates: {
    canonical: `${siteConfig.url}/omegle-alternative`,
  },
  openGraph: {
    title: 'Best Omegle Alternative in 2026: Safe Anonymous Stranger Chat – Omii',
    description:
      'Looking for an Omegle alternative? Omii offers free, anonymous 1-on-1 stranger chat with interest matching, ephemeral voice notes, zero logging, and strict safety.',
    url: `${siteConfig.url}/omegle-alternative`,
    siteName: siteConfig.siteName,
  },
};

export default function OmegleAlternativePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is Omii a good alternative to Omegle?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Since Omegle permanently shut down, Omii was built to provide what people loved—instant, anonymous random conversation—while completely fixing the safety, spam, and bot problems.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need to sign up or download an app to use Omii?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No sign up, email, or phone number required. Omii works directly in any desktop or mobile browser with zero installation.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are chats recorded or saved?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. All conversations and media are strictly ephemeral and stream in-memory. Once a conversation ends or you skip, messages are permanently destroyed.',
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
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-dial)]" />
            <span>Modern Anonymous Chat</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-ink)] leading-tight">
            The Safe, Free <span className="text-[var(--accent-dial)]">Omegle Alternative</span>
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
            Miss talking to random people online? Omii connects you to strangers across the globe in instant, 1-on-1 conversations without accounts, tracking, or invasive ads.
          </p>

          <div className="pt-2">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[var(--accent-dial)] hover:bg-[var(--accent-dial-hover)] text-white font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>Start Talking to Strangers</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dial-subtle)] text-[var(--accent-dial)] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-ink)]">
              Instant Interest Matching
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Add your favorite topics—gaming, coding, music, cinema, or philosophy—and get matched with people who share your vibe.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dial-subtle)] text-[var(--accent-dial)] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-ink)]">
              True Ephemerality & Privacy
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Zero logs, no database storage of chat history, and no IP trackers. When the switchboard disconnects, the conversation is gone forever.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dial-subtle)] text-[var(--accent-dial)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-ink)]">
              6-Digit Reconnect Codes
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Never get frustrated by accidental skips. Trade a 6-digit reconnect code with someone you liked talking to and resume your chat.
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <section className="space-y-4 pt-6">
          <h2 className="font-display text-2xl font-bold text-[var(--text-ink)] text-center">
            How Omii Compares to Omegle
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-line)] text-[var(--text-ink)] font-bold">
                <tr>
                  <th className="p-3.5">Feature</th>
                  <th className="p-3.5 text-[var(--accent-dial)]">Omii Chat</th>
                  <th className="p-3.5 text-[var(--text-muted)]">Original Omegle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-line)] text-[var(--text-muted)]">
                <tr>
                  <td className="p-3.5 font-semibold text-[var(--text-ink)]">Current Status</td>
                  <td className="p-3.5 font-bold text-emerald-500">Active & Fast</td>
                  <td className="p-3.5 text-rose-500 font-semibold">Permanently Shut Down</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-[var(--text-ink)]">Registration Required</td>
                  <td className="p-3.5 font-bold text-[var(--text-ink)]">Never</td>
                  <td className="p-3.5">Never</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-[var(--text-ink)]">Reconnect Option</td>
                  <td className="p-3.5 font-bold text-emerald-500">6-Digit Code Exchange</td>
                  <td className="p-3.5 text-rose-500">Lost Forever</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-[var(--text-ink)]">Voice Notes</td>
                  <td className="p-3.5 font-bold text-emerald-500">Built-in Ephemeral Audio</td>
                  <td className="p-3.5 text-rose-500">None</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-[var(--text-ink)]">Moderation & Safety</td>
                  <td className="p-3.5 font-bold text-[var(--text-ink)]">Proactive Rate-Limits & Instant Bans</td>
                  <td className="p-3.5">Infested with Bots</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="p-8 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-center space-y-4">
          <h2 className="font-display text-2xl font-bold text-[var(--text-ink)]">
            Ready to talk to someone new?
          </h2>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            One tap connects you with a random stranger right now. Free, private, and always anonymous.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-dial)] hover:bg-[var(--accent-dial-hover)] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Chat Room</span>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
