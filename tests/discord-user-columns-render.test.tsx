import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { DiscordUserColumns } from "../app/components/discord-user-columns";

const user = {
  serverNickname: "Pseudo",
  username: "Utilisateur",
  discordId: "250000000000000001",
  discordRoles: JSON.stringify(["Membres"]),
  joinedAt: "2025-01-01T00:00:00.000Z",
};

const accessRequestColumns = ["nickname", "username", "server", "account"] as const;

describe("rendu des colonnes utilisateur Discord", () => {
  it("conserve les six colonnes par défaut", () => {
    const markup = renderToStaticMarkup(<table><thead><tr><DiscordUserColumns kind="header" sortKey={null} sortDir="asc" onSort={() => undefined} /></tr></thead></table>);
    expect(markup).toContain("Discord ID");
    expect(markup).toContain("Rôles");
  });

  it("permet à demandes-acces de masquer l’identifiant et les rôles", () => {
    const header = renderToStaticMarkup(<table><thead><tr><DiscordUserColumns kind="header" visibleColumns={accessRequestColumns} sortKey={null} sortDir="asc" onSort={() => undefined} /></tr></thead></table>);
    const filters = renderToStaticMarkup(<table><thead><tr><DiscordUserColumns kind="filters" visibleColumns={accessRequestColumns} rows={[user]} filters={{ nickname: "", username: "", discordId: "", role: "" }} onChange={() => undefined} /></tr></thead></table>);
    const cells = renderToStaticMarkup(<table><tbody><tr><DiscordUserColumns kind="cells" visibleColumns={accessRequestColumns} user={user} /></tr></tbody></table>);

    expect(header).not.toContain("Discord ID");
    expect(header).not.toContain("Rôles");
    expect(filters).not.toContain("Filtrer par Discord ID");
    expect(filters).not.toContain("Filtrer par rôle");
    expect(cells).not.toContain(user.discordId);
    expect(cells).not.toContain("Membres");
  });
});
