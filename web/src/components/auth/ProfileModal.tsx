'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  apiUpdateProfile,
  apiGetFriends,
  apiAddFriend,
  apiRemoveFriend,
  removeAuthToken,
} from '@/lib/auth';
import { setStoredNickname } from '@/lib/session';
import { UserProfile, FriendItem } from '@/types';
import {
  User,
  Users,
  Sparkles,
  Plus,
  Trash2,
  LogOut,
  Check,
  AlertCircle,
  Smile,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
}

const AVATARS = ['🦊', '⚡', '🚀', '🎮', '🎨', '🎧', '🌟', '👾', '🐱', '🔥', '🔮', '🍀'];
const SUGGESTED_TAGS = ['Gaming', 'Music', 'Coding', 'Movies', 'Anime', 'Tech', 'Chill', 'Art', 'Sports'];

export function ProfileModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onLogout,
}: ProfileModalProps) {
  const [tab, setTab] = useState<'profile' | 'friends'>('profile');
  const [nickname, setNickname] = useState(user.nickname);
  const [avatar, setAvatar] = useState(user.avatar || '🦊');
  const [interests, setInterests] = useState<string[]>(user.interests || []);
  const [bio, setBio] = useState(user.bio || '');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Friends state
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [newFriendInput, setNewFriendInput] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNickname(user.nickname);
      setAvatar(user.avatar || '🦊');
      setInterests(user.interests || []);
      setBio(user.bio || '');
      loadFriends();
    }
  }, [isOpen, user]);

  const loadFriends = async () => {
    try {
      const list = await apiGetFriends();
      setFriends(list);
    } catch {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const updated = await apiUpdateProfile({
        nickname: nickname.trim(),
        avatar,
        interests,
        bio: bio.trim(),
      });
      setStoredNickname(updated.nickname);
      onUserUpdated(updated);
      setStatusMsg({ type: 'ok', text: 'Profile saved successfully!' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      setStatusMsg({ type: 'err', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = (tagToAdd?: string) => {
    const tag = (tagToAdd || tagInput).trim();
    if (!tag) return;
    if (interests.length >= 5) {
      alert('Maximum 5 interest tags allowed.');
      return;
    }
    if (!interests.includes(tag)) {
      setInterests([...interests, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setInterests(interests.filter((t) => t !== tagToRemove));
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendInput.trim()) return;
    setAddingFriend(true);
    setStatusMsg(null);
    try {
      await apiAddFriend(newFriendInput.trim());
      setNewFriendInput('');
      await loadFriends();
      setStatusMsg({ type: 'ok', text: 'Friend added to your list!' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not add friend';
      setStatusMsg({ type: 'err', text: msg });
    } finally {
      setAddingFriend(false);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    await apiRemoveFriend(friendshipId);
    setFriends(friends.filter((f) => f.friendshipId !== friendshipId));
  };

  const handleSignOut = () => {
    removeAuthToken();
    onLogout();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account & Profile">
      <div className="space-y-5">
        {/* Tab switch */}
        <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === 'profile'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile & Avatar</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('friends')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === 'friends'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends ({friends.length})</span>
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
              statusMsg.type === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 dark:text-rose-400'
            }`}
          >
            {statusMsg.type === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* TAB 1: PROFILE */}
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Choose Profile Avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    className={`h-11 rounded-xl text-xl flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                      avatar === emoji
                        ? 'bg-[var(--accent-dial)] text-white ring-2 ring-[var(--accent-dial)] ring-offset-2 dark:ring-offset-zinc-900 shadow-md'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Display Nickname
              </label>
              <input
                type="text"
                required
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)]/50"
              />
            </div>

            {/* Interests Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex justify-between">
                <span>Interests (up to 5)</span>
                <span className="text-[10px] text-zinc-400">{interests.length}/5</span>
              </label>

              {/* Tag bubbles */}
              <div className="flex flex-wrap gap-1.5 min-h-8">
                {interests.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--accent-dial-subtle)] text-[var(--accent-dial)] border border-[var(--accent-dial)]/20"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-500 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Tag input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={25}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add custom interest..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)]/50"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag()}
                  className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>

              {/* Suggested Tags */}
              <div className="flex flex-wrap gap-1 pt-1">
                {SUGGESTED_TAGS.filter((t) => !interests.includes(t))
                  .slice(0, 5)
                  .map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleAddTag(t)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                    >
                      +{t}
                    </button>
                  ))}
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Short Bio (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={160}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Say a sentence about yourself..."
                className="w-full px-4 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)]/50 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-xs text-rose-500 hover:underline cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent-dial)] hover:opacity-90 text-white font-medium text-xs shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: FRIENDS */}
        {tab === 'friends' && (
          <div className="space-y-4">
            {/* Add friend form */}
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <input
                type="text"
                required
                value={newFriendInput}
                onChange={(e) => setNewFriendInput(e.target.value)}
                placeholder="Enter exact email or nickname..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-line)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dial)]"
              />
              <button
                type="submit"
                disabled={addingFriend || !newFriendInput.trim()}
                className="px-4 py-2 rounded-xl bg-[var(--accent-dial)] hover:opacity-90 text-white font-medium text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Friends list */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {friends.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 space-y-1">
                  <Smile className="w-8 h-8 mx-auto opacity-50" />
                  <p>No friends added yet.</p>
                  <p className="text-[11px]">Add someone by their registered nickname or email address.</p>
                </div>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.friendshipId}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] text-base flex items-center justify-center">
                        {f.avatar || '🦊'}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {f.nickname}
                        </span>
                        {f.email && (
                          <div className="text-[10px] text-zinc-400">{f.email}</div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveFriend(f.friendshipId)}
                      title="Remove friend"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
