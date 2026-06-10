require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';

const config = {
  isTest,
  port: process.env.PORT || 4000,
  databaseUrl: isTest
    ? process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/shelfscout_test'
    : process.env.DATABASE_URL || 'postgresql://localhost:5432/shelfscout',
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'test-secret' : null),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8081',
  openaiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
};

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

module.exports = config;
