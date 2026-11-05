import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { ContactClient } from '@/components/contact/ContactClient';

export const metadata: Metadata = {
  title: 'Contact – Omii: Stranger Chat',
  description: `Contact ${siteConfig.fullTitle} support for questions, feedback, safety inquiries, or moderation appeals.`,
  alternates: {
    canonical: `${siteConfig.url}/contact`,
  },
  openGraph: {
    title: 'Contact – Omii: Stranger Chat',
    description: `Contact ${siteConfig.fullTitle} support for questions, feedback, safety inquiries, or moderation appeals.`,
    url: `${siteConfig.url}/contact`,
    siteName: siteConfig.siteName,
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
