import type { ReactNode } from "react";
import Text from "antd/es/typography/Text";

/** Libellé, contrôle et aide d'un champ, compatible composants serveur. */
export function FormField({ label, hint, children }: { label: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <Text strong>{label}</Text>
      <div style={{ marginTop: 4 }}>{children}</div>
      {hint ? (
        <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 4 }}>
          {hint}
        </Text>
      ) : null}
    </label>
  );
}
