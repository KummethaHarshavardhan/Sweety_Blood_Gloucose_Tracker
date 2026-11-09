import prisma from '../config/db.js';


const SAFE_USER_SELECT = { id: true, name: true, email: true, createdAt: true };

export const findUserByEmail = (email) =>
  prisma.user.findUnique({ where: { email } });

export const findUserById = (id) =>
  prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });

export const createUser = ({ name, email, password }) =>
  prisma.user.create({ data: { name, email, password }, select: SAFE_USER_SELECT });
