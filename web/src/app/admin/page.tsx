'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { ReportItem, BanItem } from '@/types';
import { siteConfig } from '@/config/site';
import { getApiBase } from '@/lib/endpoints';
import {
  ShieldAlert,
  Lock,
  Check,
  Ban,
  Trash2,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ChevronDown,
  ChevronUp,
  Flame,
  Users,
  Image as ImageIcon,
} from 'lucide-react';

export default function AdminPage() {
  const apiBase = getApiBase();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [bans, setBans] = useState<BanItem[]>([]);
  const [activeTab, setActiveTab] = useState<'reports' | 'bans'>('reports');
  const [reportFilter, setReportFilter] = useState<'all' | 'direct' | 'rooms'>('all');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Check saved admin password in session
  useEffect(() => {
    const saved = sessionStorage.getItem('omii_admin_pw');
    if (saved) {
      setPassword(saved);
      authenticate(saved);
    }
  }, []);

  const authenticate = async (pwd: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/reports`, {
        headers: {
          'Authorization': `Bearer ${pwd}`,
          'x-admin-password': pwd,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setIsAuthenticated(true);
        sessionStorage.setItem('omii_admin_pw', pwd);
        fetchBans(pwd);
      } else if (res.status === 401) {
        setErrorMsg('Invalid admin password.');
        sessionStorage.removeItem('omii_admin_pw');
      } else if (res.status === 429) {
        setErrorMsg('Too many failed attempts. Please wait a few minutes before retrying.');
      } else {
        setErrorMsg(`Server error (${res.status}). Please check server logs.`);
      }
    } catch {
      setErrorMsg("Can't reach the server. Check your connection, then try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = useCallback(async (pwd = password) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/reports`, {
        headers: {
          'Authorization': `Bearer ${pwd}`,
          'x-admin-password': pwd,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {
      setErrorMsg('Failed to refresh reports.');
    } finally {
      setLoading(false);
    }
  }, [password, apiBase]);

  const fetchBans = useCallback(async (pwd = password) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/bans`, {
        headers: {
          'Authorization': `Bearer ${pwd}`,
          'x-admin-password': pwd,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBans(data.bans || []);
      }
    } catch {}
  }, [password, apiBase]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    authenticate(password);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    sessionStorage.removeItem('omii_admin_pw');
  };

  const handleDismiss = async (reportId: string) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/reports/${reportId}/dismiss`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'x-admin-password': password,
        },
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: 'dismissed' } : r))
        );
      }
    } catch {
      alert('Error dismissing report');
    }
  };

  const handleBan = async (report: ReportItem) => {
    const reason = prompt(
      `Enter reason for banning session ${report.reportedSid}:`,
      `Violation of rules: ${report.reason}${report.roomName ? ` in room ${report.roomName}` : ''}`
    );
    if (!reason) return;

    try {
      const res = await fetch(`${apiBase}/api/admin/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
          'x-admin-password': password,
        },
        body: JSON.stringify({
          sessionId: report.reportedSid,
          reason,
          reportId: report.id,
        }),
      });

      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? { ...r, status: 'banned' } : r))
        );
        fetchBans();
      }
    } catch {
      alert('Failed to ban session');
    }
  };

  const handleUnban = async (sessionId: string) => {
    if (!confirm(`Are you sure you want to unban session: ${sessionId}?`)) return;

    try {
      const res = await fetch(`${apiBase}/api/admin/unban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
          'x-admin-password': password,
        },
        body: JSON.stringify({ sessionId }),
      });

      if (res.ok) {
        setBans((prev) => prev.filter((b) => b.sessionId !== sessionId));
      }
    } catch {
      alert('Failed to unban session');
    }
  };

  const parseContext = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Filtered reports
  const roomReportsCount = reports.filter((r) => !!r.roomId).length;
  const directReportsCount = reports.length - roomReportsCount;

  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'direct') return !r.roomId;
    if (reportFilter === 'rooms') return !!r.roomId;
    return true;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0B1020] text-zinc-100 transition-colors">
        <Navbar />

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-950/60 text-blue-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold">{siteConfig.siteName} Admin Panel</h1>
              <p className="text-xs text-zinc-400">
                Enter master password to moderate 1-to-1 chats, public topic rooms, and manage active bans.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter ADMIN_PASSWORD..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)]"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[var(--accent-dial)] hover:opacity-90 active:scale-98 text-white font-medium text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1020] text-zinc-100 transition-colors">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Safety & Moderation Dashboard
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Audit 1-to-1 reports, public & private room violations, and enforce bans.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchReports();
                fetchBans();
              }}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Total Reports
            </span>
            <div className="text-2xl font-extrabold text-zinc-100 mt-1">
              {reports.length}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              1-to-1 Chat Reports
            </span>
            <div className="text-2xl font-extrabold text-blue-400 mt-1">
              {directReportsCount}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Topic Room Reports
            </span>
            <div className="text-2xl font-extrabold text-sky-400 mt-1">
              {roomReportsCount}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Active Bans
            </span>
            <div className="text-2xl font-extrabold text-rose-400 mt-1">
              {bans.length}
            </div>
          </div>
        </div>

        {/* Tabs & Sub-filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('reports')}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Reports ({reports.length})
            </button>
            <button
              onClick={() => setActiveTab('bans')}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'bans'
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Active Bans ({bans.length})
            </button>
          </div>

          {activeTab === 'reports' && (
            <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl text-xs font-medium border border-[var(--border-line)]">
              <button
                onClick={() => setReportFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  reportFilter === 'all'
                    ? 'bg-[var(--accent-dial)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setReportFilter('direct')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  reportFilter === 'direct'
                    ? 'bg-[var(--accent-dial)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                }`}
              >
                1-to-1 ({directReportsCount})
              </button>
              <button
                onClick={() => setReportFilter('rooms')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  reportFilter === 'rooms'
                    ? 'bg-[var(--accent-dial)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                }`}
              >
                Rooms ({roomReportsCount})
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-sm">
                No reports found under this filter.
              </div>
            ) : (
              filteredReports.map((report) => {
                const isExpanded = expandedReportId === report.id;
                const contextMsgs = parseContext(report.context);

                return (
                  <div
                    key={report.id}
                    className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-950/60 text-rose-400 border border-rose-900/60">
                            {report.reason}
                          </span>

                          {/* Room report badge */}
                          {report.roomId ? (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-950/60 text-sky-400 border border-sky-900/60">
                              <Flame className="w-3 h-3" />
                              <span>Room: {report.roomName || report.roomId}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/60 text-blue-400 border border-blue-900/60">
                              1-to-1 Chat
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${
                              report.status === 'banned'
                                ? 'bg-rose-900/50 text-rose-300'
                                : report.status === 'dismissed'
                                ? 'bg-zinc-800 text-zinc-400'
                                : 'bg-amber-950/50 text-amber-300'
                            }`}
                          >
                            {report.status}
                          </span>

                          <span className="text-xs text-zinc-400">
                            {new Date(report.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {/* Reported content preview */}
                        {report.messageText && (
                          <div className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                              Reported Message:
                            </span>
                            <span className="text-zinc-100 font-medium">
                              &ldquo;{report.messageText}&rdquo;
                            </span>
                          </div>
                        )}

                        {report.mediaUrl && (
                          <div className="flex items-center gap-2 text-xs text-blue-400 pt-1">
                            <ImageIcon className="w-4 h-4" />
                            <a
                              href={report.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline hover:text-blue-300"
                            >
                              Inspect Reported Media File
                            </a>
                          </div>
                        )}

                        <div className="text-xs text-zinc-400 font-mono pt-1">
                          Reported SID: <strong className="text-zinc-200">{report.reportedSid}</strong> | Reporter SID: {report.reporterSid}
                        </div>

                        {report.detail && (
                          <div className="text-xs text-zinc-300 italic pt-0.5">
                            Reporter detail: &ldquo;{report.detail}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-start shrink-0">
                        <button
                          onClick={() =>
                            setExpandedReportId(isExpanded ? null : report.id)
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-700"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Context ({contextMsgs.length})</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>

                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleBan(report)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Ban Session</span>
                            </button>

                            <button
                              onClick={() => handleDismiss(report.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Dismiss</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Chat Context Transcript Accordion */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-zinc-800 space-y-2">
                        <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span>Recorded chat transcript context:</span>
                        </div>

                        {contextMsgs.length === 0 ? (
                          <div className="text-xs text-zinc-500 italic">
                            No messages recorded in context.
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2 max-h-60 overflow-y-auto">
                            {contextMsgs.map((msg: { senderId: string; senderNick?: string; text?: string; mediaUrl?: string; timestamp: number }, idx: number) => {
                              const isReported = msg.senderId === report.reportedSid;
                              return (
                                <div
                                  key={idx}
                                  className={`flex flex-col text-xs ${
                                    isReported ? 'items-end' : 'items-start'
                                  }`}
                                >
                                  <span className="text-[10px] text-zinc-500 mb-0.5">
                                    {msg.senderNick || (isReported ? 'Reported User' : 'Reporter')}{' '}
                                    ({new Date(msg.timestamp).toLocaleTimeString()})
                                  </span>
                                  <div
                                    className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words ${
                                      isReported
                                        ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                                    }`}
                                  >
                                    {msg.text || (msg.mediaUrl ? '[Media File]' : '')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE BANS */}
        {activeTab === 'bans' && (
          <div className="space-y-4">
            {bans.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-sm">
                No active bans in the system.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bans.map((ban) => (
                  <div
                    key={ban.id}
                    className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="font-mono text-xs font-bold text-zinc-100 truncate">
                          {ban.sessionId}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400">
                        Reason: {ban.reason}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Banned on: {new Date(ban.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => handleUnban(ban.sessionId)}
                      className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-colors shrink-0 cursor-pointer"
                    >
                      Unban
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
