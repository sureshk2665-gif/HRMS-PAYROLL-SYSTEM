import { PrismaClient } from '@prisma/client';
import path from 'path';

// SQLite: Prisma CLI resolves file:./dev.db relative to the schema file
// (prisma/), but the Node runtime resolves it relative to CWD (backend/).
// Fix: override DATABASE_URL at runtime to point to the correct location.
if (process.env.DATABASE_URL?.startsWith('file:')) {
  const dbFile = process.env.DATABASE_URL.replace('file:', '');
  const absPath = path.resolve(__dirname, '../../prisma', path.basename(dbFile));
  process.env.DATABASE_URL = `file:${absPath}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
