import { auth } from "@/auth";
import { issueClaim } from "@/lib/workflow";
import { validateEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/access";
import { isDiscordMember } from "@/lib/membership";
export async function POST() {
  const session = await auth();
  const headers = { "Cache-Control": "no-store" };
  if (!session?.user?.discordId) return Response.json({ error: "Connexion Discord requise." }, { status: 401, headers });
  if (!isAdmin(session.user.discordId) && !(await isDiscordMember(session.user.discordId))) return Response.json({ error: "Accès réservé aux membres du serveur." }, { status: 403, headers });
  const env = validateEnv();
  const limit = rateLimit(`claim:create:${session.user.discordId}`, env.RATE_LIMIT_CLAIM_CREATE_MAX, env.RATE_LIMIT_WINDOW_SECONDS);
  if (!limit.allowed) return Response.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfter) } });
  try { return Response.json({ token: await issueClaim(session.user.discordId) }, { headers }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Impossible de créer le lien." }, { status: 400, headers }); }
}
