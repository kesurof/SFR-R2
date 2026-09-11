import { auth } from "@/auth";
import { consumeClaim } from "@/lib/workflow";
import { validateEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/access";
import { isDiscordMember } from "@/lib/membership";
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth(); const { token } = await params; const headers = { "Cache-Control": "no-store" };
  if (!session?.user?.discordId) return Response.json({ error: "Connexion Discord requise." }, { status: 401, headers });
  if (!isAdmin(session.user.discordId) && !(await isDiscordMember(session.user.discordId))) return Response.json({ error: "Accès réservé aux membres du serveur." }, { status: 403, headers });
  const env = validateEnv();
  const forwarded = env.TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined;
  const limit = rateLimit(`claim:consume:${session.user.discordId}:${forwarded ?? "direct"}`, env.RATE_LIMIT_CLAIM_CONSUME_MAX, env.RATE_LIMIT_WINDOW_SECONDS);
  if (!limit.allowed) return Response.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfter) } });
  if (!/^[A-Za-z0-9_-]{40,}$/.test(token)) return Response.json({ error: "Lien invalide." }, { status: 404, headers });
  const secret = await consumeClaim(token, session.user.discordId);
  return secret ? Response.json({ secret }, { headers }) : Response.json({ error: "Lien expiré, déjà utilisé ou non autorisé." }, { status: 410, headers });
}
