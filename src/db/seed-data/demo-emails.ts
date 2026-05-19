import type { InferInsertModel } from "drizzle-orm";
import { demoEmails } from "@/db/schema";
import { subMonths, subDays } from "date-fns";

type NewDemoEmail = InferInsertModel<typeof demoEmails>;

// Fixed base date for deterministic offsets — same as appointments seed
const DEMO_NOW = new Date("2026-05-20T00:00:00.000Z");

// Camila's seed data — matches personas + appointments + points fixtures
const CAMILA_USER_ID = "user-camila-demo";
const CAMILA_EMAIL = "camila@demo.cl";

export const seedDemoEmails: NewDemoEmail[] = [
  // 1. Welcome (oldest — ~6 months ago)
  {
    id: "de-camila-welcome",
    toEmail: CAMILA_EMAIL,
    toUserId: CAMILA_USER_ID,
    subject: "¡Bienvenida, Camila Rojas!",
    type: "welcome",
    bodyHtml: "<p>Hola Camila Rojas, ¡bienvenida a nuestra tienda!</p>",
    bodyText: "Hola Camila Rojas, ¡bienvenida!",
    data: { userName: "Camila Rojas" },
    triggeredBy: null,
    createdAt: subMonths(DEMO_NOW, 6),
  },

  // 2. Appointment confirmation (for upcoming appointment appt-camila-upcoming)
  {
    id: "de-camila-appt-confirm",
    toEmail: CAMILA_EMAIL,
    toUserId: CAMILA_USER_ID,
    subject: "Confirmación de turno — Baño y corte",
    type: "appointment_confirmation",
    bodyHtml: "<p>Tu turno de Baño y corte ha sido confirmado.</p>",
    bodyText: "Tu turno de Baño y corte ha sido confirmado.",
    data: {
      serviceName: "Baño y corte",
      storeName: "Sucursal Providencia",
      userName: "Camila Rojas",
    },
    triggeredBy: null,
    createdAt: subDays(DEMO_NOW, 4),
  },

  // 3. Points adjustment (matches ptx-camila-6: +200 "Compensación por error en caja")
  {
    id: "de-camila-points-adj",
    toEmail: CAMILA_EMAIL,
    toUserId: CAMILA_USER_ID,
    subject: "Ajuste de puntos — +200 puntos",
    type: "points_adjustment",
    bodyHtml: "<p>Se realizó un ajuste de +200 puntos. Motivo: Compensación por error en caja.</p>",
    bodyText: "Ajuste de +200 puntos. Motivo: Compensación por error en caja.",
    data: { userName: "Camila Rojas", delta: 200, reason: "Compensación por error en caja" },
    triggeredBy: "user-admin-demo",
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
  },

  // 4. Restock alert (pick Acana product from fixtures — use a known product id)
  {
    id: "de-camila-restock",
    toEmail: CAMILA_EMAIL,
    toUserId: CAMILA_USER_ID,
    subject: "Reposición de stock — Acana Pollo y Pavo",
    type: "restock_alert",
    bodyHtml: "<p>¡El producto Acana Pollo y Pavo está disponible nuevamente!</p>",
    bodyText: "Acana Pollo y Pavo está disponible nuevamente en Sucursal Providencia.",
    data: { productName: "Acana Pollo y Pavo", storeName: "Sucursal Providencia" },
    triggeredBy: null,
    createdAt: subDays(DEMO_NOW, 10),
  },

  // 5. Appointment canceled (for historical appointment appt-staff-1 via admin context)
  {
    id: "de-camila-appt-canceled",
    toEmail: CAMILA_EMAIL,
    toUserId: CAMILA_USER_ID,
    subject: "Turno cancelado — Consulta veterinaria",
    type: "appointment_canceled",
    bodyHtml: "<p>Tu turno de Consulta veterinaria ha sido cancelado.</p>",
    bodyText: "Tu turno de Consulta veterinaria ha sido cancelado.",
    data: {
      serviceName: "Consulta veterinaria",
      storeName: "Sucursal Providencia",
      userName: "Camila Rojas",
    },
    triggeredBy: "user-admin-demo",
    createdAt: subDays(DEMO_NOW, 20),
  },
];
