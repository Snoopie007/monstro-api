import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas";
import * as adminSchema from "./admin";

declare global {
    var _db: PostgresJsDatabase<typeof schema> & {
        $client: postgres.Sql<{}>;
    }
}


// const createDb = (() => {

//     return () => {
//         if (!global._db) {
//             if (!process.env.DATABASE_URL) {
//                 throw new Error('DATABASE_URL environment variable is required');
//             }
//             const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
//             const drizzleClient = drizzle(client, { schema: schema });
//             global._db = drizzleClient;
//         }
//         return global._db;
//     };
// })();

if (!Bun.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}
const client = postgres(Bun.env.DATABASE_URL, { prepare: false, max: 2 });
const db = drizzle(client, { schema: schema });



if (!Bun.env.DATABASE_ADMIN_URL) {
    throw new Error("DATABASE_ADMIN_URL is missing");
}

const adminConnectionString = Bun.env.DATABASE_ADMIN_URL;

const adminClient = postgres(adminConnectionString, { max: 1 });
const admindb = drizzle(adminClient, { schema: adminSchema, logger: false });


export { db, admindb };