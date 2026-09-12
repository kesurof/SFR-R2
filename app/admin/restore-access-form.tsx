"use client";

import { useState } from "react";
import { AutoComplete } from "antd";
import Password from "antd/es/input/Password";
import { restoreManualAccessAction } from "@/app/actions";
import { ANTI_AUTOFILL_PROPS } from "@/app/components/anti-autofill";
import { FormField } from "@/app/components/form-field";
import { PendingButton } from "@/app/components/pending-button";

type Member = { discordId: string; username: string; serverNickname: string | null };

export function RestoreAccessForm({ users }: { users: Member[] }) {
  const [name, setName] = useState("");
  const [discordId, setDiscordId] = useState("");

  const options = users.map((user) => {
    const nickname = user.serverNickname?.trim();
    return {
      value: user.username,
      label: nickname && nickname !== user.username ? `${user.username} — ${nickname}` : user.username,
    };
  });

  const sync = (value: string) => {
    setName(value);
    setDiscordId(users.find((user) => user.username === value)?.discordId ?? "");
  };

  return (
    <form action={restoreManualAccessAction} autoComplete="off">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 240 }}>
          <FormField label="Nom Discord">
            <AutoComplete
              value={name}
              options={options}
              placeholder="Rechercher un membre (nom ou pseudo serveur)…"
              filterOption={(input, option) => String(option?.label ?? "").toLocaleLowerCase().includes(input.toLocaleLowerCase())}
              onChange={sync}
              onSelect={sync}
              style={{ width: "100%" }}
            />
          </FormField>
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 220 }}>
          <FormField label="Clé complète">
            <Password name="secret" required autoComplete="new-password" placeholder="Clé R2 à restaurer" {...ANTI_AUTOFILL_PROPS} />
          </FormField>
        </div>
        <input type="hidden" name="discordId" value={discordId} />
        <input type="hidden" name="username" value={name} />
        <div>
          <PendingButton pendingLabel="Restauration…">Restaurer l’accès</PendingButton>
        </div>
      </div>
    </form>
  );
}
