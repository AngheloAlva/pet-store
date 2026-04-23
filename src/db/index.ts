import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "@/env";

// Module-level singleton — imported once per serverless function instance.
// env.DATABASE_URL fails fast at import time if the variable is missing.
const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
