import Link from "next/link";
import { Button, Space } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { identity } from "@/lib/access";
import { claimOwner } from "@/lib/workflow";
import { CopyKey } from "@/app/components/copy-key";

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const actor = await identity();
  const { token } = await params;
  const claim = await claimOwner(token);

  if (!claim || claim.key.user.discordId !== actor.discordId) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ display: "flex" }}>
          <div>
            <Text type="secondary">Récupération de clé</Text>
            <Title level={2} style={{ margin: 0 }}>
              Lien indisponible
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Ce lien est expiré, déjà utilisé ou ne t&apos;appartient pas.
            </Paragraph>
          </div>
          <Link href="/mon-acces">
            <Button>Retour à Mon accès</Button>
          </Link>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
        <div>
          <Text type="secondary">Remis à {actor.username}</Text>
          <Title level={2} style={{ margin: 0 }}>
            Afficher votre clé
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Elle ne sera affichée qu&apos;une seule fois. Copie-la avant de fermer cette page.
          </Paragraph>
        </div>
        <CopyKey token={token} expiresAt={claim.expiresAt.toISOString()} />
      </Space>
    </div>
  );
}
