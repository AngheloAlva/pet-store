import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function CheckoutAuthPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/checkout/entrega");
  }
  redirect("/checkout/entrega");
}
