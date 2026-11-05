'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import {
  getStoredNickname,
  getStoredInterests,
  getStoredLanguage,
} from '@/lib/session';
import { Navbar } from '@/components/ui/Navbar';
import { StatusBar } from '@/components/chat/StatusBar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatInput } from '@/components/chat/ChatInput';
import { ReportModal } from '@/components/chat/ReportModal';
import { ReconnectModal } from '@/components/chat/ReconnectModal';
import { AgeGateModal } from '@/components/ui/AgeGateModal';
import { ReportReason, ChatMessage, RoomMessage } from '@/types';
import { sounds } from '@/lib/sound';
import { ShieldAlert, RefreshCw, Home, Sparkles, UserPlus, Check, AlertCircle, FastForward } from 'lucide-react';

const ICEBREAKER_STARTERS = [
  "What song do you have on repeat right now?",
  "Would you rather travel 100 years into the past or 100 years into the future?",
  "What's the most underrated movie or show you've watched recently?",
  "If you had to eat only one meal for the rest of your life, what would it be?",
  "What's a weird rabbit hole you fell down on the internet lately?",
  "Are you more productive at 7:00 AM or 11:00 PM?",
  "Coffee, tea, or late-night cold water?",
  "If you could teleport to any city right this second, where would you go?",
  "What's one skill you wish you could master overnight without practicing?",
  "What's the best concert or live event you've ever been to?",
  "Do you prefer quiet late nights or sunny outdoor mornings?",
  "What's a game, book, or album that changed your perspective?",
];

function ChatView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reconnectQuery = searchParams.get('reconnect');

  const {
    connectionState,
    isConnected,
    retryConnection,
    status,
    partnerNickname,
    sharedInterests,
    messages,
    partnerTyping,
    banReason,
    errorMessage,
    rateLimitedNotice,
    reconnectInfo,
    friends,
    friendRequests,
    activePartnerFriendRequest,
    friendRequestFeedback,
    sendFriendRequest,
    respondFriendRequest,
    cancelFriendRequest,
    joinQueue,
    leaveQueue,
    sendMessage,
    sendTyping,
    skip,
    block,
    report,
    requestReconnect,
    joinByReconnectCode,
  } = useSocket();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReconnectModalOpen, setIsReconnectModalOpen] = useState(false);
  const [isFriendSent, setIsFriendSent] = useState(false);
  const [simulatedFriendAccepted, setSimulatedFriendAccepted] = useState(false);
  const [localFriendFeedback, setLocalFriendFeedback] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | RoomMessage | null>(null);
  const [activeIcebreaker, setActiveIcebreaker] = useState<string>('');
  const [rematchCountdown, setRematchCountdown] = useState<number | null>(null);
  const [skipPendingConfirmation, setSkipPendingConfirmation] = useState(false);
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(status);
  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status === 'matched') {
      setIsFriendSent(false);
      setSimulatedFriendAccepted(false);
      const randomPrompt = ICEBREAKER_STARTERS[Math.floor(Math.random() * ICEBREAKER_STARTERS.length)];
      setActiveIcebreaker(randomPrompt);
      setRematchCountdown(null);
    }
  }, [status, partnerNickname]);

  // Flow Retention: When partner leaves, start 3-second countdown to automatically rematch
  useEffect(() => {
    if (status === 'partner_left') {
      setRematchCountdown(3);
    } else {
      setRematchCountdown(null);
    }
  }, [status]);

  useEffect(() => {
    if (rematchCountdown === null) return;
    if (rematchCountdown <= 0) {
      handleSkip();
      return;
    }
    const timer = setTimeout(() => {
      setRematchCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [rematchCountdown]);

  // Check 18+ Age Verification from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isVerified = localStorage.getItem('omii_age_verified') === 'true';
      if (!isVerified) {
        setIsAgeModalOpen(true);
      }
    }
  }, []);

  // Visual Viewport resize listener: Smoothly auto-scroll when mobile virtual keyboard opens
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

  const handleSkip = useCallback(() => {
    setRematchCountdown(null);
    setSkipPendingConfirmation(false);
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    skip();
    const nick = getStoredNickname() || 'Anonymous';
    const interests = getStoredInterests();
    const lang = getStoredLanguage();
    joinQueue(nick, interests, lang);
  }, [skip, joinQueue]);

  // Two-Step Skip Guard: Prevents accidental disconnects on mobile taps or single Esc presses
  const initiateSkip = useCallback(() => {
    if (statusRef.current === 'matched') {
      if (skipPendingConfirmation) {
        if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
        setSkipPendingConfirmation(false);
        handleSkip();
      } else {
        setSkipPendingConfirmation(true);
        if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
        skipTimerRef.current = setTimeout(() => {
          setSkipPendingConfirmation(false);
        }, 2500);
      }
    } else {
      setSkipPendingConfirmation(false);
      handleSkip();
    }
  }, [skipPendingConfirmation, handleSkip]);

  // Desktop Global Escape Key with Two-Step Guard
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        initiateSkip();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [initiateSkip]);

  const isAlreadyFriend =
    simulatedFriendAccepted ||
    friends.some(
      (f) =>
        partnerNickname && f.nickname.toLowerCase() === partnerNickname.toLowerCase()
    );

  const friendState: 'none' | 'pending' | 'friend' = isAlreadyFriend
    ? 'friend'
    : isFriendSent
    ? 'pending'
    : 'none';

  // Mount effect: join queue or reconnect, with StrictMode-safe cleanup
  useEffect(() => {
    const nick = getStoredNickname() || 'Anonymous';
    const interests = getStoredInterests();
    const lang = getStoredLanguage();

    if (reconnectQuery) {
      joinByReconnectCode(reconnectQuery, nick);
    } else {
      joinQueue(nick, interests, lang);
    }

    return () => {
      if (statusRef.current === 'matched') {
        skip();
      } else {
        leaveQueue();
      }
    };
  }, [joinQueue, leaveQueue, skip, joinByReconnectCode, reconnectQuery]);

  useEffect(() => {
    if (reconnectInfo) {
      setIsReconnectModalOpen(true);
    }
  }, [reconnectInfo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (statusRef.current === 'matched') {
        skip();
      } else {
        leaveQueue();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [skip, leaveQueue]);


  const handleSendMessage = (text?: string, mediaUrl?: string, mediaType?: 'image' | 'audio') => {
    sendMessage(text, mediaUrl, mediaType);
  };

  const handleSendTyping = (isTyping: boolean) => {
    sendTyping(isTyping);
  };

  const handleBlock = () => {
    handleSkip();
  };

  const handleReportSubmit = (reason: ReportReason, detail?: string) => {
    report(reason, detail);
    setReportingMessage(null);
  };

  const handleReportMessage = (msg: ChatMessage | RoomMessage) => {
    setReportingMessage(msg);
    setIsReportModalOpen(true);
  };

  const handleAddFriend = () => {
    sendFriendRequest({});
    setIsFriendSent(true);
  };

  const handleLeave = () => {
    setRematchCountdown(null);
    if (statusRef.current === 'matched') {
      skip();
    }
    leaveQueue();
    router.push('/');
  };

  // Banned state
  if (status === 'banned') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 font-mono">
        <div className="max-w-md w-full p-8 rounded-lg bg-[#121212] border border-rose-500/40 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">
            Session Suspended
          </h1>
          <p className="text-xs text-zinc-400">
            {banReason || 'Your session has been suspended due to violations of community rules.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/rules')}
            className="w-full py-2.5 text-xs font-semibold rounded bg-[#1c1c1f] hover:bg-[#27272a] text-zinc-200 border border-[#27272a] transition-colors cursor-pointer"
          >
            Review community rules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0a0a] text-zinc-100 transition-colors overflow-hidden font-sans">
      <Navbar inChat={true} isConnected={isConnected} onRetryConnection={retryConnection} />

      {/* Disconnection Warning Banner */}
      {!isConnected && (
        <div className="bg-[#18181b] border-b border-rose-500/30 px-4 py-2 text-xs font-mono text-center flex items-center justify-center gap-2 text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Cannot reach server. Retrying connection...</span>
          <button
            type="button"
            onClick={retryConnection}
            className="font-bold text-white underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Rate limit & general errors */}
      {(errorMessage || rateLimitedNotice) && (
        <div className="bg-rose-950/80 border-b border-rose-500/40 text-rose-200 text-xs font-mono px-4 py-2 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{rateLimitedNotice || errorMessage}</span>
        </div>
      )}

      {/* Main Terminal Chat Container */}
      <div className="flex-1 flex flex-col min-h-0 w-full max-w-3xl mx-auto">
        {/* Switchboard Chat Header */}
        <div className="shrink-0">
          <StatusBar
            status={status}
            partnerNickname={partnerNickname}
            sharedInterests={sharedInterests}
            isConnected={isConnected}
            onSkip={initiateSkip}
            isSkipConfirming={skipPendingConfirmation}
            onBlock={handleBlock}
            onReport={() => setIsReportModalOpen(true)}
            onLeave={handleLeave}
            onRequestReconnect={() => requestReconnect()}
            onAddFriend={handleAddFriend}
            friendState={friendState}
          />
        </div>

        {/* Task 4: Automated Icebreaker Banner at top of new chat */}
        {status === 'matched' && activeIcebreaker && messages.length <= 2 && (
          <div className="mx-4 mt-2 px-3 py-2 rounded bg-[#161618] border border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-zinc-300 min-w-0">
              <span className="text-emerald-400 font-bold shrink-0">[Prompt]</span>
              <span className="text-zinc-200 truncate">{activeIcebreaker}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSendMessage(activeIcebreaker)}
              className="self-end sm:self-auto px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-semibold border border-zinc-700 transition-colors cursor-pointer shrink-0"
            >
              Ask &rarr;
            </button>
          </div>
        )}

        {/* Active Friend Request Banner */}
        {activePartnerFriendRequest && (
          <div className="mx-4 mt-2 p-3 rounded bg-[#161618] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl p-1 rounded bg-[#1f1f23] shrink-0">
                {activePartnerFriendRequest.fromAvatar || '🦊'}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">
                  {activePartnerFriendRequest.fromNickname || partnerNickname || 'Stranger'} sent you a friend request
                </p>
                <p className="text-[11px] text-zinc-400">
                  Accept to stay connected and see live online status.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => respondFriendRequest(activePartnerFriendRequest.id, true)}
                className="px-3 py-1 rounded text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => respondFriendRequest(activePartnerFriendRequest.id, false)}
                className="px-3 py-1 rounded text-xs text-zinc-400 hover:text-white bg-[#1f1f23] hover:bg-[#27272a] border border-[#27272a] transition-colors cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Friend Request Toast Feedback */}
        {(friendRequestFeedback || localFriendFeedback) && (
          <div
            className={`mx-4 mt-2 px-3 py-2 rounded text-xs font-mono flex items-center justify-between gap-2 ${
              (friendRequestFeedback?.type || localFriendFeedback?.type) === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                : (friendRequestFeedback?.type || localFriendFeedback?.type) === 'error'
                ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                : 'bg-[#18181b] text-zinc-200 border border-[#27272a]'
            }`}
          >
            <span>{localFriendFeedback?.message || friendRequestFeedback?.message}</span>
          </div>
        )}

        {/* Messages and State Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 space-y-1">
          {/* SEARCHING STATE */}
          {status === 'searching' && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 font-mono">
              <div className="space-y-1.5 max-w-sm">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#141414] border border-[#27272a] text-xs text-zinc-400 mb-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
                  <span>Searching switchboard</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {reconnectQuery ? 'Reconnecting...' : 'Connecting to a stranger...'}
                </h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {reconnectQuery
                    ? 'Waiting for your partner to redeem the reconnect code.'
                    : 'Searching for available partners with matching interests. (Fallback in 4s)'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLeave}
                  className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white bg-[#141414] hover:bg-[#1f1f23] border border-[#27272a] rounded transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Return Home</span>
                </button>
              </div>
            </div>
          )}

          {/* Task 5: PARTNER LEFT STATE WITH AUTOMATED COUNTDOWN FLOW RETENTION */}
          {status === 'partner_left' && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 font-mono">
              <div className="space-y-2 max-w-sm">
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-bold text-rose-400 bg-rose-950/40 border border-rose-500/30">
                  Partner Disconnected
                </span>
                <h2 className="text-xl font-bold text-white">
                  Stranger left the chat
                </h2>
                <p className="text-xs text-zinc-400">
                  {rematchCountdown !== null && rematchCountdown > 0 ? (
                    <>
                      Rematching automatically in <span className="font-bold text-emerald-400 text-sm">{rematchCountdown}s</span>...
                    </>
                  ) : (
                    'Searching for next match now...'
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="h-10 px-5 rounded bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <FastForward className="w-3.5 h-3.5 fill-black" />
                  <span>Match Now (Instant)</span>
                </button>

                {rematchCountdown !== null && (
                  <button
                    type="button"
                    onClick={() => setRematchCountdown(null)}
                    className="h-10 px-3.5 rounded bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] text-xs transition-colors cursor-pointer"
                  >
                    Pause Auto-Match
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setRematchCountdown(null);
                    requestReconnect();
                  }}
                  className="h-10 px-3.5 rounded bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Trade Reconnect Code</span>
                </button>
              </div>
            </div>
          )}

          {/* MATCHED ACTIVE CONVERSATION */}
          {status === 'matched' && (
            <>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-zinc-500 font-mono select-none">
                  <p className="text-sm font-bold text-white">
                    Connected with {partnerNickname || 'Stranger'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Type a message, ask the icebreaker prompt above, or send a voice note.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const isConsecutive =
                    !!prevMsg &&
                    prevMsg.senderId === msg.senderId &&
                    !prevMsg.isSystem &&
                    !msg.isSystem &&
                    msg.timestamp - prevMsg.timestamp < 60000;

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      partnerNickname={partnerNickname}
                      isConsecutive={isConsecutive}
                      onReportMessage={handleReportMessage}
                    />
                  );
                })
              )}

              {partnerTyping && <TypingIndicator partnerNickname={partnerNickname} />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar with Instant Keyboard Esc & Mobile Skip (2-step guard) */}
        <div className="shrink-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            onTyping={handleSendTyping}
            onSkip={initiateSkip}
            isSkipConfirming={skipPendingConfirmation}
            disabled={status !== 'matched'}
            placeholder={
              status === 'matched'
                ? 'Type a message... (Enter to send, Esc to skip)'
                : status === 'searching'
                ? 'Connecting to the line...'
                : 'Conversation ended'
            }
          />
        </div>
      </div>

      {/* 18+ Age & Safety Gate Modal */}
      <AgeGateModal
        isOpen={isAgeModalOpen}
        onConfirm={() => {
          localStorage.setItem('omii_age_verified', 'true');
          setIsAgeModalOpen(false);
        }}
        onDecline={() => {
          setIsAgeModalOpen(false);
          router.push('/');
        }}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportingMessage(null);
        }}
        onSubmit={handleReportSubmit}
        partnerNickname={reportingMessage?.senderNick || partnerNickname}
      />

      {/* Reconnect Modal */}
      <ReconnectModal
        isOpen={isReconnectModalOpen}
        onClose={() => setIsReconnectModalOpen(false)}
        reconnectInfo={reconnectInfo}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] flex items-center justify-center bg-[#0a0a0a] text-zinc-500 text-xs font-mono">
          Loading line...
        </div>
      }
    >
      <ChatView />
    </Suspense>
  );
}
