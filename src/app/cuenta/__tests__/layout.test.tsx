/**
 * Task 4.3 RED — CuentaLayout test (HUB-1, HUB-4)
 * - Unauthenticated → redirect to /login
 * - Authenticated → renders sidebar
 * - /cuenta/crear-demo path check is handled by route exclusion (layout won't mount)
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { getCurrentUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  usePathname: vi.fn(() => "/cuenta"),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);

const camilaUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

import CuentaLayout from "../layout";

describe("CuentaLayout (HUB-1, HUB-4)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects unauthenticated user to /login (HUB-1)", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(CuentaLayout({ children: <div>content</div> })).rejects.toThrow(
      /REDIRECT:\/login/,
    );
  });

  it("renders sidebar for authenticated user (HUB-1)", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CuentaLayout({ children: <div>page content</div> });
    render(jsx);
    expect(screen.getByRole("navigation", { name: /mi cuenta/i })).toBeInTheDocument();
  });

  it("renders children alongside sidebar (HUB-1)", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CuentaLayout({ children: <div>page content</div> });
    render(jsx);
    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});
