import { db } from "@/db";
import { demoEmails } from "@/db/schema";
import { desc, inArray, like } from "drizzle-orm";
import { and } from "drizzle-orm";
import type { DemoEmailType } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import ClearInboxButton from "./clear-inbox-button";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DemoInboxPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const typeParam = typeof params.type === "string" ? params.type : undefined;
  const qParam = typeof params.q === "string" ? params.q : undefined;

  const filters = [];
  if (typeParam) {
    const types = typeParam.split(",").filter(Boolean) as DemoEmailType[];
    if (types.length > 0) {
      filters.push(inArray(demoEmails.type, types));
    }
  }
  if (qParam && qParam.trim()) {
    filters.push(like(demoEmails.toEmail, `%${qParam.trim()}%`));
  }

  const rows = await db
    .select()
    .from(demoEmails)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(demoEmails.createdAt))
    .limit(100);

  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bandeja de correos demo</h1>
            <p className="mt-1 text-sm text-gray-500">{rows.length} correo(s)</p>
          </div>
          <ClearInboxButton isAdmin={isAdmin} />
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-gray-500">Tu bandeja está vacía</p>
            <p className="mt-1 text-sm text-gray-400">Los correos generados por el sistema aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <EmailRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EmailRowProps {
  row: typeof demoEmails.$inferSelect;
}

function EmailRow({ row }: EmailRowProps) {
  const dateStr = row.createdAt.toLocaleString("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <details className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer items-center gap-3 p-4 hover:bg-gray-50">
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
          {row.type}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-gray-900">{row.subject}</span>
        <span className="hidden text-sm text-gray-500 md:block">{row.toEmail}</span>
        <span className="text-xs text-gray-400">{dateStr}</span>
      </summary>
      <div className="border-t border-gray-100 p-4">
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span><strong>Para:</strong> {row.toEmail}</span>
          {row.triggeredBy && <span><strong>Por:</strong> {row.triggeredBy}</span>}
        </div>
        <iframe
          srcDoc={row.bodyHtml}
          sandbox="allow-same-origin"
          className="h-96 w-full rounded border border-gray-200"
          title={`Email: ${row.subject}`}
        />
      </div>
    </details>
  );
}
