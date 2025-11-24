import { Elysia } from "elysia";
import { commentReplies } from "./replies";
import { commentPosts } from "./posts";


export const commentRoutes = new Elysia({ prefix: 'comments' })
    .group('/post/:pid', (app) => {
        app.use(commentPosts);
        return app;
    })
    .group('/:cid', (app) => {
        app.use(commentReplies);
        return app;
    })
