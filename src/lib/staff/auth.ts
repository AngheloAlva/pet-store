import "server-only";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types/session";

export async function requireStaffOrAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "staff" && user.role !== "admin")) {
    redirect("/");
  }
  return user;
}
