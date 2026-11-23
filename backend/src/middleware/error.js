const logger = require('../utils/logger');
const env = require('../config/env');
exports.notFound = (req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
exports.errorHandler = (err, req, res, next) => { // eslint-disable-line
  let status = err.status || 500;
  let message = err.message || 'Server error';
  let details = err.details;
  if (err.name === 'ValidationError' && err.errors) { status = 400; message = 'Validation failed'; details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })); }
  else if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  else if (err.code === 11000) { status = 409; message = `Duplicate value for: ${Object.keys(err.keyPattern || {}).join(', ')}`; }
  if (status >= 500) { logger.error(err.stack || err); if (env.nodeEnv === 'production') message = 'Internal server error'; }
  else logger.warn(`${req.method} ${req.originalUrl} -> ${status} ${message}`);
  res.status(status).json({ success: false, message, ...(details ? { errors: details } : {}) });
};
