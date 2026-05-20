import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CustomersPanel } from "./customers-panel";
import type { CustomerRow } from "@/lib/staff/customers";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
}));
vi.mock("./customer-search-input", () => ({
  CustomerSearchInput: ({ query }: { query: string }) => (
    <input data-testid="customer-search" defaultValue={query} />
  ),
}));
vi.mock("./customer-detail-card", () => ({
  CustomerDetailCard: ({ customer }: { customer: CustomerRow }) => (
    <div data-testid={`customer-${customer.id}`}>{customer.name}</div>
  ),
}));

const mockCustomers: CustomerRow[] = [
  { id: "c1", name: "María López", email: "maria@demo.cl", rut: null, phone: null, totalPoints: null },
  { id: "c2", name: "Juan Pérez", email: "juan@demo.cl", rut: "12345678-9", phone: null, totalPoints: null },
];

describe("CustomersPanel", () => {
  it("renders customer list", () => {
    render(<CustomersPanel initialResults={mockCustomers} query="" />);
    expect(screen.getByTestId("customer-c1")).toBeInTheDocument();
    expect(screen.getByTestId("customer-c2")).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
  });

  it("shows empty state with query when no results", () => {
    render(<CustomersPanel initialResults={[]} query="test" />);
    expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
  });

  it("shows prompt when no results and no query", () => {
    render(<CustomersPanel initialResults={[]} query="" />);
    expect(screen.getByText(/ingresá/i)).toBeInTheDocument();
  });
});
