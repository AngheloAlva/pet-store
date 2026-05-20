"use client";

import Link from "next/link";

interface SectionTabsProps {
  activeTab: string;
  storeId?: string | null;
}

const TABS = [
  { slug: "citas", label: "Citas" },
  { slug: "stock", label: "Stock" },
  { slug: "clientes", label: "Clientes" },
  { slug: "pedidos", label: "Pedidos" },
];

export function SectionTabs({ activeTab, storeId }: SectionTabsProps) {
  return (
    <nav className="flex gap-1 border-b border-border" role="tablist">
      {TABS.map((tab) => {
        const params = new URLSearchParams();
        if (storeId) params.set("store", storeId);
        params.set("tab", tab.slug);
        const href = `/staff?${params.toString()}`;
        const isActive = activeTab === tab.slug;

        return (
          <Link
            key={tab.slug}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`flex h-14 items-center px-6 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
