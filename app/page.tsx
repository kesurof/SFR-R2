import Link from "next/link";
import { Alert, Button, Card, Space, Steps, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { auth, signIn } from "@/auth";
import { isAdmin } from "@/lib/access";
import { isDiscordMember } from "@/lib/membership";

const DISCORD_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ width: 16, height: 16 }}>
    <path d="M19.3 5.3A17 17 0 0 0 15 4l-.3.5a15 15 0 0 1 3.8 1.2 12.7 12.7 0 0 0-11 0A15 15 0 0 1 11.3 4.5L11 4a17 17 0 0 0-4.3 1.3C4 9.3 3.3 13.2 3.6 17a17 17 0 0 0 5.2 2.6l1-1.7a11 11 0 0 1-1.7-.8l.4-.3a12 12 0 0 0 10.2 0l.4.3a11 11 0 0 1-1.7.8l1 1.7A17 17 0 0 0 20.4 17c.4-4.4-.6-8.3-1.1-11.7zM9.7 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm4.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.9 2.1-1.9 2.1z" />
  </svg>
);

async function continueWithDiscord() {
  "use server";
  await signIn("discord", { redirectTo: "/" });
}

export default async function Home() {
  const session = await auth();
  const inviteUrl = process.env.DISCORD_INVITE_URL;

  if (!session?.user) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Card>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Text type="secondary">Service sur invitation</Text>
            <Title level={2} style={{ margin: 0 }}>
              Un accès fondé sur la confiance.
            </Title>
            <Paragraph style={{ fontSize: 16, marginBottom: 0 }}>
              Ce portail est réservé aux membres d&apos;un serveur Discord privé. Connecte-toi pour vérifier ton accès.
            </Paragraph>
            <form action={continueWithDiscord}>
              <Button type="primary" htmlType="submit" icon={DISCORD_ICON}>
                Continuer avec Discord
              </Button>
            </form>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Les détails du service, le parrainage et la récupération de clé ne sont visibles qu&apos;une fois l&apos;appartenance au serveur vérifiée.
            </Text>
          </Space>
        </Card>
      </div>
    );
  }

  const admin = isAdmin(session.user.discordId);
  const isMember = admin || (await isDiscordMember(session.user.discordId));

  if (!isMember) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Card>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Tag>Connecté : {session.user.username}</Tag>
            <Title level={3} style={{ margin: 0 }}>
              Accès réservé aux membres du serveur
            </Title>
            <Paragraph style={{ marginBottom: 0 }}>
              Ton compte Discord est bien connecté, mais tu n&apos;apparais pas dans la liste des membres du serveur privé. Le parrainage et les détails du service restent masqués tant que l&apos;appartenance n&apos;est pas confirmée.
            </Paragraph>
            <Space wrap>
              {inviteUrl ? (
                <a href={inviteUrl} target="_blank" rel="noreferrer">
                  <Button type="primary">Rejoindre le serveur Discord</Button>
                </a>
              ) : null}
              <form action={continueWithDiscord}>
                <Button htmlType="submit">Revérifier</Button>
              </form>
            </Space>
            <Alert
              type="info"
              showIcon
              message="Déjà sur le serveur ? La vérification peut prendre une minute après ton arrivée. Reclique sur « Revérifier »."
            />
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ display: "flex" }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Text type="secondary">Service sur invitation</Text>
          <Title level={2} style={{ margin: 0 }}>
            Bienvenue, {session.user.username}.
          </Title>
          <Paragraph style={{ fontSize: 16, marginBottom: 0 }}>
            Le portail réserve l&apos;accès au stockage R2 privé de StreamFusion Reborn aux membres du serveur et aux personnes parrainées par l&apos;équipe.
          </Paragraph>
          <Space wrap>
            <Tag color="blue">Serveur Discord vérifié</Tag>
            <Tag color="purple">Clé StreamFusion Reborn</Tag>
          </Space>
          <Space wrap>
            <Link href="/parrainer">
              <Button type="primary">Parrainer une personne</Button>
            </Link>
            <Link href="/mon-acces">
              <Button>Récupérer mon accès</Button>
            </Link>
          </Space>
        </Space>
      </Card>

      <Card title="Les étapes">
        <Steps
          items={[
            { title: "Parrainage", description: "Un membre autorisé te recommande en expliquant le contexte à l'équipe." },
            { title: "Validation équipe", description: "Un administrateur examine la demande et prépare ta clé d'accès." },
            { title: "Clé R2", description: "Tu récupères une clé unique à renseigner dans la configuration de StreamFusion Reborn." },
          ]}
        />
      </Card>
    </Space>
  );
}
