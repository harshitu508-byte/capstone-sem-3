const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyAccess } = require('../utils/tokens');
const logger = require('../utils/logger');
let io = null;
exports.init = (httpServer) => {
  io = new Server(httpServer, { cors: { origin: env.clientUrl, credentials: true } });
  io.use((socket, next) => {
    try { const p = verifyAccess(socket.handshake.auth?.token); socket.userId = p.sub; socket.role = p.role; next(); }
    catch { next(new Error('Unauthorized')); }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    if (socket.role === 'admin') socket.join('admins');
    logger.debug(`socket connected user=${socket.userId}`);
  });
  return io;
};
exports.emitToUser = (userId, event, payload) => { if (io) io.to(`user:${userId}`).emit(event, payload); };
exports.emitToAdmins = (event, payload) => { if (io) io.to('admins').emit(event, payload); };
