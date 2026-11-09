import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ApiError } from '../middleware/errorMiddleware.js';
import { createUser, findUserByEmail, findUserById } from '../models/userModel.js';
import {
  createRefreshToken,
  findRefreshTokenByHash,
  revokeFamily,
  revokeTokenIfActive,
} from '../models/refreshTokenModel.js';

const REFRESH_COOKIE = 'sweety_refresh';
const REFRESH_COOKIE_PATH = '/api/auth';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;


const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', BCRYPT_ROUNDS);

const SESSION_ENDED = 'Your session has ended. Please log in again.';

const toSafeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');


export const durationToMs = (value) => {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(String(value).trim());
  if (!match) throw new Error(`Invalid duration "${value}". Use values like 15m or 7d.`);
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * multipliers[match[2].toLowerCase()];
};

const accessExpiry = () => process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const refreshExpiry = () => process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, type: 'access' }, process.env.ACCESS_TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: accessExpiry(),
  });


const issueRefreshToken = async (userId, familyId) => {
  const token = jwt.sign(
    { sub: userId, type: 'refresh', jti: crypto.randomUUID(), fam: familyId },
    process.env.REFRESH_TOKEN_SECRET,
    { algorithm: 'HS256', expiresIn: refreshExpiry() },
  );

  await createRefreshToken({
    userId,
    familyId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + durationToMs(refreshExpiry())),
  });

  return token;
};

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: REFRESH_COOKIE_PATH,
});

const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, {
    ...refreshCookieOptions(),
    maxAge: durationToMs(refreshExpiry()),
  });

const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());


const sessionError = (res, message = SESSION_ENDED) => {
  clearRefreshCookie(res);
  return new ApiError(401, message, 'SESSION_INVALID');
};


export const register = async (req, res) => {
  const name = req.body.name;
  const email = req.body.email.toLowerCase();
  const password = req.body.password;

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await createUser({ name, email, password: passwordHash });
  } catch (err) {
  
    if (err.code === 'P2002') {
      throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_TAKEN');
    }
    throw err;
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: { user: toSafeUser(user) },
  });
};


export const login = async (req, res) => {
  const email = req.body.email.toLowerCase();
  const password = req.body.password;

  const user = await findUserByEmail(email);
  const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, crypto.randomUUID());
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    message: 'Login successful.',
    data: { accessToken, user: toSafeUser(user) },
  });
};


export const refresh = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw sessionError(res);

  let payload;
  try {
    payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw sessionError(res);
  }
  if (payload.type !== 'refresh') throw sessionError(res);

  const tokenHash = hashToken(token);
  const stored = await findRefreshTokenByHash(tokenHash);
  if (!stored || stored.userId !== payload.sub) throw sessionError(res);

  if (stored.revokedAt) {
    await revokeFamily(stored.familyId);
    throw sessionError(res, 'Security check failed. Please log in again.');
  }

  if (stored.expiresAt <= new Date()) throw sessionError(res, 'Your session has expired. Please log in again.');

  const { count } = await revokeTokenIfActive(tokenHash);
  if (count === 0) {
    await revokeFamily(stored.familyId);
    throw sessionError(res, 'Security check failed. Please log in again.');
  }

  const user = await findUserById(payload.sub);
  if (!user) throw sessionError(res);

  const newRefreshToken = await issueRefreshToken(user.id, stored.familyId);
  setRefreshCookie(res, newRefreshToken);

  res.json({
    success: true,
    message: 'Session refreshed.',
    data: { accessToken: signAccessToken(user), user: toSafeUser(user) },
  });
};

export const logout = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await revokeTokenIfActive(hashToken(token));
  }
  clearRefreshCookie(res);

  res.json({ success: true, message: 'Logged out successfully.', data: null });
};


export const me = async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found.', 'USER_NOT_FOUND');

  res.json({ success: true, data: { user } });
};
