import { describe, expect, it, vi } from "vitest";
import { renderToReadableStream } from "react-dom/server";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-sans" }),
  Bricolage_Grotesque: () => ({ variable: "--font-heading" }),
}));

// SiteHeader is now an async RSC that calls getCurrentUser() → session.ts (server-only).
// Mock it to avoid the SESSION_SECRET fail-fast guard in test environments.
vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => null,
}));

import RootLayout from "./layout";

// RootLayout is an async RSC. renderToReadableStream supports async components.
async function renderToString(jsx: React.ReactElement): Promise<string> {
  const stream = await renderToReadableStream(jsx);
  const reader = stream.getReader();
  const chunks: string[] = [];
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value, { stream: true }));
  }
  return chunks.join("");
}

describe("root layout — skip link and main landmark", () => {
  it("renders a skip-to-content link with href='#main' as the first interactive element", async () => {
    const html = await renderToString(
      <RootLayout>
        <p>child</p>
      </RootLayout>,
    );
    // First anchor in the markup is the skip link.
    const firstHrefMatch = html.match(/href="([^"]+)"/);
    expect(firstHrefMatch?.[1]).toBe("#main");
    expect(html.toLowerCase()).toContain("saltar al contenido");
  });

  it("renders a <main id='main' tabindex='-1'> element", async () => {
    const html = await renderToString(
      <RootLayout>
        <p>child</p>
      </RootLayout>,
    );
    expect(html).toContain('id="main"');
    expect(html).toContain('tabindex="-1"');
  });
});
