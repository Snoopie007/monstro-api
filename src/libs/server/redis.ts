
import { Redis } from "@upstash/redis";
// import { Client } from "@upstash/qstash"

const redis = () => {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in the environment");
    }
    const client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return client;
};

// const getQstashClient = () => {
//     if (!process.env.UPSTASH_QSTASH_REST_TOKEN) {
//         throw new Error("UPSTASH_QSTASH_REST_TOKEN must be set in the environment");
//     }
//     const client = new Client({
//         token: process.env.UPSTASH_QSTASH_REST_TOKEN,
//     });
//     return client;
// }

export {
    redis
}