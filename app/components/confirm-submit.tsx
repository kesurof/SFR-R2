"use client";

import { useRef } from "react";

/**
 * Bouton qui, au clic, ouvre un <dialog> de confirmation ; sur validation il
 * soumet le <form> parent (via requestSubmit). Remplace window.confirm().
 */
export function ConfirmSubmit({
  children,
  title,
  message,
  confirmLabel,
  className = "btn danger sm",
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function submit() {
    dialogRef.current?.close();
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
    <>
      <button
        type="button"
        ref={triggerRef}
        className={className}
        onClick={() => dialogRef.current?.showModal()}
      >
        {children}
      </button>
      <dialog ref={dialogRef} onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}>
        <div className="dlg">
          <h3>{title}</h3>
          <p>{message}</p>
          <div className="row">
            <button type="button" className="btn ghost sm" onClick={() => dialogRef.current?.close()}>
              Annuler
            </button>
            <button type="button" className="btn danger sm" onClick={submit}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
