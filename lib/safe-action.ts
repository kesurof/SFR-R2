import { createSafeActionClient } from "next-safe-action";
import { redirect } from "next/navigation";
import { requireAccessApprover, requireAdmin, requireMember } from "@/lib/access";

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    return error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
  },
});

export const memberAction = actionClient.use(async ({ next }) => {
  const actor = await requireMember();
  return next({ ctx: { actor } });
});

export const adminAction = actionClient.use(async ({ next }) => {
  const actor = await requireAdmin();
  return next({ ctx: { actor } });
});

export const approverAction = actionClient.use(async ({ next }) => {
  const actor = await requireAccessApprover();
  return next({ ctx: { actor } });
});

type SafeResult = { validationErrors?: unknown; serverError?: string };

function firstIssueMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record._errors) && record._errors.length > 0) return String(record._errors[0]);
  for (const nested of Object.values(record)) {
    const found = firstIssueMessage(nested);
    if (found) return found;
  }
  const root = (record.errors as unknown[] | undefined)?.[0];
  return typeof root === "string" ? root : undefined;
}

/** Message exploitable d'un résultat d'action (erreur serveur ou première erreur de validation). */
export function errorMessage(result: SafeResult | undefined, fallback: string): string {
  if (!result) return fallback;
  if (result.serverError) return String(result.serverError);
  return firstIssueMessage(result.validationErrors) ?? fallback;
}

/**
 * Adapte une action typée à l'API `<form action>` : sur erreur de validation ou
 * erreur serveur, redirige vers `errorRedirect` ; sur succès, laisse passer le
 * `redirect()` de l'action (post-redirect-get, compatible sans JavaScript).
 */
export function formAction(
  action: (input: FormData) => Promise<unknown>,
  errorRedirect: (result: SafeResult) => string,
): (formData: FormData) => Promise<void> {
  return async (formData: FormData) => {
    const result = (await action(formData)) as SafeResult | undefined;
    if (result?.validationErrors || result?.serverError) {
      redirect(errorRedirect(result));
    }
  };
}
