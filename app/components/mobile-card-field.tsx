"use client";

import type { ReactNode } from "react";
import { Typography } from "antd";

/** Ligne libellé / valeur d'une carte mobile, pour un rendu homogène. */
export function MobileCardField({
  label,
  children,
  align = "right",
}: {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, flex: "none", minWidth: 72 }}>
        {label}
      </Typography.Text>
      <div style={{ flex: 1, minWidth: 0, textAlign: align }}>{children}</div>
    </div>
  );
}
