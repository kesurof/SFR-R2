import { Card, Space } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { identity, isAdmin } from "@/lib/access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await identity();
  if (!isAdmin(actor.discordId)) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ display: "flex" }}>
          <div>
            <Text type="secondary">Accès administrateur refusé</Text>
            <Title level={2} style={{ margin: 0 }}>
              Ton compte Discord n&apos;est pas administrateur.
            </Title>
            <Paragraph style={{ marginBottom: 0 }}>
              Ajoute cet identifiant dans <Text code>ADMIN_DISCORD_IDS</Text>, puis recrée le conteneur :
            </Paragraph>
          </div>
          <Card>
            <Text code>{actor.discordId}</Text>
          </Card>
        </Space>
      </div>
    );
  }
  return <>{children}</>;
}
