import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import AdminLayout from "../layout";
import AdminPage from "../page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockRedirect = vi.mocked(redirect);

const adminUser = {
  id: "user-admin-demo",
  email: "admin@demo.cl",
  name: "Admin Demo",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: true,
};

describe("AdminLayout — gate", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockRedirect.mockClear();
  });

  it("redirects to / when getCurrentUser returns null", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(
      AdminLayout({ children: <div>child</div> }),
    ).rejects.toThrow(/REDIRECT:\//);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("redirects to / when user role is customer", async () => {
    mockGetCurrentUser.mockResolvedValue({
      ...adminUser,
      role: "customer" as const,
    });
    await expect(
      AdminLayout({ children: <div>child</div> }),
    ).rejects.toThrow(/REDIRECT:\//);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("redirects to / when user role is staff", async () => {
    mockGetCurrentUser.mockResolvedValue({
      ...adminUser,
      role: "staff" as const,
    });
    await expect(
      AdminLayout({ children: <div>child</div> }),
    ).rejects.toThrow(/REDIRECT:\//);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});

describe("AdminLayout — render", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockRedirect.mockClear();
  });

  it("renders shell when role is admin — children present", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await AdminLayout({ children: <div>test-child-content</div> });
    render(jsx);
    expect(screen.getByText("test-child-content")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("renders DemoBanner with role=status when admin", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await AdminLayout({ children: <div /> });
    render(jsx);
    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      "Demo · los cambios que hagas se reiniciarán periódicamente",
    );
  });

  it("DemoBanner has no dismiss button or interactive element", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await AdminLayout({ children: <div /> });
    render(jsx);
    const banner = screen.getByRole("status");
    expect(banner.querySelector("button")).toBeNull();
    expect(banner.querySelector("a")).toBeNull();
  });

  it("AdminSidebar renders exactly 4 placeholder links with href=#", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await AdminLayout({ children: <div /> });
    render(jsx);
    const placeholderLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "#");
    expect(placeholderLinks).toHaveLength(4);
  });
});

describe("AdminPage", () => {
  it("dashboard page renders heading", () => {
    render(<AdminPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /panel de administración/i }),
    ).toBeInTheDocument();
  });
});
