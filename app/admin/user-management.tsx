import { Card, Empty, Space, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { syncMembers } from "@/app/actions-sync";
import { prisma } from "@/lib/prisma";
import { UserTable } from "@/app/admin/user-table";
import { PendingButton } from "@/app/components/pending-button";

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

        {users.length ? <UserTable users={users} /> : <Empty description="Lance une synchronisation pour importer les membres." />}
      </Space>
    </Card>
  );
}
