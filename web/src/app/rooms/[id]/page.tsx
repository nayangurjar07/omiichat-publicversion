'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import { getStoredNickname } from '@/lib/session';
import { Navbar } from '@/components/ui/Navbar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ReportModal } from '@/components/chat/ReportModal';
import { RoomMessage, ReportReason } from '@/types';
import {
  Users,
  LogOut,
  Shield,
  VolumeX,
  Volume2,
  Share2,
  Check,
  AlertCircle,
  Lock,
  X,
} from 'lucide-react';

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default function RoomChatPage({ params }: RoomPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;

  const {
    isConnected,
    retryConnection,
    currentRoom,
    roomMembers,
    roomMessages,
    isRoomCreator,
    isRoomMuted,
    roomTypingUsers,
    kickedReason,
    roomJoinError,
    errorMessage,
    rateLimitedNotice,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    sendRoomTyping,
    kickRoomMember,
    muteRoomMember,
    reportRoomMessage,
  } = useSocket();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [reportingMessage, setReportingMessage] = useState<RoomMessage | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-join room on mount
  useEffect(() => {
    const nick = getStoredNickname() || 'Anonymous';
    joinRoom(roomId, nick).catch(() => {});

    return () => {
      leaveRoom();
    };
  }, [roomId, joinRoom, leaveRoom]);

  // Handle kicked redirect
  useEffect(() => {
    if (kickedReason) {
      router.push(`/rooms?kicked=${encodeURIComponent(kickedReason)}`);
    }
  }, [kickedReason, router]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages, roomTypingUsers]);

  // Smoothly auto-scroll on mobile virtual keyboard resize
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewportResize = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    window.visualViewport.addEventListener('resize', handleViewportResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  const handleSendMessage = (text?: string, mediaUrl?: string, mediaType?: 'image' | 'audio') => {
    sendRoomMessage(text, mediaUrl, mediaType);
  };

  const handleReportMessage = (msg: RoomMessage) => {
    setReportingMessage(msg);
  };

  const handleReportSubmit = (reason: ReportReason, detail?: string) => {
    if (!reportingMessage) return;
    reportRoomMessage({
      messageId: reportingMessage.id,
      reportedSid: reportingMessage.senderId,
      messageText: reportingMessage.text,
      mediaUrl: reportingMessage.mediaUrl,
      reason,
      detail,
    });
    setReportingMessage(null);
  };

  const handleShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLeave = () => {
    leaveRoom();
    router.push('/rooms');
  };

  // Dedicated fallback screen when room join errors
  if (roomJoinError) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[var(--bg-paper)] text-[var(--text-ink)]">
        <Navbar inChat={true} isConnected={isConnected} onRetryConnection={retryConnection} />
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-xs space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-[var(--color-alert)] flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-ink)]">
              Room not found
            </h1>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {roomJoinError.message || 'This room does not exist, has expired, or reached capacity.'}
            </p>
            <div className="pt-2">
              <Link
                href="/rooms"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[var(--accent-dial)] hover:bg-[var(--accent-dial-hover)] text-white text-xs font-semibold transition-colors"
              >
                Return to rooms
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors overflow-hidden">
      <Navbar inChat={true} isConnected={isConnected} onRetryConnection={retryConnection} />

      {/* Warning Banners */}
      {!isConnected && (
        <div className="bg-[var(--bg-subtle)] border-b border-[var(--border-line)] px-4 py-2 text-xs text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--color-alert)] shrink-0" />
          <span>Can't reach the server. Check your connection, then try again.</span>
          <button
            type="button"
            onClick={retryConnection}
            className="font-semibold text-[var(--accent-dial)] hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {(errorMessage || rateLimitedNotice || isRoomMuted) && (
        <div className="bg-[var(--color-alert)] text-white text-xs font-medium px-4 py-2 flex items-center justify-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {isRoomMuted
              ? 'You have been muted by the host.'
              : rateLimitedNotice || errorMessage}
          </span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex min-h-0 w-full max-w-6xl mx-auto sm:px-4 sm:py-3 gap-3">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-surface)] sm:rounded-xl sm:border border-[var(--border-line)] overflow-hidden">
          {/* Room Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-line)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--accent-dial)]">
                {currentRoom?.isPrivate ? <Lock className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-sm font-bold text-[var(--text-ink)] truncate">
                    {currentRoom?.name || 'Topic Room'}
                  </h1>
                  {currentRoom?.isPrivate && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[var(--accent-dial-subtle)] text-[var(--accent-dial)] uppercase">
                      Private
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {currentRoom?.description || `${roomMembers.length} active`}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1.5">
              {currentRoom?.isPrivate && (
                <button
                  type="button"
                  onClick={handleShareLink}
                  title="Copy room link"
                  className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-line)] text-[var(--text-ink)] border border-[var(--border-line)] transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Invite</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                title="Toggle member list"
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-ink)] hover:bg-[var(--border-line)] border border-[var(--border-line)] transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 opacity-70" />
                <span>{roomMembers.length}</span>
              </button>

              <button
                type="button"
                onClick={handleLeave}
                title="Leave room"
                className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-1">
            {roomMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-1 text-[var(--text-muted)] select-none">
                <p className="text-sm font-semibold text-[var(--text-ink)]">
                  Welcome to {currentRoom?.name || 'the room'}
                </p>
                <p className="text-xs">
                  Say hello or share something with everyone here.
                </p>
              </div>
            ) : (
              roomMessages.map((msg, index) => {
                const prev = index > 0 ? roomMessages[index - 1] : null;
                const isConsecutive =
                  !!prev &&
                  prev.senderId === msg.senderId &&
                  !prev.isSystem &&
                  !msg.isSystem &&
                  msg.timestamp - prev.timestamp < 60000;

                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isConsecutive={isConsecutive}
                    onReportMessage={() => handleReportMessage(msg)}
                  />
                );
              })
            )}

            {roomTypingUsers.length > 0 && (
              <div className="text-xs text-[var(--text-muted)] italic py-1 animate-pulse">
                {roomTypingUsers.join(', ')} {roomTypingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Room Chat Input */}
          <div className="shrink-0">
            <ChatInput
              onSendMessage={handleSendMessage}
              onTyping={sendRoomTyping}
              disabled={isRoomMuted}
              placeholder={
                isRoomMuted
                  ? 'You have been muted by the host.'
                  : 'Send message, photo, or audio note to the room...'
              }
            />
          </div>
        </div>

        {/* Member Sidebar / Drawer */}
        {isSidebarOpen && (
          <>
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="sm:hidden fixed inset-0 bg-black/40 z-30"
            />

            <div className="fixed sm:static right-0 top-0 bottom-0 z-40 w-72 sm:w-64 flex flex-col min-h-0 bg-[var(--bg-surface)] sm:rounded-xl border-l sm:border border-[var(--border-line)] shadow-lg sm:shadow-none overflow-hidden">
              <div className="p-3.5 border-b border-[var(--border-line)] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Members ({roomMembers.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="sm:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {roomMembers.map((member) => (
                  <div
                    key={member.sessionId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-success)] shrink-0" />
                      <span className="text-xs font-semibold text-[var(--text-ink)] truncate">
                        {member.nickname}
                      </span>
                      {member.isCreator && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-bold bg-[var(--accent-dial-subtle)] text-[var(--accent-dial)]">
                          <Shield className="w-2.5 h-2.5" />
                          Host
                        </span>
                      )}
                      {member.isMuted && (
                        <span className="px-1 py-0.2 rounded text-[10px] font-semibold bg-rose-500/10 text-[var(--color-alert)]">
                          Muted
                        </span>
                      )}
                    </div>

                    {/* Host Controls */}
                    {isRoomCreator && !member.isCreator && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => muteRoomMember(member.sessionId, !member.isMuted)}
                          title={member.isMuted ? 'Unmute' : 'Mute'}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-ink)] cursor-pointer"
                        >
                          {member.isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => kickRoomMember(member.sessionId)}
                          title="Kick member"
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--color-alert)] cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        onSubmit={handleReportSubmit}
        partnerNickname={reportingMessage?.senderNick || 'Participant'}
      />
    </div>
  );
}
