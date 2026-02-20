import { config } from 'dotenv'


if (!process.env.BUN_ENV) {
    throw new Error('BUN_ENV must be set in the environment');
}



// Load environment variables based on BUN_ENV
// On Fly/Docker we run from /usr/src/app; BUN_ENV often isn't passed to the process
const inProductionContainer = process.cwd() === '/usr/src/app'
const env = process.env.BUN_ENV === 'production' || inProductionContainer ? 'production' : (process.env.BUN_ENV || 'development')
// Only load .env files in development/local environments
if (env === 'development' || env === 'local') {
    config() // Load .env first
    config({ path: `.env.${env}` }) // Then load environment-specific
    config({ path: '.env.local' }) // Finally load local overrides
}

// Validate required environment variables
const RequireEnv = [
    'UPSTASH_REDIS_HOST',
    'UPSTASH_REDIS_PASSWORD',
    'SUPABASE_JWT_SECRET',
    'SENDGRID_API_KEY',
    'NOVU_API_KEY',
]
for (const ev of RequireEnv) {
    if (!process.env[ev]) {
        throw new Error(`Missing required environment variable: ${ev}`)
    }
}

// Redis configuration
export const redisConfig = {
    host: process.env.UPSTASH_REDIS_HOST,
    port: parseInt(process.env.UPSTASH_REDIS_PORT ?? '6379'),
    password: process.env.UPSTASH_REDIS_PASSWORD,
    tls: {},
    // Retry strategy to prevent negative timeout warnings
    // First retry must be at least 1 second to avoid negative timeout calculations
    retryStrategy: (times: number) => {
        // Ensure first retry is at least 1 second (1000ms)
        // Then use exponential backoff with a max of 30 seconds
        const delay = Math.max(1000, Math.min(times * 100, 30000));
        return delay;
    },
    // Maximum retry attempts before giving up
    maxRetriesPerRequest: null,
    // Connection timeout
    connectTimeout: 10000,
    // Enable offline queue to handle connection issues gracefully
    enableOfflineQueue: false,
}

// Server configuration
export const serverConfig = {
    port: parseInt(process.env.PORT || '3000'),
    environment: env,
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    isLocal: env === 'local',
}

// Queue configuration
export const queueConfig = {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 60 * 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
}
