import type { Metadata } from 'next';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import { Lock, ShieldCheck, Database, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Privacy – Omii: Stranger Chat',
  description: `How ${siteConfig.fullTitle} handles user privacy, ephemeral in-memory chats, and anonymous sessions.`,
  alternates: {
    canonical: `${siteConfig.url}/privacy`,
  },
  openGraph: {
    title: 'Privacy – Omii: Stranger Chat',
    description: `How ${siteConfig.fullTitle} handles user privacy, ephemeral in-memory chats, and anonymous sessions.`,
    url: `${siteConfig.url}/privacy`,
    siteName: siteConfig.siteName,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B1020] text-zinc-100 transition-colors">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-10">
        <div className="space-y-3 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-dial-subtle)] border border-[var(--accent-dial)]/20 text-xs font-semibold text-[var(--accent-dial)]">
            <Lock className="w-3.5 h-3.5 text-[var(--accent-dial)]" />
            <span>Privacy By Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-400">
            Last updated: October 2026. At {siteConfig.fullTitle}, our architecture is designed from the beginning around true anonymity and minimal data retention.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
            <EyeOff className="w-6 h-6 text-[var(--accent-dial)]" />
            <h3 className="font-bold text-sm">No Registration</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We never ask for your email, phone number, name, or password. You are represented only by an anonymous session ID.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
            <Database className="w-6 h-6 text-[var(--accent-dial)]" />
            <h3 className="font-bold text-sm">Ephemeral In-Memory Chats</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Messages stream directly through memory. When a conversation finishes, all in-flight messages are instantly expunged.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-sm">Targeted Abuse Auditing</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Only when a user triggers a report, the last 20 messages of context are recorded strictly for safety moderation review.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-6 text-xs sm:text-sm text-zinc-400 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-zinc-100">
              1. What Information We Store
            </h2>
            <p>
              {siteConfig.siteName} collects only what is required to operate the matching service:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>An anonymous alphanumeric session token saved locally in your browser’s localStorage.</li>
              <li>Your temporary nickname and optional interest tags chosen during your session.</li>
              <li>Moderation reports filed by you or against your session, including the last 20 messages exchanged.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-zinc-100">
              2. Use of Cookies and Local Storage
            </h2>
            <p>
              We do not use advertising or tracking cookies. We utilize browser LocalStorage exclusively to maintain your anonymous session state, your blocklist, and your theme preference.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-zinc-100">
              3. Third-Party Sharing
            </h2>
            <p>
              We never sell, rent, or share personal information with third-party advertisers. Data is only disclosed when legally compelled by law enforcement in cases involving severe safety threats or child exploitation investigations.
            </p>
          </section>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-[var(--accent-dial)] hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
