import { z } from "zod";

const snowflake = z.string().regex(/^\d{17,20}$/, "doit être un Discord ID valide");

const schema = z.object({
  DATABASE_URL: z.string().startsWith("file:").default("file:/data/dev.db"),
  NEXTAUTH_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_DISCORD_ID: z.string().min(1),
  AUTH_DISCORD_SECRET: z.string().min(1),
  DISCORD_GUILD_ID: snowflake,
  ADMIN_DISCORD_IDS: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(1),
  DISCORD_BOT_TOKEN: z.string().min(1),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  RATE_LIMIT_CLAIM_CREATE_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_CLAIM_CONSUME_MAX: z.coerce.number().int().positive().default(10),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  DISCORD_NOTIFICATIONS_ENABLED: z.enum(["true", "false"]).default("true"),
  NOTIFICATION_WORKER_INTERVAL_SECONDS: z.coerce.number().int().min(10).max(3600).default(30),
});

let cached: z.infer<typeof schema> | undefined;
export function validateEnv() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Configuration invalide: ${details}`);
  }
  const key = Buffer.from(parsed.data.ENCRYPTION_KEY, "base64");
  if (key.length !== 32) throw new Error("Configuration invalide: ENCRYPTION_KEY doit être une clé base64 de 32 octets.");
  const localUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(parsed.data.NEXTAUTH_URL);
  if (process.env.NODE_ENV === "production" && !localUrl && !parsed.data.NEXTAUTH_URL.startsWith("https://")) {
    throw new Error("Configuration invalide: NEXTAUTH_URL doit utiliser HTTPS en production.");
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache() { cached = undefined; }
