import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "../app/components/status-badge";

describe("StatusBadge", () => {
  it("affiche le libellé d'un statut connu", () => {
    render(<StatusBadge status="KEY_READY" />);
    expect(screen.getByText("Clé prête")).toBeTruthy();
  });

  it("conserve la valeur d'un statut inconnu", () => {
    render(<StatusBadge status="CUSTOM_STATUS" />);
    expect(screen.getByText("CUSTOM_STATUS")).toBeTruthy();
  });
});
