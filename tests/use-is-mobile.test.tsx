import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "../app/components/use-is-mobile";

function Probe() {
  return <span>{useIsMobile() ? "mobile" : "desktop"}</span>;
}

export function mockMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(cleanup);

describe("useIsMobile", () => {
  it("reste en desktop par défaut", () => {
    mockMatchMedia(false);
    render(<Probe />);
    expect(screen.getByText("desktop")).toBeTruthy();
  });

  it("bascule en mobile après montage", () => {
    mockMatchMedia(true);
    render(<Probe />);
    expect(screen.getByText("mobile")).toBeTruthy();
  });
});
