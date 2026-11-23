require('dotenv').config();
const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const k of required) {
  if (!process.env[k]) { console.error(`Missing required env var: ${k}`); process.exit(1); }
}
module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI,
  useTransactions: process.env.USE_TRANSACTIONS === 'true',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  shippingFlat: Number(process.env.SHIPPING_FLAT ?? 50),
  freeShippingAbove: Number(process.env.FREE_SHIPPING_ABOVE ?? 1000),
  taxRate: Number(process.env.TAX_RATE ?? 0.05),
};
