import { Elysia, t } from "elysia";
import { testQueue } from "@/queues";
export function testRoutes(app: Elysia) {
    return app.post('/test', async ({ body, status }) => {
        const { subId } = body;

        const today = new Date();
        await testQueue.upsertJobScheduler(
            `testupdate`,
            { pattern: "* * * * *", utc: true }, // every minute
            {
                name: `testupdate`,
                data: {
                    message: 'Hello, world!',
                    count: 0,
                },
                opts: {
                    attempts: 2,
                    removeOnFail: true,
                    removeOnComplete: true,
                    backoff: {
                        type: 'exponential',
                        delay: 1000
                    }
                }
            }
        );


        // const result = await testQueue.removeJobScheduler('testupdate');


        // console.log(result);
        return status(200, {
            message: 'Hello, world!',
        });
    }, {
        body: t.Object({
            subId: t.String(),
        }),
    });
}