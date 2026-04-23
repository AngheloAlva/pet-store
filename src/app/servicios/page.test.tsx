import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ServiciosPage, { metadata } from "./page";
import { getStoresByService } from "@/lib/stores";

describe("servicios page", () => {
  it("renders one card per service key (4 services)", () => {
    render(<ServiciosPage />);
    for (const label of ["Tienda", "Veterinaria", "Peluquería", "Farmacia"]) {
      expect(
        screen.getByRole("heading", { level: 2, name: label }),
      ).toBeInTheDocument();
    }
  });

  it("lists the sucursales that offer each service", () => {
    render(<ServiciosPage />);
    // Pharmacy → only Las Condes in the seed.
    const pharmacyStores = getStoresByService("pharmacy");
    for (const store of pharmacyStores) {
      const links = screen.getAllByRole("link", {
        name: new RegExp(`^${store.name}$`, "i"),
      });
      const hasPharmacyLink = links.some((a) =>
        a.getAttribute("href") === `/sucursales?tienda=${store.slug}`,
      );
      expect(hasPharmacyLink).toBe(true);
    }
  });

  it("renders a próximamente banner mentioning agendamiento", () => {
    render(<ServiciosPage />);
    const banner = screen.getByText(/próximamente/i);
    expect(banner).toBeInTheDocument();
    expect(document.body.textContent?.toLowerCase()).toContain("agendamiento");
  });

  it("exposes a canonical alternate", () => {
    expect(metadata.alternates?.canonical).toBe("/servicios");
  });
});
