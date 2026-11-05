'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import { useSocket } from '@/hooks/useSocket';
import { CreateRoomModal } from '@/components/rooms/CreateRoomModal';
import { getStoredNickname, setStoredNickname } from '@/lib/session';
import { Search, Plus, AlertCircle, Users } from 'lucide-react';

const DEFAULT_ROOMS = [
  { id: 'gaming', name: 'Gaming Hub', description: 'PC, console, RPGs, esports and indie releases', category: 'public' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
  { id: 'music', name: 'Music Lounge', description: 'Tracks, production, vinyl culture and genres', category: 'public' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
  { id: 'movies', name: 'Cinema & Film', description: 'Screenwriting, directors, anime and reviews', category: 'public' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
  { id: 'college', name: 'College & Campus', description: 'Student life, study sessions and late chats', category: 'public' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
  { id: 'tech', name: 'Tech & Code', description: 'Software engineering, tools, AI and systems', category: 'public' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
  { id: 'chill', name: 'Chill Cafe', description: 'Casual talk, relaxing banter and open evening talk', category: 'public' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
  { id: 'region-na', name: 'North America', description: 'United States and Canada community', category: 'regional' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
  { id: 'region-eu', name: 'Europe', description: 'European regional topics and languages', category: 'regional' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
  { id: 'region-asia', name: 'Asia & Pacific', description: 'Asian and Pacific region community hub', category: 'regional' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
  { id: 'region-latam', name: 'Latin America', description: 'Comunidad hispanohablante y regional', category: 'regional' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
  { id: 'region-global', name: 'Global Hub', description: 'International cross-border conversation', category: 'regional' as const, isPrivate: false, userCount: 0, maxUsers: 200 },
];

export function RoomsDirectoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kickedNotice = searchParams.get('kicked');

  const { roomList, onlineCount, isConnected, retryConnection, fetchRoomList, createPrivateRoom } = useSocket();

  const [filter, setFilter] = useState<'all' | 'public' | 'regional'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    fetchRoomList();
    setNickname(getStoredNickname() || 'Anonymous');
  }, [fetchRoomList]);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) return;
    router.push(`/r/${code}`);
  };

  const handleCreateRoom = async (name: string, description?: string) => {
    return createPrivateRoom(name, description, nickname);
  };

  const activeRooms = roomList.length > 0 ? roomList : DEFAULT_ROOMS;

  const filteredRooms = activeRooms.filter((room) => {
    if (filter === 'public' && room.category !== 'public') return false;
    if (filter === 'regional' && room.category !== 'regional') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return room.name.toLowerCase().includes(q) || room.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors">
      <Navbar onlineCount={onlineCount} isConnected={isConnected} onRetryConnection={retryConnection} />

      {/* Disconnection Warning */}
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

      {/* Kicked from room notice */}
      {kickedNotice && (
        <div className="bg-[var(--color-alert)] text-white text-xs font-medium px-4 py-2.5 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>You were removed from the room: {kickedNotice}</span>
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Page Heading & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-ink)]">
              Topic rooms
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Join an open group room or enter a private invite code.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--accent-dial)] hover:bg-[var(--accent-dial-hover)] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create private room</span>
          </button>
        </div>

        {/* Private Invite Code Form & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-line)]">
          {/* Join with Invite Code */}
          <form onSubmit={handleJoinByCode} className="flex gap-2">
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="Enter 6-digit invite code"
              maxLength={8}
              className="flex-1 min-h-[44px] px-3.5 rounded-lg bg-[var(--bg-paper)] border border-[var(--border-line)] font-mono text-xs uppercase tracking-wider text-[var(--text-ink)] placeholder-[var(--text-muted)] focus:border-[var(--accent-dial)] transition-colors"
            />
            <button
              type="submit"
              disabled={!inviteCodeInput.trim()}
              className="min-h-[44px] px-4 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-line)] text-xs font-semibold text-[var(--text-ink)] transition-colors cursor-pointer disabled:opacity-40"
            >
              Join room
            </button>
          </form>

          {/* Search & Category Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms..."
                className="w-full min-h-[44px] pl-9 pr-3 rounded-lg bg-[var(--bg-paper)] border border-[var(--border-line)] text-xs text-[var(--text-ink)] placeholder-[var(--text-muted)] focus:border-[var(--accent-dial)] transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 bg-[var(--bg-paper)] p-1 rounded-lg border border-[var(--border-line)]">
              {(['all', 'public', 'regional'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilter(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                    filter === cat
                      ? 'bg-[var(--bg-surface)] text-[var(--text-ink)] shadow-2xs font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Structured Table Layout */}
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-line)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-line)] bg-[var(--bg-subtle)]/50 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4 sm:px-6">Room</th>
                  <th scope="col" className="py-3 px-4 hidden sm:table-cell">Topic</th>
                  <th scope="col" className="py-3 px-4 text-center">People</th>
                  <th scope="col" className="py-3 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-line)] text-sm">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs text-[var(--text-muted)]">
                      <p className="font-medium text-[var(--text-ink)] mb-1">
                        No rooms match that.
                      </p>
                      <p>
                        Clear the filter or{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setFilter('all');
                            setSearchQuery('');
                          }}
                          className="text-[var(--accent-dial)] hover:underline font-semibold cursor-pointer"
                        >
                          show all rooms
                        </button>
                        .
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr
                      key={room.id}
                      className="hover:bg-[var(--bg-subtle)]/40 transition-colors"
                    >
                      {/* Name & Mobile Description */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-semibold text-[var(--text-ink)] text-sm">
                          {room.name}
                        </div>
                        <div className="sm:hidden text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
                          {room.description}
                        </div>
                      </td>

                      {/* Topic (Desktop) */}
                      <td className="py-3.5 px-4 text-xs text-[var(--text-muted)] hidden sm:table-cell max-w-xs truncate">
                        {room.description}
                      </td>

                      {/* People Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-[var(--text-muted)]">
                          <Users className="w-3 h-3 opacity-60" />
                          <span>{room.userCount}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <Link
                          href={`/rooms/${room.id}`}
                          className="min-h-[36px] inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--accent-dial)] hover:text-white text-[var(--text-ink)] border border-[var(--border-line)] hover:border-transparent transition-colors"
                        >
                          Join
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateRoom}
      />
    </div>
  );
}
