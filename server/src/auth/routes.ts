import { Router, Request, Response } from 'express';
import {
  registerWithEmail,
  loginWithEmail,
  authenticateGoogle,
  getUserByToken,
  updateUserProfile,
  getFriendsList,
  addFriend,
  removeFriend,
} from './authService';
import { logger } from '../utils/logger';

const router = Router();

/** Simple token auth middleware */
function requireAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const session = getUserByToken(token);
  if (!session) {
    res.status(401).json({ error: 'Session expired or invalid token' });
    return;
  }
  (req as Request & { user: typeof session }).user = session;
  next();
}

/** POST /api/auth/register — Email registration */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, nickname, avatar, interests } = req.body;
    const result = await registerWithEmail({ email, password, nickname, avatar, interests });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

/** POST /api/auth/login — Email login */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const result = await loginWithEmail(email, password);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

/** POST /api/auth/google — Google Sign-In */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { googleId, email, nickname, avatar, credential } = req.body;
    if (!googleId || !email) {
      res.status(400).json({ error: 'Google ID and email are required' });
      return;
    }
    const result = await authenticateGoogle({ googleId, email, nickname, avatar, credential });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google authentication failed';
    res.status(400).json({ error: message });
  }
});

/** GET /api/auth/me — Get current user profile */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as Request & { user: { userId: string; email?: string; nickname: string } }).user;
  res.json({ user });
});

/** PUT /api/auth/profile — Update profile */
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { userId: string } }).user;
    const updated = await updateUserProfile(user.userId, req.body);
    res.json({ user: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    res.status(400).json({ error: message });
  }
});

/** GET /api/auth/friends — List friends */
router.get('/friends', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { userId: string } }).user;
    const friends = await getFriendsList(user.userId);
    res.json({ friends });
  } catch (err) {
    logger.error('Error fetching friends list', err);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

/** POST /api/auth/friends — Add friend by email or nickname */
router.post('/friends', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { userId: string } }).user;
    const { identifier } = req.body;
    if (!identifier) {
      res.status(400).json({ error: 'Enter friend email or nickname' });
      return;
    }
    const result = await addFriend(user.userId, identifier);
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add friend';
    res.status(400).json({ error: message });
  }
});

/** DELETE /api/auth/friends/:id — Remove friend */
router.delete('/friends/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { userId: string } }).user;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await removeFriend(user.userId, id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

export default router;
