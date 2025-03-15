import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas";
import { createClient } from "@supabase/supabase-js";


import { Database } from "@/types";
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
}

const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema: schema, logger: false });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL or SUPABASE_KEY is missing");
}


const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);



export { db, supabase };