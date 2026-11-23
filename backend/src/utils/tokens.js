const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
exports.signAccess = (user) => jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpires });
exports.signRefresh = (user) => jwt.sign({ sub: user._id.toString(), jti: crypto.randomUUID() }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpires });
exports.verifyAccess = (t) => jwt.verify(t, env.jwt.accessSecret);
exports.verifyRefresh = (t) => jwt.verify(t, env.jwt.refreshSecret);
exports.hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
