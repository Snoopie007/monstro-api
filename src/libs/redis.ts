
import { Redis } from "@upstash/redis";

const getRedisClient = () => {
    if (!process.env.UPSTASH_REDIS_HOST || !process.env.UPSTASH_REDIS_PASSWORD) {
        throw new Error("UPSTASH_REDIS_HOST and UPSTASH_REDIS_PASSWORD must be set in the environment");
    }
    const client = new Redis({
        url: `https://${process.env.UPSTASH_REDIS_HOST}`,
        token: process.env.UPSTASH_REDIS_PASSWORD,
    });
    return client;
};


export {
    getRedisClient
}