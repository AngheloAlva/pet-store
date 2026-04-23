import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComingSoon } from "./coming-soon";
import { PawPrint } from "@phosphor-icons/react/dist/ssr";

describe("ComingSoon", () => {
  it("renders title, description, and all items", () => {
    render(
      <ComingSoon
        title="Blog"
        description="Contenido con guías y tips de cuidado."
        Icon={PawPrint}
        items={[
          { title: "Guía uno", description: "desc uno" },
          { title: "Guía dos", description: "desc dos" },
          { title: "Guía tres", description: "desc tres" },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: /blog/i })).toBeInTheDocument();
    expect(
      screen.getByText(/contenido con guías/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/próximamente/i)).toBeInTheDocument();
    expect(screen.getByText("Guía uno")).toBeInTheDocument();
    expect(screen.getByText("Guía dos")).toBeInTheDocument();
    expect(screen.getByText("Guía tres")).toBeInTheDocument();
  });
});
