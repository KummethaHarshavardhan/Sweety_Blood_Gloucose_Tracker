import jwt from 'jsonwebtoken';
import { ApiError } from './errorMiddleware.js';

export const requireAuth = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Please log in to continue.', 'AUTH_REQUIRED'));
  }

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithms: ['HS256'] });
    if (payload.type !== 'access' || !payload.sub) {
      throw new Error('Wrong token type');
    }
    req.user = { id: payload.sub };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Your session has expired.', 'TOKEN_EXPIRED'));
    }
    return next(new ApiError(401, 'Invalid access token.', 'TOKEN_INVALID'));
  }
};

// Refresh and logout use an HttpOnly cookie, so require an explicit trusted browser Origin.
export const requireTrustedOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!origin || !allowedOrigins.includes(origin)) {
    return next(new ApiError(403, 'Request origin is not allowed.', 'ORIGIN_FORBIDDEN'));
  }
  return next();
};
