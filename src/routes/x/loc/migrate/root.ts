import { Elysia } from "elysia";
import { migrationAnalyze } from "./analyze";

export const xMigrations = new Elysia({ prefix: "/migration" })
    .use(migrationAnalyze);
