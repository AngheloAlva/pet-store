import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/admin/categories", () => ({
  loadCategoriesFlat: vi.fn(async () => [
    { id: "p1", slug: "alimentos", name: "Alimentos", parentId: null, species: null, order: 0 },
    { id: "c1", slug: "humedo", name: "Húmedo", parentId: "p1", species: null, order: 0 },
    { id: "p2", slug: "accesorios", name: "Accesorios", parentId: null, species: null, order: 1 },
  ]),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  arrayMove: <T,>(arr: T[], from: number, to: number): T[] => {
    const next = [...arr];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    return next;
  },
  useSortable: () => ({
    setNodeRef: vi.fn(),
    attributes: {},
    listeners: {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: undefined,
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  closestCenter: undefined,
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/actions/admin/categories", () => ({
  reorderCategories: vi.fn(async () => ({ ok: true })),
  createCategory: vi.fn(async () => ({ ok: true, id: "new-id" })),
  updateCategory: vi.fn(async () => ({ ok: true })),
  deleteCategory: vi.fn(async () => ({ ok: true })),
}));

import CategoriasPage from "../page";

describe("CategoriasPage", () => {
  it("renders parent + children sorted correctly (S1)", async () => {
    const jsx = await CategoriasPage();
    render(jsx);

    expect(screen.getByText("Alimentos")).toBeInTheDocument();
    expect(screen.getByText("Húmedo")).toBeInTheDocument();
    expect(screen.getByText("Accesorios")).toBeInTheDocument();
  });

  it("renders 'Agregar categoría' button", async () => {
    const jsx = await CategoriasPage();
    render(jsx);

    expect(
      screen.getByRole("button", { name: /agregar categoría/i }),
    ).toBeInTheDocument();
  });
});
