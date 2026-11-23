const http = require('http');
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const app = require('./app');
const { init } = require('./sockets');
const registerListeners = require('./services/listeners');

(async () => {
  await connectDB();
  const server = http.createServer(app);
  init(server);
  registerListeners();
  server.listen(env.port, () => logger.info(`API listening on :${env.port} (${env.nodeEnv})`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
})().catch((e) => { logger.error('Startup failed', e); process.exit(1); });
