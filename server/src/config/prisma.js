const { PrismaClient } = require('@prisma/client');
const config = require('./env');

const prisma = new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

module.exports = prisma;
