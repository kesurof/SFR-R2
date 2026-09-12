import Link from "next/link";
import { Alert, Button, Card, Space } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { identity, isAdmin, requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { SponsorshipTable, type SponsorshipRow } from "@/app/parrainer/suivi/sponsorship-table";

export default async function SponsorTrackingPage() {
  await requireMember();
  const actor = await identity();
  const sponsor = await prisma.user.findUnique({
    where: { discordId: actor.discordId },
    include: {
      sponsorPermission: true,
      sponsoredRequests: {
        include: { referred: { include: { accessKeys: { orderBy: { createdAt: "desc" }, take: 1 } } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!isAdmin(actor.discordId) && !sponsor?.sponsorPermission) {
    return (
      <Space direction="vertical" size="large" style={{ display: "flex", maxWidth: 720, margin: "0 auto" }}>
        <div>
          <Text type="secondary">Mes parrainages</Text>
          <Title level={2} style={{ margin: 0 }}>
            Autorisation requise
          </Title>
        </div>
        <Alert type="error" showIcon message="Cette page est réservée aux parrains autorisés." />
      </Space>
    );
  }

  const rows: SponsorshipRow[] = (sponsor?.sponsoredRequests ?? []).map((request) => {
    const key = request.referred.accessKeys[0];
    return {
      id: request.id,
      referredName: request.referred.serverNickname || request.referred.username,
      referredId: request.referred.discordId,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      decidedAt: request.decidedAt?.toISOString() ?? null,
      keyStatus: key?.status ?? null,
      keyCreatedAt: key?.createdAt.toISOString() ?? null,
      keyRevokedAt: key?.revokedAt?.toISOString() ?? null,
    };
  });

  return (
    <Space direction="vertical" size="large" style={{ display: "flex" }}>
      <div>
        <Text type="secondary">Parrainage</Text>
        <Title level={2} style={{ margin: 0 }}>
          Mes demandes
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Suivez l’avancement des personnes que vous avez recommandées.
        </Paragraph>
      </div>

      <Card>
        {rows.length ? (
          <SponsorshipTable rows={rows} />
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <Paragraph type="secondary">Vous n’avez encore soumis aucune demande.</Paragraph>
            <Link href="/parrainer">
              <Button type="primary">Créer une demande</Button>
            </Link>
          </div>
        )}
      </Card>
    </Space>
  );
}
