import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserTable } from "../app/admin/user-table";

function mockMatchMedia(matches: boolean) {
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

afterEach(() => {
  cleanup();
  mockMatchMedia(false);
});

vi.mock("@/app/actions", () => ({
  setSponsor: vi.fn(),
  setAccessApprover: vi.fn(),
}));

const user = {
  id: "user_1",
  serverNickname: "Pseudo serveur",
  username: "discord_user",
  discordId: "100000000000000001",
  discordRoles: JSON.stringify(["Admin"]),
  joinedAt: null,
  sponsorPermission: null,
  accessApproverPermission: { id: "perm_1" },
};

describe("UserTable", () => {
  it("affiche une carte (sans tableau) sur mobile, avec rôles et permissions", () => {
    mockMatchMedia(true);
    render(<UserTable users={[user]} />);

    expect(screen.getByText("Pseudo serveur")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
    const card = document.querySelector(".ant-card") as HTMLElement;
    expect(card).toBeTruthy();
    expect(within(card).getByText("Parrainage")).toBeTruthy();
    expect(within(card).getByText("Approbation")).toBeTruthy();
    expect(document.querySelector(".ant-table")).toBeNull();
    expect(document.querySelector(".ant-card")).toBeTruthy();
  });
});
