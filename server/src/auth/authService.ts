import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { sanitizeNickname } from '../utils/sanitize';

const prisma = new PrismaClient();

// In-memory token store for authenticated user sessions
const userSessions = new Map<string, { userId: string; email?: string; nickname: string; createdAt: number }>();

/** Hash password using Node.js crypto.scryptSync */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/** Verify password against salt:hash */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/** Create secure bearer token */
export function createSessionToken(userId: string, email: string | null, nickname: string): string {
  const token = `usr_${crypto.randomBytes(24).toString('hex')}`;
  userSessions.set(token, {
    userId,
    email: email || undefined,
    nickname,
    createdAt: Date.now(),
  });
  return token;
}

export function getUserByToken(token: string) {
  return userSessions.get(token);
}

/**
 * Register a new user account with email & password.
 */
export async function registerWithEmail(params: {
  email: string;
  password: string;
  nickname: string;
  avatar?: string;
  interests?: string[];
}) {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanNick = sanitizeNickname(params.nickname || cleanEmail.split('@')[0]);

  if (!cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!params.password || params.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const existing = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const passwordHash = hashPassword(params.password);
  const user = await prisma.user.create({
    data: {
      email: cleanEmail,
      passwordHash,
      nickname: cleanNick,
      avatar: params.avatar || 'avatar_1',
      interests: JSON.stringify(params.interests || []),
    },
  });

  const token = createSessionToken(user.id, user.email, user.nickname);
  logger.info(`User registered: ${user.email} (${user.id})`);

  return {
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      interests: params.interests || [],
      bio: user.bio,
    },
    token,
  };
}

/**
 * Login with email and password.
 */
export async function loginWithEmail(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (!user || !user.passwordHash) {
    throw new Error('Invalid email or password.');
  }

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  const token = createSessionToken(user.id, user.email, user.nickname);
  let interests: string[] = [];
  try {
    interests = user.interests ? JSON.parse(user.interests) : [];
  } catch {}

  return {
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      interests,
      bio: user.bio,
    },
    token,
  };
}

/**
 * Google Auth handler (supports real or mock/test Google authentication)
 */
export async function authenticateGoogle(params: {
  googleId: string;
  credential?: string;
  email: string;
  nickname: string;
  avatar?: string;
}) {
  let verifiedEmail = params.email.trim().toLowerCase();
  let verifiedGoogleId = params.googleId;

  // If a Google ID token credential was provided, verify it with Google's API
  if (params.credential) {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(params.credential)}`);
      if (res.ok) {
        const payload = (await res.json()) as { email?: string; sub?: string; email_verified?: string | boolean };
        if (payload.email && (payload.email_verified === 'true' || payload.email_verified === true)) {
          verifiedEmail = payload.email.toLowerCase();
          verifiedGoogleId = payload.sub || params.googleId;
        } else {
          throw new Error('Google email is not verified.');
        }
      } else {
        throw new Error('Invalid Google credential token.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google credential verification failed';
      logger.error('Google token verification error:', err);
      throw new Error(msg);
    }
  } else if (process.env.NODE_ENV === 'production') {
    // In production, reject unverified Google sign-in attempts
    throw new Error('Google ID token is required for authentication.');
  }

  const cleanNick = sanitizeNickname(params.nickname);

  // In secure mode, match strictly by googleId first
  let user = await prisma.user.findUnique({
    where: { googleId: verifiedGoogleId },
  });

  if (!user && verifiedEmail) {
    // Only link to an existing email account if the token was cryptographically verified
    if (params.credential) {
      const existing = await prisma.user.findUnique({ where: { email: verifiedEmail } });
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { googleId: verifiedGoogleId },
        });
      }
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId: verifiedGoogleId,
        email: verifiedEmail || null,
        nickname: cleanNick,
        avatar: params.avatar || 'avatar_google',
        interests: JSON.stringify(['Tech', 'Gaming']),
      },
    });
  }

  const token = createSessionToken(user.id, user.email, user.nickname);
  let interests: string[] = [];
  try {
    interests = user.interests ? JSON.parse(user.interests) : [];
  } catch {}

  return {
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      interests,
      bio: user.bio,
    },
    token,
  };
}

/**
 * Update user profile (nickname, avatar, interests, bio)
 */
export async function updateUserProfile(
  userId: string,
  data: { nickname?: string; avatar?: string; interests?: string[]; bio?: string }
) {
  const updateData: { nickname?: string; avatar?: string; interests?: string; bio?: string } = {};
  if (data.nickname) updateData.nickname = sanitizeNickname(data.nickname);
  if (data.avatar) updateData.avatar = data.avatar;
  if (data.interests) updateData.interests = JSON.stringify(data.interests.slice(0, 5));
  if (data.bio !== undefined) updateData.bio = data.bio.slice(0, 200);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  let interests: string[] = [];
  try {
    interests = updated.interests ? JSON.parse(updated.interests) : [];
  } catch {}

  return {
    id: updated.id,
    email: updated.email,
    nickname: updated.nickname,
    avatar: updated.avatar,
    interests,
    bio: updated.bio,
  };
}

/**
 * Friends Management
 */
export async function getFriendsList(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userId }, { friendId: userId }],
      status: 'accepted',
    },
    include: {
      user: true,
      friend: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return friendships.map((f) => {
    const friend = f.userId === userId ? f.friend : f.user;
    return {
      friendshipId: f.id,
      friendId: friend.id,
      nickname: friend.nickname,
      avatar: friend.avatar,
      createdAt: f.createdAt,
    };
  });
}

export async function addFriend(userId: string, targetIdentifier: string) {
  const clean = targetIdentifier.trim().toLowerCase();
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: clean }, { nickname: { equals: targetIdentifier.trim() } }],
    },
  });

  if (!targetUser) {
    throw new Error('User not found. Enter an exact registered email or nickname.');
  }

  if (targetUser.id === userId) {
    throw new Error('You cannot add yourself as a friend.');
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId: targetUser.id },
        { userId: targetUser.id, friendId: userId },
      ],
    },
  });

  if (existing) {
    throw new Error('You are already friends with this user.');
  }

  return prisma.friendship.create({
    data: {
      userId,
      friendId: targetUser.id,
      status: 'accepted',
    },
  });
}

export async function removeFriend(userId: string, friendshipId: string) {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });
  if (friendship && (friendship.userId === userId || friendship.friendId === userId)) {
    await prisma.friendship.delete({ where: { id: friendshipId } });
  }
}
