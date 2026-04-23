import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

// Will throw a ZodError (containing "DATABASE_URL") at import time if missing.
export const env = envSchema.parse(process.env);
