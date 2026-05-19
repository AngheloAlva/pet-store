import type { USER_ROLES } from "@/db/schema";

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface SessionPayload {
  uid: string;
  role: UserRole;
  exp: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storeId: string | null;
  isDemoSeed: boolean;
}
