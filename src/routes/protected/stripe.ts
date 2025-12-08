import Elysia from "elysia"



export const stripeRoutes = new Elysia({ prefix: '/stripe' })

    .get('/publishable', ({ status }) => {



        return status(200, { key: process.env.STRIPE_PUBLIC_KEY })
    })