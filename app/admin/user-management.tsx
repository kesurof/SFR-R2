import { Card, Empty, Input, Space, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import Password from "antd/es/input/Password";
import { restoreManualAccessAction } from "@/app/actions";
import { syncMembers } from "@/app/actions-sync";
import { prisma } from "@/lib/prisma";
import { UserTable } from "@/app/admin/user-table";
import { FormField } from "@/app/components/form-field";
import { PendingButton } from "@/app/components/pending-button";
import { ANTI_AUTOFILL_PROPS } from "@/app/components/anti-autofill";

export async function UserManagement() {
  const [users, sponsorCount, syncState] = await Promise.all([
    prisma.user.findMany({ include: { sponsorPermission: true, accessApproverPermission: true }, orderBy: { username: "asc" }, take: 1000 }),
    prisma.sponsorPermission.count(),
    prisma.syncState.findUnique({ where: { id: "discord" } }),
  ]);

  const syncLabel =
    syncState?.status === "SUCCESS"
      ? "Synchronisation réussie"
      : syncState?.status === "ERROR"
        ? "Erreur de synchronisation"
        : syncState?.status === "RUNNING"
          ? "Synchronisation en cours"
          : "Jamais synchronisé";
  const syncColor = syncState?.status === "SUCCESS" ? "green" : syncState?.status === "ERROR" ? "red" : syncState?.status === "RUNNING" ? "gold" : "default";

  return (
    <Card
      title={
        <Space size={8} align="baseline" wrap>
          <Title level={4} style={{ margin: 0 }}>
            Utilisateurs Discord
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {users.length} membres · {sponsorCount} parrain{sponsorCount > 1 ? "s" : ""} autorisé
            {sponsorCount > 1 ? "s" : ""}
          </Text>
        </Space>
      }
      extra={
        <form action={syncMembers}>
          <PendingButton pendingLabel="Synchronisation…">Synchroniser Discord</PendingButton>
        </form>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space size={8} wrap>
          <Tag color={syncColor}>{syncLabel}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {syncState?.completedAt
              ? `${syncState.memberCount} membres · ${syncState.completedAt.toLocaleString("fr-FR")}`
              : "Aucune synchronisation enregistrée"}
          </Text>
        </Space>

        <div>
          <form action={restoreManualAccessAction} autoComplete="off">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  Restaurer un accès
                </Title>
                <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                  Recrée un utilisateur absent de la base et lui attribue immédiatement une clé active. La date retenue sera celle de la restauration.
                </Paragraph>
              </div>
              <PendingButton pendingLabel="Restauration…">Restaurer l’accès</PendingButton>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <FormField label="Discord ID">
                <Input name="discordId" required inputMode="numeric" pattern="[0-9]{17,20}" placeholder="Identifiant Discord" />
              </FormField>
              <FormField label="Nom Discord">
                <Input
                  name="username"
                  required
                  autoComplete="off"
                  placeholder="Nom utilisé si l’utilisateur est nouveau"
                  {...ANTI_AUTOFILL_PROPS}
                />
              </FormField>
              <FormField
                label={
                  <>
                    Pseudo serveur <Text type="secondary">· facultatif</Text>
                  </>
                }
              >
                <Input name="serverNickname" placeholder="Pseudo affiché sur le serveur" />
              </FormField>
              <FormField label="Clé complète">
                <Password name="secret" required autoComplete="new-password" placeholder="Clé R2 à restaurer" {...ANTI_AUTOFILL_PROPS} />
              </FormField>
            </div>
          </form>
        </div>

        {users.length ? <UserTable users={users} /> : <Empty description="Lance une synchronisation pour importer les membres." />}
      </Space>
    </Card>
  );
}
