import { Elysia } from "elysia";

export function RateLimitMiddleware() {
    const requests = new Map<string, number[]>();

    return new Elysia().onBeforeHandle(({ headers, set }) => {

        const ip = headers['x-forwarded-for'] || 'unknown';
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute
        const maxRequests = 10;

        if (!requests.has(ip)) {
            requests.set(ip, []);
        }

        const userRequests = requests.get(ip)!;
        // Remove old requests outside the window
        const validRequests = userRequests.filter(time => now - time < windowMs);

        if (validRequests.length >= maxRequests) {
            set.status = 429;
            return { error: 'Too many requests' };
        }

        validRequests.push(now);
        requests.set(ip, validRequests);
    });
}
