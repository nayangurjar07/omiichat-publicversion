import type { Metadata } from 'next';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Terms – Omii: Stranger Chat',
  description: `Terms and conditions for utilizing the ${siteConfig.fullTitle} anonymous chat platform.`,
  alternates: {
    canonical: `${siteConfig.url}/terms`,
  },
  openGraph: {
    title: 'Terms – Omii: Stranger Chat',
    description: `Terms and conditions for utilizing the ${siteConfig.fullTitle} anonymous chat platform.`,
    url: `${siteConfig.url}/terms`,
    siteName: siteConfig.siteName,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B1020] text-zinc-100 transition-colors">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-400">
            Please read these terms carefully before participating in {siteConfig.siteName} chats.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-6 text-xs sm:text-sm text-zinc-400 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-zinc-100">
              1. Age Requirement & Eligibility
            </h2>
            <p>
              By accessing {siteConfig.fullTitle}, you explicitly warrant that you are at least 18 years old (or the age of majority in your jurisdiction). If you are under 18 years of age, you are prohibited from using this website.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-zinc-100">
              2. User Content & Conduct
            </h2>
            <p>
              You are solely responsible for all messages and interactions conducted under your anonymous session. You agree not to distribute malware, solicit minors, engage in hate speech, harass other visitors, or violate applicable local, national, or international laws.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-zinc-100">
              3. Right to Terminate & Ban
            </h2>
            <p>
              {siteConfig.siteName} reserves the right to immediately suspend, block, or permanently ban any session ID that violates community standards or receives multiple community reports, without prior notice.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-zinc-100">
              4. Disclaimer of Warranties
            </h2>
            <p>
              The service is provided &ldquo;as is&rdquo; without warranties of any kind. {siteConfig.siteName} cannot control and is not liable for the content, statements, or behavior of random strangers you are paired with. Users are advised never to disclose sensitive personal, financial, or identifying details.
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
