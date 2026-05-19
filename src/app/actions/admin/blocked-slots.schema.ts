import { z } from "zod";

export const createBlockedSlotSchema = z.object({
  storeId: z.string().min(1, { message: "Store obligatorio" }),
  serviceId: z.string().nullable().optional(),
  startsAt: z.string().datetime({ message: "Fecha de inicio inválida" }),
  endsAt: z.string().datetime({ message: "Fecha de fin inválida" }),
  reason: z.string().optional(),
});

export type ZodFlatError = z.inferFlattenedErrors<typeof createBlockedSlotSchema>;
