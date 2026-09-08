import * as dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { prisma } from './config/prisma';
import { startNotificationCronJobs } from './services/cron.service';

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await prisma.$connect();
    console.log('Database connected.');

    app.listen(PORT, () => {
      console.log(`HRMS backend running on http://localhost:${PORT}`);
    });

    startNotificationCronJobs();
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
