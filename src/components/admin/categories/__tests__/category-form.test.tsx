import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/actions/admin/categories", () => ({
  createCategory: vi.fn(async () => ({ ok: true, id: "new-id" })),
  updateCategory: vi.fn(async () => ({ ok: true })),
}));

import { CategoryEditDialog } from "../category-edit-dialog";
import { createCategory } from "@/app/actions/admin/categories";

const mockCreateCategory = vi.mocked(createCategory);

describe("CategoryEditDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create happy path: closes dialog and shows success toast (S5)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <CategoryEditDialog
        mode="create"
        parentOptions={[]}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    // Fill in name
    const nameInput = screen.getByLabelText(/nombre/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Snacks");

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /guardar|crear/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalled();
    });
  });

  it("slug auto-generated from name (S6)", async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditDialog
        mode="create"
        parentOptions={[]}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/nombre/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Alimento Premium");

    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement;
    expect(slugInput.value).toBe("alimento-premium");
  });

  it("edit mode pre-populates fields (S7)", async () => {
    const initial = {
      id: "cat-1",
      slug: "snacks",
      name: "Snacks",
      parentId: null,
      species: null,
      order: 0,
    };

    render(
      <CategoryEditDialog
        mode="edit"
        initial={initial}
        parentOptions={[]}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/nombre/i) as HTMLInputElement;
    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement;

    expect(nameInput.value).toBe("Snacks");
    expect(slugInput.value).toBe("snacks");
  });
});
