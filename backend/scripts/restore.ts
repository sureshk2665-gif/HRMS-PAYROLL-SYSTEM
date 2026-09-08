import * as dotenv from 'dotenv';
dotenv.config();

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

function parseDatabaseUrl(url: string) {
  const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:/]+):(\d+)\/([^?]+)/);
  if (!match) {
    throw new Error('Could not parse DATABASE_URL. Expected format: mysql://user:password@host:port/dbname');
  }
  const [, user, encodedPassword, host, port, database] = match;
  return { user, password: decodeURIComponent(encodedPassword), host, port, database };
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

function runMysqlRestore(host: string, port: string, user: string, password: string, database: string, sqlFilePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('mysql', ['-h', host, '-P', port, '-u', user, database], {
      env: { ...process.env, MYSQL_PWD: password },
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    const readStream = fs.createReadStream(sqlFilePath);
    readStream.pipe(child.stdin);

    child.on('error', (err: any) => {
      if (err.code === 'ENOENT') {
        reject(new Error('The mysql command-line client was not found on PATH.'));
      } else {
        reject(err);
      }
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mysql exited with code ${code}`));
    });
  });
}

async function main() {
  const fileArg = process.argv[2];
  const backupsDir = path.resolve(process.env.BACKUPS_DIR || './backups');

  if (!fileArg) {
    console.log('Usage: npm run restore -- <backup-filename-or-path>');
    console.log('');
    const files = fs.existsSync(backupsDir)
      ? fs.readdirSync(backupsDir).filter((f) => f.endsWith('.sql')).sort().reverse()
      : [];
    if (files.length) {
      console.log(`Available backups in ${backupsDir}:`);
      files.forEach((f) => console.log(`  ${f}`));
    } else {
      console.log(`No backups found in ${backupsDir}. Run "npm run backup" first.`);
    }
    process.exit(1);
  }

  const filePath = path.isAbsolute(fileArg) || fileArg.includes(path.sep)
    ? fileArg
    : path.join(backupsDir, fileArg);

  if (!fs.existsSync(filePath)) {
    console.error(`Backup file not found: ${filePath}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.startsWith('mysql://')) {
    console.error('DATABASE_URL is not set to a MySQL connection string.');
    process.exit(1);
  }
  const { user, password, host, port, database } = parseDatabaseUrl(databaseUrl);

  console.log(`This will OVERWRITE all data currently in database "${database}" on ${host}:${port}`);
  console.log(`with the contents of: ${filePath}`);
  const proceed = await confirm('Type "yes" to continue: ');
  if (!proceed) {
    console.log('Cancelled — nothing was changed.');
    process.exit(0);
  }

  console.log('Restoring...');
  try {
    await runMysqlRestore(host, port, user, password, database, filePath);
    console.log('Restore complete.');
    console.log('If the app was running during restore, restart it to pick up the restored data cleanly.');
  } catch (err: any) {
    console.error('Restore failed:', err.message);
    process.exit(1);
  }
}

main();
