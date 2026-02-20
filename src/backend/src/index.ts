import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from './config/index.js';
import { initDb } from './models/index.js';
import { registerRoutes } from './routes/api.js';
import { jobService } from './services/job.js';

async function main() {
  // Initialize database
  await initDb();

  // Create Fastify instance with SSL
  const app = Fastify({
    https: {
      key: config.ssl.key,
      cert: config.ssl.cert,
      ca: config.ssl.ca,
    },
    logger: true,
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: config.upload.maxFileSize,
    },
  });

  // Register routes
  await registerRoutes(app);

  // Start overdue job checker (every minute)
  setInterval(() => {
    jobService.checkOverdueJobs().catch(console.error);
  }, 60 * 1000);

  // Start pending submission retry (every 5 minutes)
  setInterval(() => {
    jobService.retryPendingSubmissions().catch(console.error);
  }, 5 * 60 * 1000);

  // Retry blockchain writes for approved submissions stuck in WaitOnChainApprove (every 3 minutes)
  setInterval(() => {
    jobService.retryWaitOnChainApprove().catch(console.error);
  }, config.jobVerification.retryTimeoutMs);

  // Start server
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Server running at https://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
