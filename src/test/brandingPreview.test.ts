import { describe, it, expect, beforeEach } from "vitest";
import {
  BRANDING_PREVIEW_STORAGE_KEY,
  BRANDING_PREVIEW_EVENT,
  readBrandingPreview,
  writeBrandingPreview,
  clearBrandingPreview,
  type BrandingPreview,
} from "@/lib/brandingPreview";

const SAMPLE: BrandingPreview = {
  logo_url: "https://example.com/logo.png",
  brand_name: "أكاديمية نور",
  theme_id: "moe-navy",
  primary: "#1E3A8A",
  accent: "#F4B942",
};

describe("brandingPreview", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    // Remove any leftover listener from previous tests.
    window.removeEventListener(BRANDING_PREVIEW_EVENT, () => {});
  });

  it("round-trips a draft through sessionStorage", () => {
    expect(readBrandingPreview()).toBeNull();
    writeBrandingPreview(SAMPLE);
    expect(readBrandingPreview()).toEqual(SAMPLE);
  });

  it("dispatches a custom event on write and clear", () => {
    const writes: (BrandingPreview | null)[] = [];
    const handler = (e: Event) =>
      writes.push((e as CustomEvent<BrandingPreview | null>).detail ?? null);
    window.addEventListener(BRANDING_PREVIEW_EVENT, handler);

    writeBrandingPreview(SAMPLE);
    clearBrandingPreview();

    window.removeEventListener(BRANDING_PREVIEW_EVENT, handler);

    expect(writes).toEqual([SAMPLE, null]);
  });

  it("clear removes the key and emits a null event", () => {
    writeBrandingPreview(SAMPLE);
    expect(window.sessionStorage.getItem(BRANDING_PREVIEW_STORAGE_KEY)).not.toBeNull();
    clearBrandingPreview();
    expect(window.sessionStorage.getItem(BRANDING_PREVIEW_STORAGE_KEY)).toBeNull();
    expect(readBrandingPreview()).toBeNull();
  });

  it("returns null when sessionStorage holds invalid JSON", () => {
    window.sessionStorage.setItem(BRANDING_PREVIEW_STORAGE_KEY, "not-json");
    expect(readBrandingPreview()).toBeNull();
  });

  it("survives only the current tab (sessionStorage scope)", () => {
    // sessionStorage is already per-tab by spec; this test asserts the
    // helper does NOT promote the value to localStorage.
    writeBrandingPreview(SAMPLE);
    expect(window.localStorage.getItem(BRANDING_PREVIEW_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(BRANDING_PREVIEW_STORAGE_KEY)).not.toBeNull();
  });
});
