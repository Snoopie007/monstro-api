import { Elysia } from "elysia";

export const publicStripeRoutes = new Elysia({ prefix: '/stripe' })
    .get('/publishable', async ({ status }) => {
        return status(200, { key: process.env.STRIPE_PUBLIC_KEY });
    })      