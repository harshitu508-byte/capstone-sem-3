const dns = require('node:dns'); 

dns.setServers(['8.8.8.8', '8.8.4.4']);const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');
module.exports = async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  logger.info(`MongoDB connected (transactions: ${env.useTransactions ? 'on' : 'off'})`);
};
