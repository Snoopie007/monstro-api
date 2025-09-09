import { Elysia } from 'elysia';
import { supportConversation } from './conversation';
import { supportMessages } from './messages';
export const locationSupport = new Elysia({ prefix: '/support' })

    .group('/conversations/:cid', (app) => {

        app.use(supportConversation)
        app.use(supportMessages)
        return app;

    })
