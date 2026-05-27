import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { CuentaSidebar } from "@/components/cuenta/cuenta-sidebar";

interface CuentaLayoutProps {
  children: React.ReactNode;
}

export default async function CuentaLayout({ children }: CuentaLayoutProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <CuentaSidebar />
      <main className="flex-1 p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
