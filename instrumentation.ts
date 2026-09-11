import { validateEnv } from "@/lib/env";
import { startNotificationWorker } from "@/lib/discord-notifications";
export function register() {
  validateEnv();
  if (process.env.NEXT_RUNTIME === "nodejs") startNotificationWorker();
}
