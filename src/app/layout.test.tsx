import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-sans" }),
  Bricolage_Grotesque: () => ({ variable: "--font-heading" }),
}));

import RootLayout from "./layout";

// RootLayout renders <html><body>... In tests we can mount it inside a
// detached fragment; React will accept the nested html/body under a harness
// div. We only need to inspect for the skip link + main landmark.

describe("root layout — skip link and main landmark", () => {
  it("renders a skip-to-content link with href='#main' as the first interactive element", () => {
    const { container } = render(
      <RootLayout>
        <p>child</p>
      </RootLayout>,
    );
    const firstLink = container.querySelector("a");
    expect(firstLink).not.toBeNull();
    expect(firstLink?.getAttribute("href")).toBe("#main");
    expect(firstLink?.textContent?.toLowerCase()).toContain("saltar al contenido");
  });

  it("renders a <main id='main' tabindex='-1'> element", () => {
    const { container } = render(
      <RootLayout>
        <p>child</p>
      </RootLayout>,
    );
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main?.getAttribute("id")).toBe("main");
    expect(main?.getAttribute("tabindex")).toBe("-1");
  });
});
