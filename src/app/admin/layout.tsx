import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { DemoBanner } from "@/components/admin/demo-banner";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  return (
    <>
      <DemoBanner />
      <div className="flex flex-col md:flex-row">
        <AdminSidebar />
        <div className="flex-1 p-6">{children}</div>
      </div>
    </>
  );
}
