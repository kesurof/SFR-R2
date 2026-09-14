import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeysTable, type KeyRow } from "../app/admin/keys-table";

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
  replaceKeyAction: vi.fn(),
  replaceKeyByIdAction: vi.fn(),
  rejectKeyReplacementAction: vi.fn(),
  revoke: vi.fn(),
  deleteKeyAction: vi.fn(),
}));

const baseRow: KeyRow = {
  id: "key_new",
  member: "Membre test",
  discordId: "100000000000000001",
  fingerprint: "new1••••••••new2",
  status: "ACTIVE",
  revokedAt: null,
  createdAt: "2026-09-14T12:00:00.000Z",
  sponsor: "Équipe",
  replacementRequest: null,
};

describe("KeysTable", () => {
  it("trace un remplacement abouti et propose l'action principale", () => {
    render(
      <KeysTable
        rows={[
          {
            ...baseRow,
            replacementRequest: {
              id: "replacement_1",
              status: "COMPLETED",
              createdAt: "2026-09-14T11:00:00.000Z",
              reason: "La clé ne fonctionne plus.",
              decisionComment: null,
              previousFingerprint: "old1••••••••old2",
              isResult: true,
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("Traitée")).toBeTruthy();
    expect(screen.getByText("Remplace la clé old1••••••••old2")).toBeTruthy();
    expect(screen.getByText("Remplacer")).toBeTruthy();
    expect(screen.queryByText("Nouvelle clé")).toBeNull();
  });

  it("remplace l'action principale par « Traiter » sur une demande en attente", () => {
    render(
      <KeysTable
        rows={[
          {
            ...baseRow,
            replacementRequest: {
              id: "replacement_2",
              status: "PENDING",
              createdAt: "2026-09-14T11:00:00.000Z",
              reason: "La clé ne fonctionne plus.",
              decisionComment: null,
              previousFingerprint: "old1••••••••old2",
              isResult: false,
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("À traiter")).toBeTruthy();
    expect(screen.getByText("Traiter")).toBeTruthy();
    expect(screen.queryByText("Remplacer")).toBeNull();
    expect(screen.queryByText("Nouvelle clé")).toBeNull();
  });

  it("propose de renouveler une clé révoquée", () => {
    render(
      <KeysTable
        rows={[
          {
            ...baseRow,
            id: "key_revoked",
            status: "REVOKED",
            revokedAt: "2026-09-14T11:30:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Remplacer")).toBeTruthy();
  });

  it("affiche des cartes (sans tableau) sur mobile", () => {
    mockMatchMedia(true);
    render(<KeysTable rows={[baseRow]} />);

    expect(screen.getByText("Membre test")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent === "Parrainé par Équipe")).toBeTruthy();
    expect(document.querySelector(".ant-table")).toBeNull();
    expect(document.querySelector(".ant-card")).toBeTruthy();
  });
});
