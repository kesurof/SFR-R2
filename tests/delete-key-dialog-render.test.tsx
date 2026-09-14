import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteKeyDialog } from "../app/admin/delete-key-dialog";

afterEach(cleanup);

vi.mock("@/app/actions", () => ({
  deleteKeyAction: vi.fn(),
}));

describe("DeleteKeyDialog", () => {
  it("n'autorise la suppression qu'après confirmation de l'irréversibilité", () => {
    render(
      <DeleteKeyDialog
        open
        onClose={() => {}}
        keyId="key_1"
        fingerprint="abcd••••••••wxyz"
        status="ACTIVE"
      />,
    );

    const confirm = screen.getByRole("button", { name: "Supprimer" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox"));
    expect(confirm.disabled).toBe(false);
  });
});
