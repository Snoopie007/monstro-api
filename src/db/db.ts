import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@subtrees/schemas";
import * as adminSchema from "./admin";

declare global {
	var _db: PostgresJsDatabase<typeof schema> & {
		$client: postgres.Sql<{}>;
	};
}

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is missing");
}

const createDb = (() => {
	return () => {
		if (!globalThis._db) {
			if (!process.env.DATABASE_URL) {
				throw new Error("DATABASE_URL environment variable is required");
			}
			const client = postgres(process.env.DATABASE_URL, {
				prepare: false,
				max: 2,
			});
			const drizzleClient = drizzle(client, { schema: schema });
			globalThis._db = drizzleClient;
		}
		return globalThis._db;
	};
})();

const db = createDb();

if (!process.env.DATABASE_ADMIN_URL) {
	throw new Error("DATABASE_ADMIN_URL is missing");
}

const adminConnectionString = process.env.DATABASE_ADMIN_URL;

const adminClient = postgres(adminConnectionString, { max: 1 });
const admindb = drizzle(adminClient, { schema: adminSchema, logger: false });

export { db, admindb };
