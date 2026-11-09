import prisma from '../config/db.js';


export const createRefreshToken = (data) =>
  prisma.refreshToken.create({ data });

export const findRefreshTokenByHash = (tokenHash) =>
  prisma.refreshToken.findUnique({ where: { tokenHash } });


export const revokeTokenIfActive = (tokenHash) =>
  prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

// Used when a revoked token is reused: every token in that login session is revoked
export const revokeFamily = (familyId) =>
  prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
