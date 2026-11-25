import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BUY_ME_A_COFFEE_URL } from "../lib/links";
import { SiteFooter } from "./SiteFooter";

vi.mock("../lib/authStore", () => ({
  useAuthOptional: () => null,
}));

vi.mock("../lib/site", () => ({
  getPublicSiteHost: () => "cursor-sync.example",
}));

function renderFooterMarkup(): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(SiteFooter))
  );
}

describe("SiteFooter", () => {
  it("renders Buy me a coffee with correct href, target, and rel", () => {
    const html = renderFooterMarkup();
    expect(html).toContain(`href="${BUY_ME_A_COFFEE_URL}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Buy me a coffee");
  });
});