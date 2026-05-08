import { describe, it, expect } from "vitest";
import { NUBIUM_REPO_URL } from "../StatusBar";

describe("StatusBar GitHub link", () => {
  it("points at the canonical Nubium repository", () => {
    expect(NUBIUM_REPO_URL).toBe("https://github.com/nth-chile/nubium");
  });
});
