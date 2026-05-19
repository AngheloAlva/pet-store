export function DemoBanner() {
  return (
    <div
      role="status"
      className="sticky top-16 z-30 w-full bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100 border-b border-amber-200 dark:border-amber-900"
    >
      {/* top-16 matches SiteHeader h-16 — update if header height changes */}
      ⚠️ Demo · los cambios que hagas se reiniciarán periódicamente
    </div>
  );
}
