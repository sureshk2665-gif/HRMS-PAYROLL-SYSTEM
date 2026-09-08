import * as dotenv from 'dotenv';
dotenv.config();

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

/**
 * Parses a Prisma-style DATABASE_URL (mysql://user:pass@host:port/dbname)
 * into its parts. Kept local to this script rather than a shared util
 * since backup/restore are the only things that need raw connection
 * details outside of Prisma itself.
 */
function parseDatabaseUrl(url: string) {
  const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:/]+):(\d+)\/([^?]+)/);
  if (!match) {
    throw new Error('Could not parse DATABASE_URL. Expected format: mysql://user:password@host:port/dbname');
  }
  const [, user, encodedPassword, host, port, database] = match;
  return { user, password: decodeURIComponent(encodedPassword), host, port, database };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }
  if (!databaseUrl.startsWith('mysql://')) {
    console.error('This backup script only supports MySQL. If you switched to SQLite for local dev,');
    console.error('just copy the .db file directly instead — there is no dump tool needed for that.');
    process.exit(1);
  }

  const { user, password, host, port, database } = parseDatabaseUrl(databaseUrl);

  const backupsDir = path.resolve(process.env.BACKUPS_DIR || './backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(backupsDir, `${database}-${timestamp}.sql`);

  console.log(`Backing up database "${database}" from ${host}:${port} ...`);

  try {
    // Password is passed via MYSQL_PWD env var rather than a CLI flag so it
    // never shows up in `ps` output or shell history.
    const { stdout } = await execFileAsync(
      'mysqldump',
      ['-h', host, '-P', port, '-u', user, '--single-transaction', '--routines', '--triggers', database],
      { env: { ...process.env, MYSQL_PWD: password }, maxBuffer: 1024 * 1024 * 1024 }
    );
    fs.writeFileSync(outFile, stdout);
    const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1);
    console.log(`Backup complete: ${outFile} (${sizeKb} KB)`);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      console.error('mysqldump was not found on PATH.');
      console.error('On Windows, add the MySQL "bin" folder to your PATH (the same one used for the mysql command),');
      console.error('e.g. C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin');
    } else {
      console.error('Backup failed:', err.message);
    }
    process.exit(1);
  }

  pruneOldBackups(backupsDir, database);
}

/**
 * Keeps only the most recent N backups for this database so the backups
 * folder doesn't grow forever on an automated schedule. Configurable via
 * BACKUP_RETENTION_COUNT in .env (default 14 — roughly two weeks of daily
 * backups).
 */
function pruneOldBackups(backupsDir: string, database: string) {
  const retentionCount = Number(process.env.BACKUP_RETENTION_COUNT) || 14;
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith(`${database}-`) && f.endsWith('.sql'))
    .map((f) => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  const toDelete = files.slice(retentionCount);
  for (const file of toDelete) {
    fs.unlinkSync(path.join(backupsDir, file.name));
    console.log(`Pruned old backup: ${file.name}`);
  }
}

main();
