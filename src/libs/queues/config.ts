import { config } from "dotenv";

// Load environment variables based on BUN_ENV
const env = process.env.BUN_ENV || 'development';

// Only load .env files in development/local environments
if (env === 'development' || env === 'local') {
    // Load in this order (later files override earlier ones):
    // 1. .env (default values)
    // 2. .env.{environment} (environment-specific values)
    // 3. .env.local (local overrides)
    config(); // Load .env first
    config({ path: `.env.${env}` }); // Then load environment-specific
    config({ path: '.env.local' }); // Finally load local overrides
}

// Validate required environment variables
const RequireEnv = ['UPSTASH_REDIS_HOST', 'UPSTASH_REDIS_REST_TOKEN', 'SUPABASE_JWT_SECRET', 'SENDGRID_API_KEY']
for (const ev of RequireEnv) {
    if (!process.env[ev]) {
        throw new Error(`Missing required environment variable: ${ev}`);
    }
}


// Redis configuration
export const redisConfig = {
    host: process.env.UPSTASH_REDIS_HOST || "localhost",
    port: parseInt(process.env.UPSTASH_REDIS_PORT || "6379"),
    password: process.env.UPSTASH_REDIS_PASSWORD || undefined,
    tls: {}
    // tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    // retryStrategy: (times: number) => {
    //     const delay = Math.min(times * 50, 2000);
    //     return delay;
    // }
};

// Server configuration
export const serverConfig = {
    port: parseInt(process.env.PORT || "3000"),
    environment: env,
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    isLocal: env === 'local'
};

// Queue configuration
export const queueConfig = {

    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
}; 