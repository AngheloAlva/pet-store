import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionTabs } from "./section-tabs";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
  usePathname: vi.fn(() => "/staff"),
}));

describe("SectionTabs", () => {
  it("renders 4 tabs: Citas, Stock, Clientes, Pedidos", () => {
    render(<SectionTabs activeTab="citas" storeId="providencia" />);
    expect(screen.getByText("Citas")).toBeInTheDocument();
    expect(screen.getByText("Stock")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Pedidos")).toBeInTheDocument();
  });

  it("active tab has aria-selected=true", () => {
    render(<SectionTabs activeTab="stock" storeId="providencia" />);
    const stockTab = screen.getByRole("tab", { name: "Stock" });
    expect(stockTab).toHaveAttribute("aria-selected", "true");
  });

  it("inactive tabs have aria-selected=false", () => {
    render(<SectionTabs activeTab="citas" storeId="providencia" />);
    const stockTab = screen.getByRole("tab", { name: "Stock" });
    expect(stockTab).toHaveAttribute("aria-selected", "false");
  });

  it("tab links include ?store=providencia param", () => {
    render(<SectionTabs activeTab="citas" storeId="providencia" />);
    const stockTab = screen.getByRole("tab", { name: "Stock" });
    expect(stockTab).toHaveAttribute("href", expect.stringContaining("store=providencia"));
  });

  it("tab links include ?tab= param", () => {
    render(<SectionTabs activeTab="citas" storeId="providencia" />);
    const stockTab = screen.getByRole("tab", { name: "Stock" });
    expect(stockTab).toHaveAttribute("href", expect.stringContaining("tab=stock"));
  });
});
