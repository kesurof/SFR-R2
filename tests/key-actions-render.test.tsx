import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyActions } from "../app/admin/key-actions";
import type { KeyRow } from "../app/admin/keys-table";

afterEach(cleanup);

vi.mock("@/app/actions", () => ({
  replaceKeyAction: vi.fn(),
  replaceKeyByIdAction: vi.fn(),
  rejectKeyReplacementAction: vi.fn(),
  revoke: vi.fn(),
  deleteKeyAction: vi.fn(),
}));

const row = (overrides: Partial<KeyRow> = {}): KeyRow => ({
  id: "key_1",
  member: "Membre test",
  discordId: "100000000000000001",
  fingerprint: "abcd••••••••wxyz",
  status: "ACTIVE",
  revokedAt: null,
  createdAt: "2026-09-14T12:00:00.000Z",
  origin: { kind: "unknown", label: "—", approver: null, approverVerb: "" },
  replacementRequest: null,
  ...overrides,
});

describe("KeyActions", () => {
  it("expose Révoquer et Supprimer sur une clé active", async () => {
    render(<KeyActions row={row()} />);
    fireEvent.click(screen.getByLabelText("Plus d'actions"));

    expect(await screen.findByText("Révoquer")).toBeTruthy();
    expect(screen.getByText("Supprimer")).toBeTruthy();
    expect(screen.queryByText("Refuser la demande")).toBeNull();
  });

  it("expose Refuser sur une demande de remplacement en attente", async () => {
    render(
      <KeyActions
        row={row({
          replacementRequest: {
            id: "replacement_1",
            status: "PENDING",
            createdAt: "2026-09-14T11:00:00.000Z",
            reason: "La clé ne fonctionne plus.",
            decisionComment: null,
            previousFingerprint: "old1••••••••old2",
            isResult: false,
          },
        })}
      />,
    );
    fireEvent.click(screen.getByLabelText("Plus d'actions"));

    expect(await screen.findByText("Refuser la demande")).toBeTruthy();
    expect(screen.getByText("Révoquer")).toBeTruthy();
    expect(screen.getByText("Supprimer")).toBeTruthy();
  });

  it("n'expose que Supprimer sur une clé révoquée", async () => {
    render(<KeyActions row={row({ status: "REVOKED", revokedAt: "2026-09-14T11:30:00.000Z" })} />);
    fireEvent.click(screen.getByLabelText("Plus d'actions"));

    expect(await screen.findByText("Supprimer")).toBeTruthy();
    expect(screen.queryByText("Révoquer")).toBeNull();
    expect(screen.queryByText("Refuser la demande")).toBeNull();
  });
});
