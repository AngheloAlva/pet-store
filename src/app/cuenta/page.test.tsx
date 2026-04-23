import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CuentaPage, { metadata } from "./page";

describe("cuenta page", () => {
  it("renders a heading with Mi cuenta", () => {
    render(<CuentaPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /mi cuenta/i }),
    ).toBeInTheDocument();
  });

  it("renders teasers mentioning pedidos, puntos and mascotas", () => {
    render(<CuentaPage />);
    const body = document.body.textContent?.toLowerCase() ?? "";
    expect(body).toContain("pedidos");
    expect(body).toContain("puntos");
    expect(body).toContain("mascotas");
  });

  it("exposes a próximamente marker", () => {
    render(<CuentaPage />);
    expect(screen.getByText(/próximamente/i)).toBeInTheDocument();
  });

  it("exposes a canonical alternate", () => {
    expect(metadata.alternates?.canonical).toBe("/cuenta");
  });
});
