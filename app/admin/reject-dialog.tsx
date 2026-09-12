"use client";
import { useRef } from "react";
import { decide } from "@/app/actions";
type RejectAction = (data: FormData) => void | Promise<void>;
export function RejectDialog({ requestId, action = decide, commentField = "rejectionReason", requestIdField = "requestId", title = "Refuser la demande" }: { requestId: string; action?: RejectAction; commentField?: string; requestIdField?: string; title?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="btn danger sm" onClick={() => ref.current?.showModal()}>Refuser</button>
    <dialog ref={ref} className="details-dialog" onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close(); }}>
      <div className="details-sheet"><div className="details-head"><div><span className="eyebrow">Décision</span><h3>{title}</h3></div><button type="button" className="icon-btn" aria-label="Fermer" onClick={() => ref.current?.close()}>×</button></div>
        <form action={action} className="panel-body stack">
          <input type="hidden" name={requestIdField} value={requestId} /><input type="hidden" name="decision" value="reject" />
          <label className="field"><span>Motif du refus</span><textarea name={commentField} required maxLength={500} placeholder="Expliquez brièvement la décision…" /></label>
          <div className="rowbtwn"><button type="button" className="btn ghost sm" onClick={() => ref.current?.close()}>Annuler</button><button type="submit" className="btn danger sm">Confirmer le refus</button></div>
        </form>
      </div>
    </dialog>
  </>;
}
