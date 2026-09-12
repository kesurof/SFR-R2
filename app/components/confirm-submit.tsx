"use client";

import { useRef } from "react";
import { Button, Popconfirm } from "antd";

/**
 * Bouton qui demande confirmation (Popconfirm) puis soumet le <form> parent via
 * requestSubmit. Remplace window.confirm() et l'ancien <dialog> natif.
 */
export function ConfirmSubmit({
  children,
  title,
  message,
  confirmLabel,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  title: string;
  message: string;
  confirmLabel: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const triggerRef = useRef<React.ComponentRef<typeof Button>>(null);

  function submit() {
    const form = triggerRef.current?.closest("form");
    if (!form) return;
    if (name) {
      // reproduit le name/value du bouton d'origine pour la server action
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = name;
      hidden.value = value ?? "";
      form.appendChild(hidden);
    }
    form.requestSubmit();
  }

  return (
    <Popconfirm
      title={title}
      description={message}
      okText={confirmLabel}
      cancelText="Annuler"
      okButtonProps={{ danger: true }}
      onConfirm={submit}
    >
      <Button ref={triggerRef} danger size="small" className={className}>
        {children}
      </Button>
    </Popconfirm>
  );
}
