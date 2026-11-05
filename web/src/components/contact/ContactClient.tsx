'use client';

import { useState } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import { Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export function ContactClient() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-8 w-full">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-[var(--text-ink)]">
            Contact support
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Have questions, feedback, or need to appeal a moderation action? We&rsquo;re here to help.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-xs">
          {submitted ? (
            <div className="py-12 text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold font-display">Message received</h2>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Thank you for contacting us. If your request requires a response, our safety team will follow up at your provided email.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-2 text-xs font-medium text-[var(--accent-dial)] hover:underline cursor-pointer"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-ink)] mb-1">
                    Your name or alias
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Alex"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-ink)] mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-ink)] mb-1">
                  Subject
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)] text-[var(--text-ink)] cursor-pointer"
                >
                  <option value="general">General feedback or suggestion</option>
                  <option value="appeal">Ban appeal</option>
                  <option value="safety">Critical safety or bug report</option>
                  <option value="legal">Legal or compliance inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-ink)] mb-1">
                  Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Describe your inquiry with as much detail as possible..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[var(--accent-dial)] hover:opacity-90 text-white font-medium text-xs shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit inquiry</span>
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-xs font-medium text-[var(--accent-dial)] hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
