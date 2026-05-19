import { z } from "zod";

export const updateAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
  // Only attended/no_show allowed via admin updateAppointment;
  // cancellation uses cancelAppointment
  status: z.enum(["attended", "no_show"]),
  notes: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
  cancelReason: z.string().min(1, { message: "Razón de cancelación obligatoria" }),
});

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
  newStartsAt: z.string().datetime(),
  newEndsAt: z.string().datetime(),
});

export type ZodFlatError = z.inferFlattenedErrors<typeof updateAppointmentSchema>;
