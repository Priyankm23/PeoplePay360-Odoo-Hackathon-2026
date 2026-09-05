require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DB_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/odoo_hackathon_2026?schema=public'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters long').default('super_secret_jwt_key_for_hackathon_development_only'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

module.exports = parsed.data;
