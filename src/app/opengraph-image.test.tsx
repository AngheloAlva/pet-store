import { describe, expect, it, vi } from "vitest";

// ImageResponse requires the Edge runtime; we only need to validate exports.
vi.mock("next/og", () => ({
  ImageResponse: vi.fn().mockImplementation(() => ({ __mock: "image-response" })),
}));

import OpengraphImage, {
  alt,
  contentType,
  size,
} from "./opengraph-image";

describe("opengraph-image", () => {
  it("exports a 1200x630 size", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
  });

  it("exports PNG contentType", () => {
    expect(contentType).toBe("image/png");
  });

  it("exports a non-empty Spanish alt", () => {
    expect(typeof alt).toBe("string");
    expect(alt.length).toBeGreaterThan(0);
  });

  it("default export is a function", () => {
    expect(typeof OpengraphImage).toBe("function");
  });
});
