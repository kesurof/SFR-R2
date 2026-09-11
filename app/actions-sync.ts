"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access";
import { syncDiscordMembers } from "@/lib/discord";
import { prisma } from "@/lib/prisma";

export async function syncMembers() {
  const actor = await requireAdmin();
  let ok = true; let count = 0; const startedAt = new Date();
  await prisma.syncState.upsert({ where: { id: "discord" }, update: { status: "RUNNING", startedAt, errorMessage: null }, create: { id: "discord", status: "RUNNING", startedAt } });
  try {
    count = await syncDiscordMembers(actor.discordId);
    await prisma.syncState.update({ where: { id: "discord" }, data: { status: "SUCCESS", completedAt: new Date(), memberCount: count, errorMessage: null } });
  } catch {
    ok = false;
    await prisma.syncState.update({ where: { id: "discord" }, data: { status: "ERROR", completedAt: new Date(), errorMessage: "Discord a refusé la synchronisation." } });
  }
  revalidatePath("/admin");
  redirect(`/admin?view=users&notice=${ok ? "members_synced" : "sync_error"}`);
}
