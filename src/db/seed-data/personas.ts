import type { InferInsertModel } from "drizzle-orm";
import { users, USER_ROLES } from "@/db/schema";

type NewUser = InferInsertModel<typeof users>;

export const personas: NewUser[] = [
  {
    id: "user-camila-demo",
    email: "camila@demo.cl",
    name: "Camila Rojas",
    rut: "17.345.678-9",
    phone: "+56 9 8123 4567",
    role: USER_ROLES.CUSTOMER,
    storeId: null,
    isDemoSeed: true,
    createdAt: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "user-admin-demo",
    email: "admin@demo.cl",
    name: "Admin Demo",
    rut: "12.345.678-5",
    phone: "+56 9 7000 0001",
    role: USER_ROLES.ADMIN,
    storeId: null,
    isDemoSeed: true,
    createdAt: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "user-staff-centro",
    email: "staff@demo.cl",
    name: "Vendedor Sucursal Centro",
    rut: "15.987.654-3",
    phone: "+56 9 6000 1234",
    role: USER_ROLES.STAFF,
    storeId: "providencia",
    isDemoSeed: true,
    createdAt: "2026-01-15T10:00:00.000Z",
  },
];
