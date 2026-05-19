"use client";

import { clearInbox } from "@/app/actions/demo/clear-inbox";

interface ClearInboxButtonProps {
  isAdmin: boolean;
}

export default function ClearInboxButton({ isAdmin }: ClearInboxButtonProps) {
  return (
    <form action={clearInbox as unknown as (formData: FormData) => Promise<void>}>
      <button
        type="submit"
        disabled={!isAdmin}
        aria-disabled={!isAdmin}
        title={!isAdmin ? "Necesitás ser admin" : undefined}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Limpiar inbox
      </button>
    </form>
  );
}
