'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { useSocket } from '@/hooks/useSocket';
import {
  SavedFriend,
  FriendRequest,
  getMyFriendCode,
  formatLastSeen,
} from '@/lib/friends';
import {
  Users,
  UserPlus,
  Share2,
  Copy,
  Check,
  MessageSquare,
  Trash2,
  Sparkles,
  Search,
  Clock,
  X,
  Radio,
  UserCheck,
  Send,
  AlertCircle,
} from 'lucide-react';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStrangerNickname?: string;
  socketHook?: ReturnType<typeof useSocket>;
}

export function FriendsModal({
  isOpen,
  onClose,
  activeStrangerNickname,
  socketHook,
}: FriendsModalProps) {
  const router = useRouter();

  // Use passed hook instance if available, otherwise initialize hook
  const defaultHook = useSocket();
  const hook = socketHook || defaultHook;

  const {
    friends,
    friendRequests,
    friendRequestFeedback,
    sendFriendRequest,
    respondFriendRequest,
    cancelFriendRequest,
    removeFriend,
    inviteFriendToChat,
    clearFriendFeedback,
    refreshFriends,
  } = hook;

  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'add' | 'mycode'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputFriendCode, setInputFriendCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<{
    type: 'ok' | 'err' | 'info';
    text: string;
  } | null>(null);

  const myCode = typeof window !== 'undefined' ? getMyFriendCode() : 'OMII-LIVE';

  const incomingRequests = useMemo(
    () => friendRequests.filter((r) => r.direction === 'incoming'),
    [friendRequests]
  );
  const outgoingRequests = useMemo(
    () => friendRequests.filter((r) => r.direction === 'outgoing'),
    [friendRequests]
  );

  useEffect(() => {
    if (isOpen) {
      refreshFriends();
      setLocalFeedback(null);
      setConfirmRemoveId(null);
    }
  }, [isOpen, refreshFriends]);

  const handleSendRequestByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputFriendCode.trim().toUpperCase();
    if (!clean) {
      setLocalFeedback({ type: 'err', text: 'Please enter a valid friend code (e.g. OMII-ABCD).' });
      return;
    }

    if (clean === myCode.toUpperCase()) {
      setLocalFeedback({ type: 'err', text: 'You cannot send a friend request to your own code.' });
      return;
    }

    const alreadyFriend = friends.some((f) => f.friendCode?.toUpperCase() === clean);
    if (alreadyFriend) {
      setLocalFeedback({ type: 'info', text: 'This person is already in your friends list.' });
      return;
    }

    const res = sendFriendRequest({ targetFriendCode: clean });
    if (res.success) {
      setInputFriendCode('');
      setLocalFeedback({
        type: 'ok',
        text: 'Friend request sent! They must accept before you become friends.',
      });
      setTimeout(() => {
        setLocalFeedback(null);
        setActiveTab('requests');
      }, 1500);
    } else {
      setLocalFeedback({ type: 'err', text: res.message });
    }
  };

  const handleSendRequestToActivePartner = () => {
    const res = sendFriendRequest({});
    if (res.success) {
      setLocalFeedback({
        type: 'ok',
        text: `Friend request sent to ${activeStrangerNickname || 'stranger'}! Waiting for acceptance.`,
      });
      setTimeout(() => {
        setLocalFeedback(null);
        setActiveTab('requests');
      }, 1500);
    } else {
      setLocalFeedback({ type: 'err', text: res.message });
    }
  };

  const handleAcceptRequest = (requestId: string) => {
    respondFriendRequest(requestId, true);
    setLocalFeedback({ type: 'ok', text: 'Request accepted! You are now friends.' });
    setTimeout(() => setLocalFeedback(null), 3000);
  };

  const handleDeclineRequest = (requestId: string) => {
    respondFriendRequest(requestId, false);
    setLocalFeedback({ type: 'info', text: 'Request declined.' });
    setTimeout(() => setLocalFeedback(null), 3000);
  };

  const handleStartChat = (friend: SavedFriend) => {
    inviteFriendToChat(friend.friendCode || friend.id);
    const roomCode = (friend.friendCode || friend.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'CHAT';
    onClose();
    router.push(`/r/${roomCode}`);
  };

  const handleRemoveFriend = (idOrCode: string) => {
    removeFriend(idOrCode);
    setConfirmRemoveId(null);
    setLocalFeedback({ type: 'info', text: 'Friend removed from list.' });
    setTimeout(() => setLocalFeedback(null), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/chat?friend=${encodeURIComponent(myCode)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredFriends = friends.filter((f) =>
    f.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.friendCode && f.friendCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayFeedback = localFeedback || (friendRequestFeedback ? {
    type: friendRequestFeedback.type === 'success' ? 'ok' as const : friendRequestFeedback.type === 'error' ? 'err' as const : 'info' as const,
    text: friendRequestFeedback.message,
  } : null);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Friends Hub" maxWidth="max-w-lg">
      <div className="space-y-4 font-body">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[var(--accent-dial)] text-white shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Friends</span>
            {friends.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                {friends.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`relative py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-[var(--accent-dial)] text-white shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Requests</span>
            {incomingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-bold animate-pulse">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'add'
                ? 'bg-[var(--accent-dial)] text-white shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Add</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mycode')}
            className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'mycode'
                ? 'bg-[var(--accent-dial)] text-white shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">My Code</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {displayFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in ${
              displayFeedback.type === 'ok'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-[var(--color-success)]'
                : displayFeedback.type === 'err'
                ? 'bg-rose-500/10 border border-rose-500/20 text-[var(--color-alert)]'
                : 'bg-[var(--bg-subtle)] border border-[var(--border-line)] text-[var(--text-ink)]'
            }`}
          >
            {displayFeedback.type === 'ok' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : displayFeedback.type === 'err' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0 text-[var(--accent-dial)]" />
            )}
            <span className="flex-1">{displayFeedback.text}</span>
            <button
              type="button"
              onClick={() => {
                setLocalFeedback(null);
                clearFriendFeedback();
              }}
              className="text-[var(--text-muted)] hover:text-[var(--text-ink)] p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ─── TAB 1: ALL FRIENDS (WITH ONLINE / LAST SEEN STATUS) ─── */}
        {activeTab === 'all' && (
          <div className="space-y-3">
            {/* Search Input if more than 2 friends */}
            {friends.length > 2 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by nickname or code..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)]"
                />
              </div>
            )}

            {/* Friends List */}
            {friends.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] space-y-3">
                <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--accent-dial)] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[var(--text-ink)]">No friends added yet</h4>
                  <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
                    Friends are added when both sides accept. Send a request during chat, or share your code.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {activeStrangerNickname && (
                    <button
                      type="button"
                      onClick={handleSendRequestToActivePartner}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--accent-dial)] hover:opacity-90 text-white shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Request {activeStrangerNickname}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-[var(--bg-surface)] hover:bg-[var(--border-line)] text-[var(--text-ink)] border border-[var(--border-line)] cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enter code</span>
                  </button>
                </div>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-6 text-xs text-[var(--text-muted)]">
                No friends matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {filteredFriends.map((f) => {
                  const isOnline = !!f.isOnline;
                  const statusLabel = formatLastSeen(f.lastSeenAt, isOnline);
                  const isConfirmingRemove = confirmRemoveId === (f.friendCode || f.id);

                  return (
                    <div
                      key={f.id}
                      className="p-3 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border-line)] transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar with live status indicator ring */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-lg select-none">
                            {f.avatar || '🦊'}
                          </div>
                          {/* Live Online Dot */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)] ${
                              isOnline
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
                                : 'bg-[var(--text-muted)] opacity-50'
                            }`}
                            title={isOnline ? 'Online' : statusLabel}
                          />
                        </div>

                        {/* Friend Info & Live Status */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-[var(--text-ink)] truncate">
                              {f.nickname}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-paper)] px-1.5 py-0.2 rounded border border-[var(--border-line)]">
                              {f.friendCode}
                            </span>
                          </div>

                          {/* Live Status indicator */}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOnline ? 'bg-emerald-500' : 'bg-[var(--text-muted)]'
                              }`}
                            />
                            <span
                              className={`text-[11px] font-medium ${
                                isOnline
                                  ? 'text-emerald-500'
                                  : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Options / Action Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isConfirmingRemove ? (
                          <div className="flex items-center gap-1 animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => handleRemoveFriend(f.friendCode || f.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(null)}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Invite / Chat Button */}
                            <button
                              type="button"
                              onClick={() => handleStartChat(f)}
                              title={
                                isOnline
                                  ? `Invite ${f.nickname} to chat now`
                                  : `Start a room with ${f.nickname}`
                              }
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                                isOnline
                                  ? 'bg-[var(--accent-dial)] hover:opacity-90 text-white'
                                  : 'bg-[var(--bg-surface)] hover:bg-[var(--border-line)] text-[var(--text-ink)] border border-[var(--border-line)]'
                              }`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{isOnline ? 'Chat' : 'Room'}</span>
                            </button>

                            {/* Remove Option */}
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(f.friendCode || f.id)}
                              title="Remove friend"
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: REQUESTS (INCOMING & OUTGOING MUTUAL REQUESTS) ─── */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {/* Incoming Requests Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-ink)]">
                <span>Incoming Requests</span>
                <span className="text-[11px] font-normal text-[var(--text-muted)]">
                  {incomingRequests.length} pending
                </span>
              </div>

              {incomingRequests.length === 0 ? (
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-center text-xs text-[var(--text-muted)]">
                  No incoming requests at the moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-emerald-500/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-lg shrink-0">
                          {req.fromAvatar || '🦊'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-ink)] truncate">
                            {req.fromNickname || 'Stranger'}
                          </p>
                          <p className="text-[11px] font-mono text-[var(--text-muted)]">
                            {req.fromFriendCode}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(req.id)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-success)] hover:opacity-90 text-white transition-opacity cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineRequest(req.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests Section */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-line)]">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-ink)]">
                <span>Sent Requests</span>
                <span className="text-[11px] font-normal text-[var(--text-muted)]">
                  {outgoingRequests.length} waiting
                </span>
              </div>

              {outgoingRequests.length === 0 ? (
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-center text-xs text-[var(--text-muted)]">
                  No pending sent requests.
                </div>
              ) : (
                <div className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                        <div className="min-w-0">
                          <span className="font-mono font-semibold text-[var(--text-ink)]">
                            {req.fromFriendCode}
                          </span>
                          <span className="text-[var(--text-muted)] ml-2 text-[11px]">
                            Waiting for acceptance...
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => cancelFriendRequest(req.id)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: ADD FRIEND (SEND MUTUAL REQUEST) ─── */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            {/* If actively chatting with someone */}
            {activeStrangerNickname && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-between gap-3 shadow-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-ink)] truncate flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span>Active stranger chat:</span>
                    <span className="text-[var(--accent-dial)]">{activeStrangerNickname}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Send them a request right now. They will become friends once accepted.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSendRequestToActivePartner}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--accent-dial)] hover:opacity-90 text-white shadow-xs transition-all cursor-pointer shrink-0"
                >
                  Send Request
                </button>
              </div>
            )}

            {/* Form to enter friend code */}
            <form onSubmit={handleSendRequestByCode} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-ink)] mb-1.5">
                  Enter Friend Code
                </label>
                <input
                  type="text"
                  value={inputFriendCode}
                  onChange={(e) => setInputFriendCode(e.target.value.toUpperCase())}
                  placeholder="e.g. OMII-9K3F"
                  maxLength={12}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)] placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)] uppercase tracking-wider"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Adding a friend sends a mutual request. They must accept before both of you appear on each other&apos;s list with live online status.
                </p>
              </div>

              <button
                type="submit"
                disabled={!inputFriendCode.trim()}
                className="w-full py-2.5 rounded-xl bg-[var(--accent-dial)] hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Send Friend Request</span>
              </button>
            </form>
          </div>
        )}

        {/* ─── TAB 4: MY CODE (VIEW & SHARE) ─── */}
        {activeTab === 'mycode' && (
          <div className="space-y-4 text-center">
            <div className="p-6 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] space-y-3">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Your Personal Friend Code
              </span>

              <div className="text-3xl font-extrabold font-mono tracking-widest text-[var(--accent-dial)] select-all py-1">
                {myCode}
              </div>

              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
                Give this code to friends or people you meet. When they send a request, you will receive an acceptance prompt here.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold bg-[var(--bg-surface)] hover:bg-[var(--border-line)] text-[var(--text-ink)] border border-[var(--border-line)] transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied code!' : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold bg-[var(--accent-dial)] hover:opacity-90 text-white shadow-xs transition-all cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
