import { describe, expect, it } from "vitest";
import { buildDiscordUserColumns } from "../app/components/discord-user-columns";

const titles = (columns: ReturnType<typeof buildDiscordUserColumns>) => columns.map((column) => column.title);

describe("colonnes utilisateur Discord", () => {
  it("expose les six colonnes par défaut", () => {
    const columns = buildDiscordUserColumns();
    expect(titles(columns)).toEqual([
      "Pseudo serveur",
      "Nom Discord",
      "Discord ID",
      "Rôles",
      "Sur le serveur",
      "Compte Discord",
    ]);
  });

  it("permet à demandes-acces de masquer l’identifiant et les rôles", () => {
    const columns = buildDiscordUserColumns({
      visibleColumns: ["nickname", "username", "server", "account"],
    });
    const headerTitles = titles(columns);
    expect(headerTitles).not.toContain("Discord ID");
    expect(headerTitles).not.toContain("Rôles");
    expect(headerTitles).toEqual(["Pseudo serveur", "Nom Discord", "Sur le serveur", "Compte Discord"]);
  });
});
