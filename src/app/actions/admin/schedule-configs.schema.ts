import { z } from "zod";

export const createScheduleConfigSchema = z.object({
  storeId: z.string().min(1, { message: "Store obligatorio" }),
  serviceId: z.string().nullable().optional(),
  weekday: z.number().int().min(0).max(6, { message: "Weekday 0–6" }),
  startHHMM: z.number().int().min(0).max(2359),
  endHHMM: z.number().int().min(0).max(2359),
  slotMinutes: z.number().int().positive(),
  active: z.boolean().optional().default(true),
});

export const updateScheduleConfigSchema = createScheduleConfigSchema;

export type ZodFlatError = z.inferFlattenedErrors<typeof createScheduleConfigSchema>;
