import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas";
import * as adminSchema from "./admin";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types";


declare global {
    var _db: PostgresJsDatabase<typeof schema> & {
        $client: postgres.Sql<{}>;
    }
}

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
}




const createDb = (() => {
    return () => {
        if (!global._db) {
            if (!process.env.DATABASE_URL) {
                throw new Error('DATABASE_URL environment variable is required');
            }
            const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
            const drizzleClient = drizzle(client, { schema: schema });
            global._db = drizzleClient;
        }
        return global._db;
    };
})();

const db = createDb();


if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL or SUPABASE_KEY is missing");
}


const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

if (!process.env.DATABASE_ADMIN_URL) {
    throw new Error("DATABASE_ADMIN_URL is missing");
}

const adminConnectionString = process.env.DATABASE_ADMIN_URL;

const adminClient = postgres(adminConnectionString, { max: 1 });
const admindb = drizzle(adminClient, { schema: adminSchema, logger: false });



export { db, supabase, admindb };