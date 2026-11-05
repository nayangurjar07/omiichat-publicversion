import type { Metadata } from 'next';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import { ShieldAlert, AlertTriangle, CheckCircle, Ban } from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Safety & Rules – Omii: Stranger Chat',
  description: `Community rules and safety guidelines for ${siteConfig.fullTitle}. Safe 1-to-1 stranger chat for everyone with zero tolerance for harassment, spam, or inappropriate content.`,
  alternates: {
    canonical: `${siteConfig.url}/rules`,
  },
  openGraph: {
    title: 'Safety & Rules – Omii: Stranger Chat',
    description: `Community rules and safety guidelines for ${siteConfig.fullTitle}. Safe 1-to-1 stranger chat for everyone with zero tolerance for harassment, spam, or inappropriate content.`,
    url: `${siteConfig.url}/rules`,
    siteName: siteConfig.siteName,
  },
};

export default function RulesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-10 w-full">
        {/* Header */}
        <div className="space-y-3 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-dial-subtle)] border border-[var(--accent-dial)]/20 text-xs font-medium text-[var(--accent-dial)]">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Safe stranger chat for everyone</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-[var(--text-ink)]">
            Safety and community rules
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-xl">
            {siteConfig.siteName} is built to be a safe, respectful place for everyone. All users agree to follow these basic guidelines to keep Omii welcoming and positive.
          </p>
        </div>

        {/* Rule 1: No Inappropriate Content */}
        <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-base">
            <Ban className="w-5 h-5 shrink-0" />
            <h2 className="font-display">Zero tolerance for harmful content</h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-ink)] opacity-90 leading-relaxed">
            {siteConfig.fullTitle} is a safe, moderated platform for everyone. Any user sharing inappropriate, harmful, or illegal content is immediately disconnected and permanently blocked. Keep conversations respectful and positive.
          </p>
        </div>

        {/* Prohibited behaviors list */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-[var(--text-ink)]">Prohibited activities</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-1.5">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Harassment and abuse</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Threats, bullying, hate speech, racism, sexism, or persistent unwanted hostility are strictly forbidden.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-1.5">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Spam and commercial links</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Automated messages, promotional links, commercial offers, phishing, or scams are automatically rate-limited and banned.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-1.5">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Non-consensual sexual content</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Unsolicited sexually explicit harassment, non-consensual advances, or illegal sexual content triggers instant suspension.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-1.5">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Doxxing and personal info</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Never share another person’s personal identifiable information (real names, phone numbers, addresses) without consent.
              </p>
            </div>
          </div>
        </div>

        {/* How violations are enforced */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-4">
          <h2 className="text-base font-bold font-display text-[var(--text-ink)]">Enforcement and safety controls</h2>
          <ul className="space-y-2.5 text-xs sm:text-sm text-[var(--text-muted)]">
            <li className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Automated safety filter:</strong> Sessions receiving multiple independent reports in a 24-hour window are suspended automatically.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Report context:</strong> When you file a report, the last 20 messages of context are securely evaluated by staff to take appropriate action.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Instant blocking:</strong> Blocking a stranger disconnects the conversation and guarantees your session won&apos;t pair with them again.</span>
            </li>
          </ul>
        </div>

        <div className="pt-2 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-dial)] hover:opacity-90 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
          >
            Return to home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
