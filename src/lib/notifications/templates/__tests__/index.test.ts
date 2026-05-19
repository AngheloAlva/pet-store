import { describe, it, expect } from "vitest";
import { TEMPLATES } from "../index";
import { DEMO_EMAIL_TYPE } from "@/db/schema";

describe("TEMPLATES registry", () => {
  it("has all 9 keys matching DEMO_EMAIL_TYPE", () => {
    const keys = Object.keys(TEMPLATES);
    expect(keys.sort()).toEqual([...DEMO_EMAIL_TYPE].sort());
  });

  it("each value is a function", () => {
    for (const [, fn] of Object.entries(TEMPLATES)) {
      expect(typeof fn).toBe("function");
    }
  });

  it("each render function returns subject, html, text", () => {
    // Spot-check a few templates
    const welcomeResult = TEMPLATES.welcome({ userName: "Test" });
    expect(welcomeResult).toHaveProperty("subject");
    expect(welcomeResult).toHaveProperty("html");
    expect(welcomeResult).toHaveProperty("text");

    const otherResult = TEMPLATES.other({ subject: "x", html: "<p>x</p>", text: "x" });
    expect(otherResult.subject).toBe("x");
  });
});
