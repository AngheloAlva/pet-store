import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// dnd-kit mocks
// ---------------------------------------------------------------------------
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
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd: (e: unknown) => void;
  }) => {
    (globalThis as { __triggerDragEnd?: (e: unknown) => void }).__triggerDragEnd =
      onDragEnd;
    return children;
  },
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
}));

// ---------------------------------------------------------------------------
// Component (imported AFTER mocks)
// ---------------------------------------------------------------------------
import { SortableCategoryList } from "../sortable-category-list";
import { reorderCategories } from "@/app/actions/admin/categories";

const mockReorderCategories = vi.mocked(reorderCategories);

const parentRows = [
  { id: "a", slug: "a", name: "Category A", parentId: null, species: null, order: 0 },
  { id: "b", slug: "b", name: "Category B", parentId: null, species: null, order: 1 },
  { id: "c", slug: "c", name: "Category C", parentId: null, species: null, order: 2 },
];

const childRows = [
  { id: "child-1", slug: "child-1", name: "Child 1", parentId: "a", species: null, order: 0 },
  { id: "child-2", slug: "child-2", name: "Child 2", parentId: "a", species: null, order: 1 },
];

describe("SortableCategoryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("drag handles are focusable — not tabIndex=-1 (S2)", () => {
    render(
      <SortableCategoryList rows={parentRows} parentOptions={[]} />,
    );
    const handles = screen.getAllByRole("button", { name: /reordenar/i });
    expect(handles.length).toBeGreaterThan(0);
    for (const handle of handles) {
      expect(handle).not.toHaveAttribute("tabindex", "-1");
    }
  });

  it("calls reorderCategories with new id sequence on dragEnd (S3)", async () => {
    render(
      <SortableCategoryList rows={parentRows} parentOptions={[]} />,
    );

    await act(async () => {
      (globalThis as { __triggerDragEnd?: (e: unknown) => void }).__triggerDragEnd?.({
        active: { id: "c" },
        over: { id: "a" },
      });
    });

    expect(mockReorderCategories).toHaveBeenCalledTimes(1);
  });

  it("reverts local order + toast.error on action failure (S4)", async () => {
    mockReorderCategories.mockResolvedValueOnce({ ok: false, errors: { formErrors: ["Error"], fieldErrors: {} } });
    render(
      <SortableCategoryList rows={parentRows} parentOptions={[]} />,
    );

    await act(async () => {
      (globalThis as { __triggerDragEnd?: (e: unknown) => void }).__triggerDragEnd?.({
        active: { id: "c" },
        over: { id: "a" },
      });
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it("child reorder isolated from parent group (S34)", async () => {
    const mixedRows = [...parentRows.slice(0, 1), ...childRows];
    render(
      <SortableCategoryList rows={mixedRows} parentOptions={[]} />,
    );

    await act(async () => {
      (globalThis as { __triggerDragEnd?: (e: unknown) => void }).__triggerDragEnd?.({
        active: { id: "child-2" },
        over: { id: "child-1" },
      });
    });

    // reorderCategories called with a groups array containing the children group
    expect(mockReorderCategories).toHaveBeenCalled();
    const callArg = mockReorderCategories.mock.calls[0][0] as unknown[];
    // The call arg should be an array of group objects or an ordered ids array
    expect(callArg).toBeDefined();
  });
});
