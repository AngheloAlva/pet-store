"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { demoEmails } from "@/db/schema";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }
  return user;
}

export async function clearInbox(): Promise<{ ok: true; count: number }> {
  await requireAdmin();

  const deleted = await db.delete(demoEmails).returning({ id: demoEmails.id });

  revalidatePath("/demo/inbox");

  return { ok: true, count: deleted.length };
}
